const fs = require('fs');

const PATH = 'persist.json';
let store = {};

try {
  store = JSON.parse(fs.readFileSync(PATH));
} catch (e) {
  console.error(e);
}

function persistStore() {
  fs.writeFileSync(PATH, JSON.stringify(store));
}

function write(key, value) {
  store[key] = value;
  persistStore();
}

function read(key) {
  return store[key];
}

function has(key) {
  return store.hasOwnProperty(key);
}

function wrapForPlugin(name) {
  return {
    write: (key, value) => write(`${name}_${key}`, value),
    read: (key) => read(`${name}_${key}`),
    has: (key) => has(`${name}_${key}`),
  };
}

module.exports = {
  write,
  read,
  has,
  wrapForPlugin,
};
