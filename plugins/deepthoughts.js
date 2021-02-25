const fs = require('fs');

function deepthoughts() {
  const file = fs.readFileSync('plugins/deepthoughts.txt').toString();
  const lines = file.split('\n');
  return lines[Math.floor(Math.random() * lines.length)];
}
deepthoughts._help = 'and now, deep thoughts, by jack handey';

commands = { deepthoughts };
