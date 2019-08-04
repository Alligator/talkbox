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
    this.modules = {};
    this.plugins = {};
    this.intervals = {};

    // Initial load
    const files = fs.readdirSync('plugins');
    files.map((file) => {
      this.loadModule(file);
    });
  }

  loadModule(fileName) {
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
      this.modules[fileName] = Object.assign({}, sandbox);
      this.registerPluginsFromModule(fileName, this.modules[fileName]);
    } catch (e) {
      logger.info(`failed! ${e}`);
      throw e;
    }
  }

  // grab the commands object from a module and register all of the commands
  // found in it
  registerPluginsFromModule(fileName, module) {
    // remove any plugins that were previously registered against this filename
    Object.keys(this.plugins).forEach((pluginName) => {
      if (this.plugins[pluginName].fileName === fileName) {
        delete this.plugins[pluginName];
        logger.info(`  unloaded command ${pluginName}`);
      }
    });

    const commands = module.commands;
    if (!commands) {
      return;
    }

    Object.keys(commands).map((modKey) => {
      logger.info(`  loaded command ${modKey}`);
      this.plugins[modKey] = {
        name: modKey,
        func: module.commands[modKey],
        fileName,
      };
    });
  }

  // debounced version of loadModule. some text editors (such as vim) perform
  // multiple filesystem operations when saving a file, this stops the plugin
  // loading multiple times when that happens.
  debouceLoadModule(fileName) {
    if (this.intervals[fileName]) {
      clearInterval(this.intervals[fileName]);
    }

    this.intervals[fileName] = setTimeout(() => {
      this.loadModule(fileName);
    }, 500);
  }

  watchFiles() {
    fs.watch('plugins', (eventType, fileName) => {
      if (eventType === 'change') {
        this.debouceLoadModule(fileName);
      }
    });
  }

  startIntervals(client) {
    Object.keys(this.modules).forEach((key) => {
      const module = this.modules[key];
      Object.keys(module).forEach((moduleKey) => {
        const fn = module[moduleKey];
        if (fn._interval) {
          logger.info(`starting interval ${moduleKey}`);
          fn(client);
          fn._intervalId = setInterval(() => {
            logger.info(`running ${moduleKey} at interval`);
            fn(client);
          }, fn._interval);
        }
      });
    });
  }

  stopIntervals() {
    Object.keys(this.plugins).forEach((key) => {
      const fn = this.plugins[key].func;
      if (fn._intervalId) {
        clearInterval(fn._intervalId);
      }
    });
  }

  getPlugins(name) {
    return Object.keys(this.plugins)
      .filter(pluginName => pluginName.startsWith(name))
      .map(pluginName => this.plugins[pluginName]);
  }
}

module.exports = PluginWatcher;
