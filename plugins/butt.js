const { hyphenateSync } = require('hyphen/en');
const nlp = require('compromise');
const fs = require('fs');
const { shouldShutUp } = require('../plugins/utils/spam-check');

const allowedChannels = [
  '191333880823939073', // margs
  '293237101120454658', // audio
  '191015116655951872', // lawbreakers
  '365704891408056330', // sludge realm
  '279056857287491585', // spam

  '368082254871658505', // my server (general)
];

let dbg = () => {};
if (true) {
  dbg = (...args) => log(args.join(' '));
}

const stopwords = {};
function readStopwords() {
  const src = fs.readFileSync('plugins/stopwords', 'utf-8');
  for (const line of src.trim().split('\n')) {
    stopwords[line.trim()] = true;
  }
}

function hyphenate(word) {
  // repeated vowels will be hyphenated like this:
  //   buuuuuuuully -> bu­uuu­uuu­ul­ly
  //
  // instead i want them to be hyphenated like this:
  //   buuuuuuuul-ly
  // 
  // so that, if the syllable with repeat vowels gets butted, it comes out like
  //   buuuuuuuuttly
  //  
  // and not
  //   bubuttuuuully
  //
  // this is why this function is... complex.

  dbg('hyphenating', word);

  // replace 3 or more repeated vowels with one vowel, but rememeber where they were
  const repeatedVowelIndicies = {};
  const regex = /([aeiouAEIOU])\1\1+/g;
  let foundRepeatedVowels = false;

  while (true) {
    const m = regex.exec(word);
    if (m === null) {
      break;
    }
    repeatedVowelIndicies[m.index] = m[0].length;
    foundRepeatedVowels = true;
  }
  word = word.replace(regex, '$1');
  dbg('  vowels replaced:', word);

  // do the hyphenation
  let hyphenated = hyphenateSync(word);
  dbg('  hyphenated:', hyphenated);

  // re-insert the repeated vowels (if there were any)
  if (foundRepeatedVowels) {
    let ogWordIndex = 0;
    for (let i = 0; i < hyphenated.length; i++) {
      if (hyphenated[i] === '\u00AD') {
        continue;
      }

      if (repeatedVowelIndicies[ogWordIndex]) {
        const vowelCount = repeatedVowelIndicies[ogWordIndex];
        hyphenated = hyphenated.substring(0, i)
          + hyphenated[i].repeat(vowelCount)
          + hyphenated.substring(i + 1);
        i += vowelCount;
      }

      ogWordIndex++;
    }
  }
  dbg('  vowels replaced:', hyphenated);

  const indices = [0];
  for (let i = 0; i < hyphenated.length; i++) {
    if (hyphenated[i] === '\u00AD') {
      indices.push(i - (indices.length - 1));
    }
  }
  dbg('  indices:', JSON.stringify(indices));
  return indices;
}

function sub(word) {
  // const subWord = { start: 'b', vowel: 'u', end: 'tt', plural: 's' };
  const subWord = { start: 'p', vowel: 'i', end: 'ss', plural: 'es', };
  const match = /([^A-Za-z]*)(.*?)([^A-Za-z]*)$/.exec(word);
  if (match.length !== 4) {
    return word;
  }
  const isPlural = nlp(word).has('#Plural');
  const [_, startPunc, cleanWord, endPunc] = match;
  const sylPoints = hyphenate(cleanWord);

  // pick a syllable, weighted to earlier ones
  const sylIndex = sylPoints.length - 1 - Math.floor((Math.random() * (sylPoints.length ** 2)) ** (1 / 2));
  const syl = sylPoints[sylIndex];
  const replacingLastSyllable = sylIndex === sylPoints.length - 1;

  // expand the syllable forwards and backwards while it starts with 'b' or ends with 't'
  let left = syl;
  let right = sylPoints[sylIndex + 1] || cleanWord.length;

  while (left > 0 && cleanWord[left - 1] === subWord.start[0]) {
    left--;
  }

  while (right < cleanWord.length - 1 && cleanWord[right] === subWord.end[0]) {
    right++;
  }

  const vowelCount = countRepeatedVowels(cleanWord.substring(left, right));
  let butt = subWord.start + subWord.vowel.repeat(Math.max(vowelCount, 1)) + subWord.end;

  // all caps
  if (!/[a-z]/.test(cleanWord.substring(left, right))) {
    butt = butt.toUpperCase();
  } else if (/[A-Z]/.test(cleanWord.substring(left, right))) {
    // preserve capitals
    for (let i = 0; i < butt.length; i++) {
      const c = cleanWord[left + i];
      if (/[A-Z]/.test(c)) {
        butt = butt.substring(0, i)
          + butt[i].toUpperCase()
          + butt.substring(i + 1);
      }
    }
  }

  // sub it
  const subbed =
    startPunc
    + cleanWord.substring(0, left)
    + butt
    + cleanWord.substring(right)
    + (replacingLastSyllable && isPlural ? subWord.plural : '')
    + endPunc;
  return subbed;
}

function countRepeatedVowels(syllable) {
  const regex = /([aeiouAEIOU])\1\1+/g;
  let max = 0;
  while (true) {
    const m = regex.exec(syllable);
    if (m === null) {
      break;
    }
    max = m[0].length;
  }
  return max;
}

function buttify(text) {
  if (/https?:\/\//.test(text)) {
    // ignore messages with urls
    return null;;
  }

  dbg(text);
  const words = text.trim().split(/ +/);

  // keep indicies of non-stopwords
  const validWords = [];
  for (let i = 0; i < words.length; i++) {
    if (stopwords[words[i].toLowerCase()]) {
      continue;
    }
    validWords.push(i);
  }

  if (validWords.length <= 0) {
    // don't butt if we have 0 or 1 words left
    return null;
  }

  dbg('words', JSON.stringify(words));
  dbg('validWords', JSON.stringify(validWords));

  // sort validWords by length
  validWords.sort((a, b) => {
    return words[b].length - words[a].length;
  });

  // decide how many words to butt
  const wordsToButt = Math.ceil(Math.random() * (validWords.length * 0.2));

  // do the thang ding
  for (let i = 0; i < wordsToButt; i++) {
    const vwIndex = Math.floor(Math.random() * validWords.length);
    const wIndex = validWords[vwIndex];
    const word = words[wIndex];
    words[wIndex] = sub(word);
    validWords.splice(vwIndex, 1);

    if (validWords.length === 0) {
      break;
    }
  }

  return words.join(' ');
}

readStopwords();

const buttChance = 0.01;
const buttDelay = 50;
let currentDelay = 0;
let buttEnabled = true;

function buttMsg(match, message) {
  if (!buttEnabled) {
    return;
  }

  if (shouldShutUp(globalDb)) {
    return;
  }

  if (!allowedChannels.includes(message.channel.id)) {
    return;
  }

  if (currentDelay === 0 && Math.random() < buttChance) {
    currentDelay = buttDelay;
    message.channel.send(buttify(message.cleanContent));
  }
  currentDelay = Math.max(currentDelay - 1, 0);
}

buttMsg._regex = /./;

function buttCmd(text, message, currentOutput) {
  if (text === 'stop') {
    buttEnabled = false;
    return 'butt disabled';
  }
  if (text === 'start') {
    buttEnabled = true;
    return 'butt enabled';
  }
  return buttify(currentOutput.rawArgs || text);
}

commands = { butt: buttCmd };
