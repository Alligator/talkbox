const { addHours } = require('date-fns');

function beats(txt) {
  const d = addHours(new Date(), 1);
  const beats = (d.getUTCSeconds() + (d.getUTCMinutes() * 60) + (d.getUTCHours() * 3600)) / 86.4;
  return `@${beats.toFixed(2)}`;
}

commands = { beats };
