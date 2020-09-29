const red = txt => `\x1b[91m${txt}\x1b[0m`;
const sqlite = require('better-sqlite3');

function ensure(db) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS logs(
      messageId   INTEGER PRIMARY KEY NOT NULL
    , guildId     INTEGER
    , guildName   TEXT
    , authorId    INTEGER
    , authorName  TEXT
    , channelId   INTEGER
    , channelName TEXT
    , timestamp   TEXT DEFAULT (datetime('now', 'utc'))
    , content     TEXT
    )
  `).run();
}

const db = sqlite('logs.db');
ensure(db);

function log(message) {
  const timeStamp = new Date().toISOString();

  console.log(`${timeStamp} ${message}`);
}

function logMessage(message) {
  if (message.guild) {
    log(`${message.guild.name}[${message.channel.name}] <${message.author.username}> ${message.cleanContent}`);
    db.prepare(`
      INSERT INTO logs
        (messageId, guildId, guildName, authorId, authorName, channelid, channelName, content)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(message.id, message.guild.id, message.guild.name, message.author.id, message.author.username, message.channel.id, message.channel.name, message.cleanContent);
  } else {
    log(`<${message.author.username}> ${message.cleanContent}`);
    db.prepare(`
      INSERT INTO logs
        (messageId, authorId, authorName, content)
      VALUES (?, ?, ?, ?)
    `).run(message.id, message.author.id, message.author.username, message.cleanContent);
  }
}

function updateMessage(message) {
  if (message.guild) {
    log(`${message.guild.name}[${message.channel.name}] <${message.author.username}> ${message.cleanContent} (edit)`);
  } else {
    log(`<${message.author.username}> ${message.cleanContent}`);
  }
  db.prepare(`
    UPDATE logs
    SET content = ?
    WHERE messageId = ?
  `).run(message.cleanContent, message.id);
}

function deleteMessage(message) {
  db.prepare(`
    DELETE FROM logs
    WHERE messageId = ?
  `).run(message.id);
}

function info(message) {
  log(message);
}

function error(message) {
  log(red(message));
}

module.exports = {
  log,
  info,
  error,
  logMessage,
  updateMessage,
  deleteMessage,
};
