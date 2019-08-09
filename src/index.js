const Discord = require('discord.js');
const repl = require('repl');

const PluginWatcher = require('./plugin-watcher');
const logger = require('./logger');
const parseCommands = require('./command-parser');

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

    const plugins = pw.getCommands(cmd.commandName);
    if (plugins.length === 1) {
      try {
        currentOutput = await plugins[0].func(currentOutput, message);
      } catch (e) {
        logger.error(`error running command ${cmd.commandName}\n${e.stack}`);
        throw new Error(`command ${cmd.commandName} failed`);
      }
    } else if (plugins.length > 1) {
      const names = plugins.map(plug => plug.name);
      return `did you mean ${names.slice(0, -1).join(', ')} or ${names[names.length-1]}?`;
    } else {
      return `unknown command ${cmd.commandName}`;
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
    pw = new PluginWatcher(client);
    pw.watchFiles();
    pw.startIntervals();
    replServer.displayPrompt();
  });

  replServer.defineCommand('guilds', function () {
    const guilds = client.guilds.map(guild => guild.name);
    console.log(guilds);
    replServer.displayPrompt();
  });

  replServer.defineCommand('send', function (args) {
    const sp = args.split(' ');
    const id = sp[0];
    const msg = sp.slice(1).join(' ');
    client.channels.get(id).send(msg);
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
