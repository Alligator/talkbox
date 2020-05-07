const sqlite = require('better-sqlite3');

class SqlDatabase {
  constructor(file) {
    this.db = sqlite(file);
  }

  exec(sqlCmd, ...args) {
    return this.db.prepare(sqlCmd).run(...args);
  }

  query(sqlCmd, ...args) {
    return this.db.prepare(sqlCmd).all(...args);
  }
}

const sql = new SqlDatabase('plugins.db');
module.exports = sql;
