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

module.exports = {
  write,
  read,
};