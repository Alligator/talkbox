const Discord = require('discord.js');
const repl = require('repl');

const PluginWatcher = require('./plugin-watcher');
const logger = require('./logger');
const parseCommands = require('./command-parser');
const db = require('./db');

const config = require('../config.json');

const client = new Discord.Client();
let pw = new PluginWatcher(client);

// run a list of commands, passing the input from each command to the next
// commands should be the output from parseCommands
// message is the discord.js message object the commands came from
async function runCommands(commands, message) {
  let currentOutput = null;
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];

    if (currentOutput === null) {
      // if there's no current output, use the args given to the commands
      currentOutput = cmd.args.join(' ');
    }

    if (typeof currentOutput === 'undefined') {
      // we got undefined somewhere, kill the pipe we're in a weird state
      break;
    }

    // if the command is "help", use the first arg as the command name and
    // instead of running it dislay the help
    const showHelp = cmd.commandName === 'help';
    const commandName = showHelp ? cmd.args[0] : cmd.commandName;
    const plugins = pw.getCommands(commandName);

    if (showHelp && plugins.length === 1) {
      // one command matched in a help command, show the help message
      currentOutput = plugins[0].help || `no help for command ${plugins[0].name}`;
    } else if (!showHelp && plugins.length === 1) {
      // one command matched, run it
      try {
        currentOutput = await plugins[0].func(currentOutput, message);
        db.persistStore();
      } catch (e) {
        logger.error(`error running command ${cmd.commandName}\n${e.stack}`);
        throw new Error(`command ${cmd.commandName} failed`);
      }
    } else if (plugins.length > 1) {
      // multiple commands matched, bail and print all the matched names
      const names = plugins.map(plug => plug.name);
      return `did you mean ${names.slice(0, -1).join(', ')} or ${names[names.length-1]}?`;
    } else {
      // no commands matched, do nothing and bail
      return;
    }
  }
  return currentOutput;
}

client.on('ready', () => {
  logger.info('login successful');
  pw.startIntervals(client);
  const replServer = repl.start('talkbox> ');
  replServer.context.client = client;

  // add repl commands
  replServer.defineCommand('run', {
    help: 'run command - run command as though it was a message sent to the bot',
    action: async function (cmd) {
      const commands = parseCommands(cmd);
      try {
        const result = await runCommands(commands);
        console.log(result);
      } catch (e) {
        console.log(e);
      }
      replServer.displayPrompt();
    },
  });

  replServer.defineCommand('plugins', {
    help: 'plugins reload|stop|start - reload all plugins/stop watching plugin directory/start watching plugin directory',
    action: function (args) {
      switch (args) {
        case 'reload': {
          pw.stopIntervals();
          pw = new PluginWatcher(client);
          pw.watchFiles();
          pw.startIntervals();
          break;
        }
        case 'stop': {
          pw.stopWatchingFiles();
          break;
        }
        case 'start': {
          pw.watchFiles();
          break;
        }
      }

      replServer.displayPrompt();
    },
  });

  replServer.defineCommand('guilds', {
    help: 'guilds - list the guilds the bot is in',
    action: function () {
      const message = client.guilds
        .map(guild => `${guild.id} - ${guild.name}`)
        .join('\n');
      console.log(message);
      replServer.displayPrompt();
    },
  });

  replServer.defineCommand('channels', {
    help: 'channels - list the channels the bot is in',
    action: function () {
      const message = client.guilds
        .map((guild) => {
          const channels = guild.channels
            .map(c => `  ${c.id} - ${c.name}`)
            .join('\n');
          return `${guild.id} - ${guild.name}\n${channels}`;
        })
        .join('\n');
      console.log(message);
      replServer.displayPrompt();
    },
  });

  replServer.defineCommand('send', {
    help: 'send id message - send message to the channel or user with id',
    action: function (args) {
      const sp = args.split(' ');
      const id = sp[0];
      const msg = sp.slice(1).join(' ');
      const recipient = client.channels.get(id) || client.users.get(id);
      if (recipient) {
        recipient.send(msg);
      }
    },
  });

  replServer.defineCommand('send_channel', {
    help: 'send name message - send message to the channel with the given name',
    action: function (args) {
      const sp = args.split(' ');
      const name = sp[0];
      const msg = sp.slice(1).join(' ');
      const recipients = client.channels.filter(c => c.name === name);
      if (recipients.size === 1) {
        recipients.first().send(msg);
      } else if (recipients.size > 1) {
        console.log('multiple channels matched');
        const channels = recipients
          .map(c => `  ${c.id} - [${c.guild.name}]${c.name}`)
          .join('\n');
        console.log(channels);
      } else {
        console.log('no channel found');
      }
    },
  });
});

client.on('disconnect', () => {
  logger.info('disconnected');
  pw.stopIntervals();
});

client.on('message', async (message) => {
  if (message.guild) {
    logger.log(`${message.guild.name}[${message.channel.name}] <${message.author.username}> ${message.cleanContent}`);
  } else {
    logger.log(`<${message.author.username}> ${message.cleanContent}`);
  }

  if (message.author.bot) {
    return;
  }

  let messageText;
  if (message.content.startsWith(config.leader)) {
    // message starts with the leader
    messageText = message.content.slice(1);
  } else if (message.isMentioned(client.user)) {
    // message mentions the bot, remove the mention
    messageText = message.content
      .replace(/<@\d+>/, '')
      .trim();
  } else {
    // try regex matches
    const matches = pw.getRegexMatches(message.content);
    if (matches.length > 0) {
      matches.forEach(async (match) => {
        try {
          const result = await match.func(match.regex.exec(message.content), message);
          if (result) {
            message.channel.send(result);
          }
          db.persistStore();
        } catch (e) {
          logger.error(e.stack);
        }
      });
    } 
    return;
  }

  message.channel.startTyping();

  const commands = parseCommands(messageText);
  try {
    const result = await runCommands(commands, message);
    if (result) {
      message.channel.send(result);
    }
  } catch (e) {
    logger.error(e.stack);
  }

  message.channel.stopTyping();
});

client.on('reconnecting', () => logger.info('attempting to reconnect to discord'));
client.on('resume', () => logger.info('reconnected'));
client.on('disconnect', () => logger.error('disconnected from discord'));
client.on('error', e => logger.error(e.message));

pw.watchFiles();

logger.info('logging in to discord');
client.login(config.token);
