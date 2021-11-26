const { Client, Intents, MessageEmbed, MessageAttachment, CommandInteraction } = require('discord.js');
const repl = require('repl');
const axios = require('axios');

const PluginWatcher = require('./plugin-watcher');
const logger = require('./logger');
const parseCommands = require('./command-parser');
const db = require('./db');

const config = require('../config.json');
const SlashCommandManager = require('./slash-command-manager');

const intents = new Intents([
  Intents.FLAGS.GUILDS,
  Intents.FLAGS.GUILD_MESSAGES,
  Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  Intents.FLAGS.DIRECT_MESSAGES,
]);
const client = new Client({ intents });

let scm = new SlashCommandManager(client, '109063664560009216');
let pw = new PluginWatcher(client, scm);

async function fetchFirstAttachment(message) {
  if (!message.attachments) {
    return null;
  }

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
  const layer = {
    data: await fetchFirstAttachment(message),
    fn: null,
  };

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];

    // if the command is "help", use the first arg as the command name and
    // instead of running it display the help
    const showHelp = cmd.commandName === 'help';
    const commandName = showHelp ? cmd.args[0] : cmd.commandName;
    const plugins = pw.getCommands(commandName);

    if (showHelp) {
      if (plugins.length === 1) {
        // one command matched in a help command, show the help message
        const embed = new MessageEmbed();
        embed.addField(plugins[0].name, plugins[0].help || 'no help available');
        message.channel.send({ embeds: [embed] });
        return;
      }

      if (!commandName) {
        const embed = new MessageEmbed();
        const commandNames = Object.keys(pw.commands)
          .sort((a, b) => a.localeCompare(b))
        let embeds = ['', '', ''];
        for (let i = 0; i < commandNames.length; i++) {
          const embedIndex = Math.floor((i/commandNames.length) * 3);
          embeds[embedIndex] += `\n${commandNames[i]}`;
        }

        embeds.forEach(e => embed.addField('\u200B', e, true));
        embed.setTitle('available commands');
        message.channel.send({ embeds: [embed] });
        return;
      }

      return `unknown command ${cmd.commandName}`;
    } else if (!showHelp && plugins.length === 1) {
      logger.info(`running command ${cmd.commandName}`);

      // one command matched, run it
      try {
        const textInput = (cmd.args && cmd.args.length > 0) ? cmd.args.join(' ') : currentOutput;

        const cmdPromise = plugins[0].func(
          textInput,
          { // message wrapper
            id: message.id,
            client: message.client,
            author: message.author || message.user,
            channel: message.channel,
            isInteraction: message instanceof CommandInteraction,
            reply: message instanceof CommandInteraction ? message.editReply : message.reply,
            edit: message instanceof CommandInteraction ? message.editReply : message.edit,
            raw: message,
          },
          {
            text: currentOutput,
            data: layer.data,
            rawArgs: cmd.rawArgs,
            last: i === (commands.length - 1),
          },
        );
        if (cmdPromise.catch) {
          cmdPromise.catch((e) => {
            logger.error(`error running command ${cmd.commandName}\n${e.stack}`);
            throw new Error(`command ${cmd.commandName} failed`);
          });
        }
        const result = await cmdPromise;

        if (typeof result === 'string') {
          // text output
          currentOutput = result;
        } else if (result) {
          // data output, check if the type is 'compose'
          if (result.type === 'compose') {
            // if it is, add a new layer with this composition function
            layer.fn = result.fn;
          } else {
            if (layer.fn) {
              // compose
              layer.data = await layer.fn(layer.data, result);
              layer.fn = null;
            } else {
              // replace
              layer.data = result;
            }
          }
        }

        db.persistStore();
      } catch (e) {
        logger.error(`error running command ${cmd.commandName}\n${e.stack}`);

        if (e.userError) {
          return { text: e.message };
        }

        return;
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

  return {
    text: currentOutput,
    data: layer.data,
  };
}

async function registerSlashCommand() {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) {
      return;
    }
    const commandName = interaction.commandName;
    logger.info(`${interaction.id} ${interaction.guild.name}[${interaction.channel.name}] <${interaction.user.username}> /${commandName}`);

    await interaction.deferReply();

    let result;
    if (commandName !== 'homero') {
      const func = scm.get(commandName);
      result = await func(interaction);
    } else {
      const commands = parseCommands(interaction.options.getString('command'));
      const promise = runCommands(commands, interaction);
      promise.catch((e) => {
        logger.error(e.stack);
      });
      result = await promise;
    }


    try {
      if (result && result.data && result.data.ext) {
        const attachment = new MessageAttachment(result.data.data, `${interaction.id}.${result.data.ext}`);
        interaction.editReply({ files: [attachment] });
      } else if (result && result.text) {
        interaction.editReply(result.text);
      } else if (result && typeof result === 'string') {
        interaction.editReply(result);
      } else {
        // no response, assume the command handled replying itself
        interaction.deleteReply();
      }
    } catch (e) {
      logger.error(e.stack);
      throw e;
    }
  });

}

client.on('ready', () => {
  logger.info('login successful');
  registerSlashCommand();

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

client.on('messageCreate', async (message) => {
  logger.logMessage(message);

  if (message.author.bot) {
    return;
  }

  let messageText;
  if (message.content.startsWith(config.leader)) {
    // message starts with the leader
    messageText = message.content.slice(1);
  } else if (message.mentions.has(client.user)) {
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

  message.channel.sendTyping();

  const commands = parseCommands(messageText);
  try {
    const promise = runCommands(commands, message);
    promise.catch((e) => {
      logger.error(e.stack);
    });
    const result = await promise;
    if (result && result.data && result.data.ext) {
      const attachment = new MessageAttachment(result.data.data, `${message.id}.${result.data.ext}`);
      message.channel.send({ files: [attachment] });
    } else if (result && result.text) {
      message.channel.send(result.text);
    } else if (result && typeof result === 'string') {
      message.channel.send(result);
    }
  } catch (e) {
    logger.error(e.stack);
  }
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

// stop unhandled promise rejection killing the bot
process.on('unhandledRejection', function(reason, p){
  console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
  // application specific logging here
});
