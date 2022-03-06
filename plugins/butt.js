const { hyphenateSync } = require('hyphen/en');
const fs = require('fs');

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
  const sylPoints = hyphenate(word);

  // pick a syllable, weighted to earlier ones
  const sylIndex = sylPoints.length - 1 - Math.floor((Math.random() * (sylPoints.length ** 2)) ** (1 / 2));
  const syl = sylPoints[sylIndex];

  // expand the syllable forwards and backwards while it starts with 'b' or ends with 't'
  let left = syl;
  let right = sylPoints[sylIndex + 1] || word.length;

  while (left > 0 && word[left - 1] === 'b') {
    left--;
  }

  while (right < word.length - 1 && word[right] === 't') {
    right++;
  }

  const vowelCount = countRepeatedVowels(word.substring(left, right));
  let butt = 'b' + 'u'.repeat(Math.max(vowelCount, 1)) + 'tt';

  // preserve capitals
  for (let i = 0; i < butt.length; i++) {
    const c = word[left + i];
    if (/[A-Z]/.test(c)) {
      butt = butt.substring(0, i)
        + butt[i].toUpperCase()
        + butt.substring(i + 1);
    }
  }

  // sub it
  const subbed = word.substring(0, left) + butt + word.substring(right);
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
  if (text === 'stop') {
    buttEnabled = false;
    return 'butt disabled';
  }
  if (text === 'start') {
    buttEnabled = true;
    return 'butt enabled';
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

  if (validWords.length === 0) {
    return null;
  }

  dbg(JSON.stringify(words));
  dbg(JSON.stringify(validWords));

  // sort validWords by length
  validWords.sort((a, b) => {
    return words[b].length - words[a].length;
  });

  // decide how many words to butt
  const wordsToButt = Math.ceil(Math.random() * (validWords.length * 0.1));

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

const buttChance = 0.05;
const buttDelay = 50;
let currentDelay = 0;
let buttEnabled = true;

function buttMsg(match, message) {
  if (!buttEnabled) {
    return;
  }

  if (currentDelay === 0 && Math.random() < buttChance) {
    currentDelay = buttDelay;
    message.channel.send(buttify(message.cleanContent));
  }
  currentDelay = Math.max(currentDelay - 1, 0);
}

buttMsg._regex = /./;

commands = { buttify };
