const Discord = require('discord.js');
const repl = require('repl');

const PluginWatcher = require('./plugin-watcher');
const db = require('./db');
const logger = require('./logger');
const parseCommands = require('./command-parser');

const config = require('../config.json');

const pw = new PluginWatcher();
const client = new Discord.Client();

client.on('ready', () => {
  logger.info('login successful');
  pw.startIntervals(client);
  repl.start('tone> ').context.client = client;
});

client.on('disconnect', () => {
  logger.info('disconnected');
  pw.stopIntervals();
});

client.on('message', async (message) => {
  if (message.guild) {
    logger.info(`${message.guild.name}[${message.channel.name}] <${message.author.username}> ${message.cleanContent}`);
  } else {
    logger.info(`<${message.author.username}> ${message.cleanContent}`);
  }

  if (message.author.bot) {
    return;
  }

  let messageText;
  if (message.content.startsWith(config.leader)) {
    messageText = message.content.slice(1);
  } else if (message.isMentioned(client.user)) {
    messageText = message.content
      .replace(/<@\d+>/, '')
      .trim();
  } else {
    return;
  }

  const commands = parseCommands(messageText);

  let currentOutput = null;
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];

    if (currentOutput === null) {
      currentOutput = cmd.args.join(' ');
    }

    if (typeof currentOutput === 'undefined') {
      // we got undefined somewhere, kill the pipe we're
      // in a weird state
      break;
    }

    const plugin = pw.getPlugin(cmd.commandName);
    if (plugin) {
      try {
        currentOutput = await plugin(currentOutput, message);
      } catch (e) {
        message.channel.send(`command ${cmd.commandName} failed`);
        logger.log(`error running command ${cmd.commandName} ${e}`);
        logger.log(e.stack);
        return;
      }
    } else {
      message.channel.send(`unknown command ${cmd.commandName}`);
      return;
    }
  }

  if (currentOutput) {
    message.channel.send(currentOutput);
  }

});

pw.watchFiles();

logger.info('logging in to discord');
client.login(config.token);
