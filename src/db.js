const fs = require('fs');

const PATH = 'persist.json';
let store = {};

try {
  store = JSON.parse(fs.readFileSync(PATH));
} catch (e) {
  console.error(e);
}

function persistStore() {
  fs.writeFileSync(PATH, JSON.stringify(store, null, 2));
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

function remove(key) {
  delete store[key];
  persistStore();
}

function wrapForPlugin(name) {
  function wrap(fn) {
    return (key, ...args) => fn(`${name}_${key}`, ...args);
  }
  return {
    write: wrap(write),
    read: wrap(read),
    has: wrap(has),
    remove: wrap(remove),
  };
}

module.exports = {
  write,
  read,
  has,
  wrapForPlugin,
};
