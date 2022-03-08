const { textWrap } = require('../plugins/utils/text-wrap');

const fill = (str, width) => new Array(width).fill(str).join('');
const centre = (str, width, filler = ' ') => {
  const remainingWidth = width - str.length;
  if (remainingWidth <= 0) {
    return str;
  }

  const lwidth = Math.floor(remainingWidth/2);
  const rwidth = Math.ceil(remainingWidth/2);

  return `${fill(filler, lwidth)}${str}${fill(filler, rwidth)}`;
};

function rip(text) {
  const { lines, longestLine } = textWrap(text, 40);
  const width = longestLine.length + 4;

  const headstone = [];
  headstone.push(`  _.${fill('-', width - 5)}-._`);
  headstone.push(` |${centre('RIP', width)}|`);
  lines.forEach((line) => {
    headstone.push(` |${centre(line, width)}|`);
  });
  headstone.push(` |${centre('', width, '_')}|`);
  headstone.push(`|${centre('', width + 2, '_')}|`);

  return '```' + headstone.join('\n') + '```';
}

function bread(text) {
  const { lines, longestLine } = textWrap(text, 20);
  const width = longestLine.length + 3;

  const headstone = [];
  headstone.push(` .${fill('-', width - 3)}-.`);
  headstone.push(`|${centre('', width)}|`);
  lines.forEach((line) => {
    headstone.push(`|${centre(line, width)}|`);
  });
  headstone.push(`|${centre('', width, '_')}|`);

  return '```' + headstone.join('\n') + '```';
}

commands = { rip, bread };
