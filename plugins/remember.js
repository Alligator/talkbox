function remember(text, message) {
  const name = message.author.username;

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
  const name = message.author.username;
  if (name in db) {
    delete db[name]
    return 'forgotten!';
  }
  return 'nothing to forget';
}
forget._help = 'forget - forget remembered text';

commands = { remember, forget };
