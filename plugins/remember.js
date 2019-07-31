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

commands = { remember };
