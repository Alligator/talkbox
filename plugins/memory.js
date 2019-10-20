const config = require('../config.json');

function memory() {
  const memUsage = process.memoryUsage();
  const msg = Object.keys(memUsage)
    .map(key => `${key}: ${(memUsage[key] / 1024 / 1024).toFixed(2)}`)
    .join('\n');
  return 'memory usage:\n```' + new Date().toISOString() + '\n' + msg + '```';
}

function garbage(text, message) {
  if (message.author.id !== config.owner_id) {
    return;
  }
  if (gc) {
    gc();
    return 'ran garbage collector';
  } else {
    return 'garbage collector not exposed';
  }
}

commands = { memory, gc: garbage };
