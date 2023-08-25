const nlp = require('compromise');
const { shouldShutUp } = require('../plugins/utils/spam-check');

const allowedChannels = [
  '191333880823939073', // margs
  '293237101120454658', // audio
  '191015116655951872', // lawbreakers
  '365704891408056330', // sludge realm
  '279056857287491585', // spam

  '368082254871658505', // my server (general)
];

function ellipses(text) {
  const clauses = nlp(text).clauses().out('array');
  const idx = Math.floor(Math.random() * clauses.length);

  const lines = ['', '', ''];
  for (let i = 0; i < clauses.length; i++) {
    if (i < idx) {
      lines[0] += clauses[i] + ' ';
    } else if (i === idx) {
      const words = nlp(clauses[i]).words().out('array');
      const head = words.slice(0, -1);
      const tail = words[words.length - 1];
      lines[0] += head.join(' ');
      lines[1] = tail + '...';
    } else {
      lines[2] += clauses[i] + ' ';
    }
  }

  return lines.join('\n');
}

const chance = 0.01;
const delay = 100;
let currentDelay = 0;

function ellipsesMsg(match, message) {
  if (!allowedChannels.includes(message.channel.id)) {
    return;
  }

  if (shouldShutUp(globalDb)) {
    return;
  }

  if (message.cleanContent.includes('http')) {
    return;
  }

  if (currentDelay === 0 && Math.random() < chance) {
    currentDelay = delay;
    message.channel.send(ellipses(message.cleanContent));
  }
  currentDelay = Math.max(currentDelay - 1, 0);
}

ellipsesMsg._regex = /./;

commands = { ellipses };
