const Discord = require('discord.js');
const repl = require('repl');
const axios = require('axios');

const PluginWatcher = require('./plugin-watcher');
const logger = require('./logger');
const parseCommands = require('./command-parser');
const db = require('./db');

const config = require('../config.json');

const client = new Discord.Client();
let pw = new PluginWatcher(client);

async function fetchFirstAttachment(message) {
  const attachments = message.attachments.filter(a => a.url);
  if (attachments.size === 0) {
    return null;
  }

  const attachment = attachments.first();
  const resp = await axios.get(attachment.url, { responseType: 'arraybuffer' });

  return {
    data: resp.data,
    ext: attachment.filename.split('.').slice(-1),
  };
}

// LAYERS
//
// To support things like image composition, talkbox commands can return more
// than just plain text. If a plugin returns a data structure like this:
//
//   {
//     data: myBuffer,
//     ext: 'png',
//   }
// 
// then the content of the topmost layer is replaced with 'data'. The next
// plugin in the pipeline will receive that layer as input. This is provided in
// the third argument, example function signature:
//
//   function doStuff(text, message, { data }) {
//
// The 'data' variable will contain the data from the layer.
//
// To add a new layer, a composition command can be used. A composition command
// should return this data structure:
//
//   {
//     type: 'compose',
//     fn: (img1, img2) => {
//       const result = ...// combine img1 and img2 somehow
//       return {
//         data: result,
//         ext: 'png',
//       };
//     },
//   }
// 
// When talkbox sees this, it will add a new layer with an empty data slot,
// ready for the command to fill. Once all the commands are done, the
// composition function will be called with the two layers to combine.


// run a list of commands, passing the input from each command to the next
// commands should be the output from parseCommands
// message is the discord.js message object the commands came from
async function runCommands(commands, message) {
  let currentOutput = null;
  const layers = [{
    data: await fetchFirstAttachment(message),
    fn: null,
  }];

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];

    // if the command is "help", use the first arg as the command name and
    // instead of running it dislay the help
    const showHelp = cmd.commandName === 'help';
    const commandName = showHelp ? cmd.args[0] : cmd.commandName;
    const plugins = pw.getCommands(commandName);

    if (showHelp && plugins.length === 1) {
      // one command matched in a help command, show the help message
      return plugins[0].help || `no help for command ${plugins[0].name}`;
    } else if (!showHelp && plugins.length === 1) {
      logger.info(`running command ${cmd.commandName}`);

      // one command matched, run it
      try {
        const textInput = (cmd.args && cmd.args.length > 0) ? cmd.args.join(' ') : currentOutput;
        const result = await plugins[0].func(
          textInput,
          message,
          {
            text: currentOutput,
            data: layers[layers.length - 1].data,
            rawArgs: cmd.rawArgs,
          },
        );

        if (typeof result === 'string') {
          // text output
          currentOutput = result;
        } else {
          // data output, check if the type is 'compose'
          if (result.type === 'compose') {
            // if it is, add a new layer with this composition function
            layers.push({ data: null, fn: result.fn });
          } else {
            // otherwise replace the topmost layer
            layers[layers.length - 1].data = result;
          }
        }

        db.persistStore();
      } catch (e) {
        logger.error(`error running command ${cmd.commandName}\n${e.stack}`);

        if (e.userError) {
          return { text: e.message };
        }

        throw new Error(`command ${cmd.commandName} failed`);
      }

    } else if (plugins.length > 1) {
      // multiple commands matched, bail and print all the matched names
      const names = plugins.map(plug => plug.name);
      return `did you mean ${names.slice(0, -1).join(', ')} or ${names[names.length-1]}?`;
    } else {
      // no commands matched, do nothing and bail
      logger.info(`no command found for ${cmd.commandName}`);
      return `unknown command ${cmd.commandName}`;
    }
  }

  // run all the compositions
  let currentLayer = null;

  // for (let i = layers.length - 1; i >= 0; i--) {
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const nextLayer = layers[i + 1];

    if (nextLayer && nextLayer.fn) {
      // compose this and the next layer using the next layer's fn
      layers[i + 1].data = await nextLayer.fn(layer.data, nextLayer.data);
    } else {
      // no comp function, use this as the last layer
      currentlayer = layer;
    }
  }

  return {
    text: currentOutput,
    data: currentlayer.data,
  };
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
  logger.logMessage(message);

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
    if (result.data && result.data.ext) {
      const attachment = new Discord.Attachment(result.data.data, `${message.id}.${result.data.ext}`);
      message.channel.send(attachment);
    } else if (result.text) {
      message.channel.send(result.text);
    } else if (typeof result === 'string') {
      message.channel.send(result);
    }
  } catch (e) {
    logger.error(e.stack);
  }

  message.channel.stopTyping();
});

client.on('messageUpdate', (oldMessage, newMessage) => {
  logger.updateMessage(newMessage);
});

client.on('messageDelete', (message) => {
  logger.deleteMessage(message);
});

client.on('disconnect', (evt) => logger.error(`disconnected from discord: ${evt}`));
client.on('error', e => logger.error(e.message));

pw.watchFiles();

logger.info('logging in to discord');
client.login(config.token);
