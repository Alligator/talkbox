function remember(text, message) {
  const name = message.author.username;

  if (text === 'speighne') {
    return 'speighne? no i said braeighne';
  }

  if (text === 'braeighne') {
    return 'i wish i could forget mister braeighne...';
  }

  if (text && text.length > 0) {
    db[name] = text;
    return 'ok, remembered';
  }

  if (name in db) {
    return `i remember: ${db[name]}`;
  }

  return 'nothing for me to remember m8';
}
remember._help = 'remember [text] - if text is given, remember it, otherwise recall remembered text';

function forget(text, message) {
  if (text === 'mister braeighne') {
    return 'you can try and forget, but you can never erase the logs...';
  }

  const name = message.author.username;
  if (name in db) {
    delete db[name]
    return 'forgotten!';
  }
  return 'nothing to forget';
}
forget._help = 'forget - forget remembered text';


function ensureDb() {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS remember(
      name    TEXT
    , message TEXT
    )
  `);
}

function sql_remember(text, message) {
  ensureDb();
  const name = message.author.username;

  if (text && text.length > 0) {
    sql.exec('DELETE FROM remember WHERE name = ?', name);

    sql.exec(`
      INSERT INTO remember(name, message)
      VALUES (?, ?)
    `, name, text);

    return 'ok, remembered';
  }

  const memories = sql.query(`
    SELECT message
    FROM remember
    WHERE name = :name
  `, { name });

  if (memories.length > 0) {
    return `i remember ${memories[0].message}`;
  }

  return 'nothing for me to remember';
}

function sql_forget(text, message) {
  ensureDb();
  const name = message.author.username;

  const deleted = sql.exec('DELETE FROM remember WHERE name = ?', name);
  log(JSON.stringify(deleted));

  if (deleted.changes > 0) {
    return 'forgotten';
  }

  return 'nothing to forget';
}


commands = { remember, forget };
