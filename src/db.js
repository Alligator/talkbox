const fs = require('fs');

const PATH = 'persist.json';
let store = {};

try {
  if (fs.existsSync(PATH)) {
    store = JSON.parse(fs.readFileSync(PATH));
  } else {
    store = {};
  }
} catch (e) {
  console.error(e);
}

function persistStore() {
  fs.writeFileSync(PATH, JSON.stringify(store, null, 2));
}

function createContext(name) {
  let base = store[name] || {};

  const ensureStore = () => {
    store[name] = base;
  };

  const db = new Proxy(base, {
    get(obj, key) {
      return obj[key];
    },
    set(obj, key, value) {
      ensureStore();
      obj[key] = value;
      persistStore();
    },
    deleteProperty(obj, key) {
      ensureStore();
      if (key in obj) {
        delete obj[key];
        persistStore();
      }
    },
  });
  return db;
}

module.exports = { createContext };
