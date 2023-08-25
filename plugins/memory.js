const config = require('../config.json');

async function memory(text, message) {
  const memUsage = process.memoryUsage();
  const msg = Object.keys(memUsage)
    .map(key => `${key}: ${(memUsage[key] / 1024 / 1024).toFixed(2)}`)
    .join('\n');

  if (message.raw instanceof Discord.CommandInteraction) {
    await message.raw.reply({
      content: 'memory usage:\n```' + new Date().toISOString() + '\n' + msg + '```',
      ephemeral: true,
    });
  } else {
    return 'memory usage:\n```' + new Date().toISOString() + '\n' + msg + '```';
  }
}
memory._help = 'show memory usage';

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
garbage._help = 'manually run the gc';

commands = { memory, gc: garbage };
