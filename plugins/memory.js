function memory() {
  const memUsage = process.memoryUsage();
  const msg = Object.keys(memUsage)
    .map(key => `${key}: ${(memUsage[key] / 1024 / 1024).toFixed(2)}`)
    .join('\n');
  return 'memory usage:\n```' + new Date().toISOString() + '\n' + msg + '```';
}

commands = { memory };