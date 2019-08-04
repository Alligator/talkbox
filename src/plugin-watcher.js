const fs = require('fs');
const vm = require('vm');
const path = require('path');
const db = require('./db');
const logger = require('./logger');

function pluginLog(fileName) {
  return function(msg) {
    logger.info(fileName + ': ' + msg);
  }
}

class PluginWatcher {
  constructor() {
    // a plugin is the environment (all of the globals) we get after executing a
    // .js file in the plugins directory.
    this.plugins = {};

    // a command is a function from a plugin that was put in the global commands
    // object.
    this.commands = {};

    // intervals are used internally to debounce file loading
    this.intervals = {};

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
        db: db.wrapForPlugin(path.basename(fileName, '.js')),
        log: pluginLog(fileName),
        Math,
      };
      vm.runInNewContext(file.toString(), sandbox, { displayErrors: true });
      this.plugins[fileName] = Object.assign({}, sandbox);
      this.registerCommandsFromPlugin(fileName, this.plugins[fileName]);
    } catch (e) {
      logger.info(`failed! ${e}`);
      throw e;
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
        fileName,
      };
    });
  }

  // debounced version of loadPlugin. some text editors (such as vim) perform
  // multiple filesystem operations when saving a file, this stops the plugin
  // loading multiple times when that happens.
  debounceLoadPlugin(fileName) {
    if (this.intervals[fileName]) {
      clearInterval(this.intervals[fileName]);
    }

    this.intervals[fileName] = setTimeout(() => {
      this.loadPlugin(fileName);
    }, 500);
  }

  watchFiles() {
    fs.watch('plugins', (eventType, fileName) => {
      if (eventType === 'change') {
        this.debounceLoadPlugin(fileName);
      }
    });
  }

  startIntervals(client) {
    Object.keys(this.plugins).forEach((key) => {
      const plugin = this.plugins[key];
      Object.keys(plugin).forEach((pluginKey) => {
        const fn = plugin[pluginKey];
        if (fn._interval) {
          logger.info(`starting interval ${pluginKey}`);
          fn(client);
          fn._intervalId = setInterval(() => {
            logger.info(`running ${pluginKey} at interval`);
            fn(client);
          }, fn._interval);
        }
      });
    });
  }

  stopIntervals() {
    Object.keys(this.plugins).forEach((key) => {
      const plugin = this.plugins[key];
      Object.keys(plugin).forEach((pluginKey) => {
        const fn = plugin[pluginKey];
        if (fn._intervalId) {
          clearInterval(fn._intervalId);
        }
      });
    });
  }

  getCommands(name) {
    return Object.keys(this.commands)
      .filter(commandName => commandName.startsWith(name))
      .map(commandName => this.commands[commandName]);
  }
}

module.exports = PluginWatcher;
