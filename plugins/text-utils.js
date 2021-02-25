function uppercase(text) {
  return text.toUpperCase();
}

function bigged(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split('')
    .map((char) => {
      switch (char) {
        case '0': return ':zero:';
        case '1': return ':one:';
        case '2': return ':two:';
        case '3': return ':three:';
        case '4': return ':four:';
        case '5': return ':five:';
        case '6': return ':six:';
        case '7': return ':seven:';
        case '8': return ':eight:';
        case '9': return ':nine:';
        case ' ': return '    ';
        default: return `:regional_indicator_${char}:`;
      }
    })
    .join(' ');
}

function saturn(text) {
  mappings = {
    'a': 'ᗩ',
    'b': 'ᗷ',
    'c': 'ᘓ',
    'd': 'ᗪ',
    'e': 'ᕮ',
    'f': 'ᖴ',
    'g': 'ᕤ',
    'h': 'ᗁ',
    'i': 'ᓮ',
    'j': 'ᒎ',
    'k': 'ᔌ',
    'l': 'ᒪ',
    'm': 'ᙏ',
    'n': 'ᑎ',
    'o': 'ᘎ',
    'p': 'ᖘ',
    'q': 'ᕴ',
    'r': 'ᖇ',
    's': 'ᔕ',
    't': 'ᒮ',
    'u': 'ᘮ',
    'v': 'ᐯ',
    'w': 'ᙎ',
    'x': '᙭',
    'y': 'ᖿ',
    'z': 'ᔓ',
    "'": 'ᐞ'
  }

  return text
    .toLowerCase()
    .split('')
    .map(c => mappings[c] || ' ')
    .join('');
}

function think(text) {
  return `( .   __ . ) . o O ( ${text} )`;
}

function mapRanges(ranges, c) {
  const code = c.charCodeAt(0);

  if (Array.isArray(ranges)) {
    for (let i = 0; i < ranges.length; i++) {
      const [min, max, offset] = ranges[i];
      if (code >= min && code <= max) {
        return String.fromCodePoint((code - min) + offset);
      }
    }
    return c;
  }

  const offsetCode = (code - 65) + offset;
  return String.fromCodePoint(offsetCode);
}

function unicodeConvert(ranges) {
  return (text) => {
    const chars = text.split('').map((c) => {
      if (!/[a-zA-Z]/.test(c)) {
        return c;
      }
      return mapRanges(ranges, c);
    });
    return chars.join(' ');
  };
}

const script = unicodeConvert([
  [65,  92,   0x1D4D0],
  [97,  124,  0x1D4EA],
]);
const jab = unicodeConvert([
  [32,  32,   0x3000],
  [65,  128,  0xFF21],
]);
const circles = unicodeConvert([
  [65,  92,   0x24B6],
  [97,  124,  0x24D0],
]);
const parens = unicodeConvert([
  [65,  92,   0x249C],
  [97,  124,  0x249C],
]);

commands = {
  uppercase,
  bigged,
  saturn,
  think,
  script,
  jab,
  circles,
  parens,
};
