const spaces = {
  thin: '\u2009',
  hair: '\u200a',
};

function kern(txt) {
  return txt.split('').map((c) => {
    if (Math.random() > 0.9) {
      return `${c}${spaces.hair}`;
    }
    if (Math.random() > 0.9) {
      return `${c}${spaces.thin}`;
    }
    return c;
  }).join('');
}

commands = { kern };
