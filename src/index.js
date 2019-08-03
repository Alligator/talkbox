const Discord = require('discord.js');
const repl = require('repl');

const PluginWatcher = require('./plugin-watcher');
const db = require('./db');
const logger = require('./logger');
const parseCommands = require('./command-parser');

const config = require('../config.json');

let pw = new PluginWatcher();
const client = new Discord.Client();

async function runCommands(commands, message) {
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
        logger.log(`error running command ${cmd.commandName} ${e}`);
        logger.log(e.stack);
        throw new Error(`command ${cmd.commandName} failed`);
      }
    } else {
      throw new Error(`unknown command ${cmd.commandName}`);
    }
  }
  return currentOutput;
}

client.on('ready', () => {
  logger.info('login successful');
  pw.startIntervals(client);
  const replServer = repl.start('talkbox> ');
  replServer.context.client = client;
  replServer.defineCommand('plugin', async function (cmd) {
    const commands = parseCommands(cmd);
    try {
      const result = await runCommands(commands);
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    replServer.displayPrompt();
  });

  replServer.defineCommand('reloadPlugins', function () {
    pw.stopIntervals();
    pw = new PluginWatcher();
    pw.watchFiles();
    pw.startIntervals();
    replServer.displayPrompt();
  });

  replServer.defineCommand('guilds', function () {
    const guilds = client.guilds.map(guild => guild.name);
    console.log(guilds);
    replServer.displayPrompt();
  });
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
  try {
    const result = await runCommands(commands, message);
    if (result) {
      message.channel.send(result);
    }
  } catch (e) {
    message.channel.send(e.msg);
    return;
  }

});

pw.watchFiles();

logger.info('logging in to discord');
client.login(config.token);
