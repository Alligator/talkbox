function remember(text, message) {
  const name = message.author.username;

  if (text && text.length > 0) {
    db.write(name, text);
    return 'ok, remembered';
  }

  if (db.has(name)) {
    return `i remember: ${db.read(name)}`;
  }

  return 'nothing for me to remember m8';
}

function forget(text, message) {
  const name = message.author.username;
  if (db.has(name)) {
    db.remove(name);
    return 'forgotten!';
  }
  return 'nothing to forget';
}

commands = { remember, forget };
