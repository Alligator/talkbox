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
        case '0': return '0️⃣';
        case '1': return '1️⃣';
        case '2': return '2️⃣';
        case '3': return '3️⃣';
        case '4': return '4️⃣';
        case '5': return '5️⃣';
        case '6': return '6️⃣';
        case '7': return '7️⃣';
        case '8': return '8️⃣';
        case '9': return '9️⃣';
        case ' ': return '    ';
        default: return String.fromCodePoint(0xd83c, 0xdde6 + (char.charCodeAt(0) - 97));
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
const monospace = unicodeConvert([
  [65,  92,   0x1D670],
  [97,  124,  0x1D68A],
]);

function superscript(text) {
  const map = {"0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","a":"ᵃ","b":"ᵇ","c":"ᶜ","d":"ᵈ","e":"ᵉ","f":"ᶠ","g":"ᵍ","h":"ʰ","i":"ᶦ","j":"ʲ","k":"ᵏ","l":"ˡ","m":"ᵐ","n":"ⁿ","o":"ᵒ","p":"ᵖ","q":"ᑫ","r":"ʳ","s":"ˢ","t":"ᵗ","u":"ᵘ","v":"ᵛ","w":"ʷ","x":"ˣ","y":"ʸ","z":"ᶻ","A":"ᴬ","B":"ᴮ","C":"ᶜ","D":"ᴰ","E":"ᴱ","F":"ᶠ","G":"ᴳ","H":"ᴴ","I":"ᴵ","J":"ᴶ","K":"ᴷ","L":"ᴸ","M":"ᴹ","N":"ᴺ","O":"ᴼ","P":"ᴾ","Q":"Q","R":"ᴿ","S":"ˢ","T":"ᵀ","U":"ᵁ","V":"ⱽ","W":"ᵂ","X":"ˣ","Y":"ʸ","Z":"ᶻ","+":"⁺","-":"⁻","=":"⁼","(":"⁽",")":"⁾", "q":"ᵠ", "Q":"ᵠ", "?":"ˀ", "!":"ᵎ"};
  const charArray = text.split("");
  for (let i = 0; i < charArray.length; i++) {
    if (map[charArray[i].toLowerCase()]) {
      charArray[i] = map[charArray[i]];
    }
  }
  text = charArray.join("");
  return text;
}

function subscript(text) {
  const map = {"0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉","a":"ₐ","b":"b","c":"c","d":"d","e":"ₑ","f":"f","g":"g","h":"ₕ","i":"ᵢ","j":"ⱼ","k":"ₖ","l":"ₗ","m":"ₘ","n":"ₙ","o":"ₒ","p":"ₚ","q":"q","r":"ᵣ","s":"ₛ","t":"ₜ","u":"ᵤ","v":"ᵥ","w":"w","x":"ₓ","y":"y","z":"z","A":"ₐ","B":"B","C":"C","D":"D","E":"ₑ","F":"F","G":"G","H":"ₕ","I":"ᵢ","J":"ⱼ","K":"ₖ","L":"ₗ","M":"ₘ","N":"ₙ","O":"ₒ","P":"ₚ","Q":"Q","R":"ᵣ","S":"ₛ","T":"ₜ","U":"ᵤ","V":"ᵥ","W":"W","X":"ₓ","Y":"Y","Z":"Z","+":"₊","-":"₋","=":"₌","(":"₍",")":"₎", "y":"ᵧ", "b":"ᵦ", "q":"ᵩ", "z":"𝓏", "w":"𝓌", "c":"𝒸", "d":"𝒹", "f":"𝒻", "g":"𝓰"};
  const charArray = text.split("");
  for(let i = 0; i < charArray.length; i++) {
    if (map[charArray[i].toLowerCase()]) {
      charArray[i] = map[charArray[i]];
    }
  }
  text = charArray.join("");
  return text;
}

commands = {
  uppercase,
  bigged,
  saturn,
  think,
  script,
  jab,
  circles,
  parens,
  monospace,
  superscript,
  subscript,
};
