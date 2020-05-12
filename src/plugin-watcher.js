const fs = require('fs');
const vm = require('vm');
const path = require('path');
const Discord = require('discord.js');
const db = require('./db');
const logger = require('./logger');
const sql = require('./sql');

function pluginLog(fileName) {
  return function(msg) {
    logger.info(fileName + ': ' + msg);
  }
}

class PluginWatcher {
  constructor(client) {
    this.client = client;

    // a plugin is the environment (all of the globals) we get after executing a
    // .js file in the plugins directory.
    this.plugins = {};

    // a command is a function from a plugin that was put in the global commands
    // object.
    this.commands = {};

    // interval commands
    this.intervals = [];
    this.intervalsRunning = false;

    // regex matches
    this.regexes = [];

    // intervals are used internally to debounce file loading
    this.loadPluginIntervals = {};

    // initial load
    const files = fs.readdirSync('plugins');
    files.map((file) => {
      this.loadPlugin(file);
    });
  }

  loadPlugin(fileName) {
    if (!fileName.endsWith('.js')) {
      return;
    }

    logger.info(`loading ${fileName}`);

    try {
      const file = fs.readFileSync(`plugins/${fileName}`);
      const sandbox = {
        setTimeout,
        setInterval,
        clearInterval,
        require,
        db: db.createContext(path.basename(fileName, '.js')),
        log: pluginLog(fileName),
        Math,
        process,
        RichEmbed: Discord.RichEmbed,
        Attachment: Discord.Attachment,
        Buffer,
        gc,
        sql,
      };
      vm.runInNewContext(file.toString(), sandbox, { displayErrors: true, filename: fileName });
      this.plugins[fileName] = Object.assign({}, sandbox);
      this.registerCommandsFromPlugin(fileName, this.plugins[fileName]);
      this.registerIntervalsFromPlugin(fileName, this.plugins[fileName]);
      this.registerRegexesFromPlugin(fileName, this.plugins[fileName]);
    } catch (e) {
      logger.error(`failed! ${e} ${e.stack}`);
    }
  }

  // grab the commands object from a plugin and register all of the commands
  // found in it
  registerCommandsFromPlugin(fileName, plugin) {
    // remove any commands that were previously registered against this filename
    Object.keys(this.commands).forEach((commandName) => {
      if (this.commands[commandName].fileName === fileName) {
        delete this.commands[commandName];
        logger.info(`  unloaded command ${commandName}`);
      }
    });

    const commands = plugin.commands;
    if (!commands) {
      return;
    }

    Object.keys(commands).map((commandName) => {
      logger.info(`  loaded command ${commandName}`);
      this.commands[commandName] = {
        name: commandName,
        func: plugin.commands[commandName],
        help: plugin.commands[commandName]._help,
        fileName,
      };
    });
  }

  registerRegexesFromPlugin(fileName, plugin) {
    // remove any regexes for this file
    this.regexes = this.regexes.filter(regex => regex.fileName !== fileName);

    Object.keys(plugin).forEach((pluginKey) => {
      const func = plugin[pluginKey];
      if (func._regex) {
        this.regexes.push({
          id: null,
          name: pluginKey,
          func: func,
          regex: func._regex,
          fileName,
        });
        logger.info(`  loaded regex ${pluginKey}`);
      }
    });
  }

  // debounced version of loadPlugin. some text editors (such as vim) perform
  // multiple filesystem operations when saving a file, this stops the plugin
  // loading multiple times when that happens.
  debounceLoadPlugin(fileName) {
    if (this.loadPluginIntervals[fileName]) {
      clearInterval(this.loadPluginIntervals[fileName]);
    }

    this.loadPluginIntervals[fileName] = setTimeout(() => {
      this.loadPlugin(fileName);
    }, 500);
  }

  watchFiles() {
    logger.info('watching plugins directory');
    this.watcher = fs.watch('plugins', (eventType, fileName) => {
      if (eventType === 'change') {
        this.debounceLoadPlugin(fileName);
      }
    });
  }

  stopWatchingFiles() {
    if (this.watcher) {
      this.watcher.close();
      logger.info('stopped watching plugins directory');
    }
  }

  registerIntervalsFromPlugin(fileName, plugin) {
    // stop any intervals for this file and remove them from the array
    this.intervals = this.intervals.filter((interval) => {
      if (interval.fileName === fileName) {
        this.stopInterval(interval);
        return false;
      }
      return true;
    });

    Object.keys(plugin).forEach((pluginKey) => {
      const func = plugin[pluginKey];
      if (func._interval) {
        this.intervals.push({
          id: null,
          name: pluginKey,
          func: func,
          fileName,
        });
        logger.info(`  loaded interval ${pluginKey}`);
        if (this.intervalsRunning) {
          this.startInterval(this.intervals[this.intervals.length - 1])
        }
      }
    });
  }

  startIntervals() {
    this.intervals.map(interval => this.startInterval(interval));
    this.intervalsRunning = true;
  }

  startInterval(interval) {
    if (interval.id) {
      clearInterval(interval.id);
    }

    try {
      interval.func(this.client);
      db.persistStore();
      logger.info(`started interval ${interval.name}`);
    } catch(e) {
      logger.error(`interval ${interval.name} failed\n${e.stack}`);
    }

    const id = setInterval(() => {
      logger.info(`running interval ${interval.name}`);
      try {
        interval.func(this.client);
        db.persistStore();
      } catch(e) {
        logger.error(`interval ${interval.name} failed\n${e.stack}`);
      }
    }, interval.func._interval);

    interval.id = id;
  }

  stopIntervals() {
    this.intervals.forEach(interval => this.stopInterval(interval));
    this.intervalsRunning = false;
  }

  stopInterval(interval) {
    if (interval.id) {
      clearInterval(interval.id);
      logger.info(`stopped interval ${interval.name}`);
    }
  }

  getCommands(name) {
    // check for an exact match
    const exactMatches = Object.keys(this.commands)
      .filter(commandName => commandName === name);

    if (exactMatches.length === 1) {
      return exactMatches
        .map(commandName => this.commands[commandName]);
    }

    return Object.keys(this.commands)
      .filter(commandName => commandName.startsWith(name))
      .map(commandName => this.commands[commandName]);
  }

  getRegexMatches(text) {
    return this.regexes.filter(r => r.regex.test(text));
  }
}

module.exports = PluginWatcher;
