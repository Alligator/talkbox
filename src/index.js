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

client.on('message', (rawMessage) => {
  if (rawMessage.guild) {
    logger.info(`${rawMessage.guild.name}[${rawMessage.channel.name}] <${rawMessage.author.username}> ${rawMessage.cleanContent}`);
  } else {
    logger.info(`<${rawMessage.author.username}> ${rawMessage.cleanContent}`);
  }

  if (rawMessage.author.bot) {
    return;
  }

  if (!rawMessage.content.startsWith(config.leader)) {
    return;
  }

  const messageWithoutLeader = rawMessage.content.slice(1);
  const commands = parseCommands(messageWithoutLeader);

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
        currentOutput = plugin(currentOutput, rawMessage);
      } catch (e) {
        rawMessage.channel.send(`command ${cmd.commandName} failed`);
        logger.log(`error running command ${cmd.commandName} ${e}`);
        logger.log(e.stack);
        return;
      }
    } else {
      rawMessage.channel.send(`unknown command ${cmd.commandName}`);
      return;
    }
  }

  if (currentOutput) {
    rawMessage.channel.send(currentOutput);
  }

});

pw.watchFiles();

logger.info('logging in to discord');
client.login(config.token);
