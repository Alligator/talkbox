const gm = require('gm').subClass({imageMagick: true});
const GIFEncoder = require('gif-encoder-2');
const fs = require('fs');
const os = require('os');
const { registerFont, createCanvas } = require('canvas');

const punctuation = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
const digits = '0123456789';

const leftKeys = 'qwertasdfgzxcvb';
const rightKeys = 'yuiophjklnm';
const fatFingers = ' qwert asdfg zxcvb yuiop[] hjkl;\' nm,./ `1234567890-= ';

function rnd(min, max) {
  return (Math.random() * (max - min)) + min;
}

function generateFrames(text) {
  const speed = 3;
  const output = [];
  let currentText = '';

  let prev = null;
  let mistake = false;
  let mistakeBackspaces = 0;
  let mistakeCountdown = 0;
  let mistakeIdx = 0;

  let textIdx = 0;

  while (textIdx < text.length) {
    let c = text[textIdx];
    let delay = 0;

    if (prev === null) {
      // empty
    } else if (punctuation.includes(c)) {
      delay = rnd(0.1, 0.75) / speed;
    } else if (digits.includes(c)) {
      delay = rnd(0.3, 0.75) / speed;
    } else if (c === prev) {
      delay = rnd(0.1, 0.35) / speed;
    } else if (leftKeys.includes(prev.toLowerCase()) && leftKeys.includes(c.toLowerCase())) {
      delay = rnd(0.25, 0.4) / speed;
    } else if (rightKeys.includes(prev.toLowerCase()) && rightKeys.includes(c.toLowerCase())) {
      delay = rnd(0.25, 0.4) / speed;
    } else {
      delay = rnd(0.05, 0.15) / speed;
    }

    // mistakes
    if (textIdx > 0 && !mistake && Math.random() > 0.8) {
      if (c === ' ' || Math.random() > 0.75) {
        // forget a character
        c = '';
        mistake = true;

        const charsLeft = text.length - textIdx;
        mistakeCountdown = Math.floor(rnd(1, Math.min(6, charsLeft - 1)));

        mistakeBackspaces = 0;
        mistakeIdx = textIdx - 1;
      } else {
        // fat finger!!!
        const idx = fatFingers.indexOf(c.toLowerCase());
        const keys = [fatFingers[idx - 1], fatFingers[idx + 1]];

        if (Math.random() > 0.5) {
          // swap keys
          const tmp = keys[0];
          keys[0] = keys[1];
          keys[1] = tmp;
        }

        if (keys[0] === ' ') {
          c = keys[1];
        } else {
          c = keys[0];
        }
        mistake = true;

        const charsLeft = text.length - textIdx;
        mistakeCountdown = Math.floor(rnd(1, Math.min(6, charsLeft - 1)));

        mistakeBackspaces = 1;
        mistakeIdx = textIdx - 1;
      }
    }

    // process.stdout.write(c);
    currentText += c;
    output.push({ delay, frame: currentText });
    prev = c;

    if (mistake && mistakeCountdown > 0) {
      mistakeCountdown--;
      mistakeBackspaces++;
    } else if (mistake && mistakeCountdown === 0) {
      for (let i = 0; i < mistakeBackspaces; i++) {
        currentText = currentText.substring(0, currentText.length - 1);
        output.push({ delay: 0.2 / speed, frame: currentText });
      }
      mistake = false;
      textIdx = Math.max(mistakeIdx, - 1, 0);
    }

    textIdx++;
  }

  return output;
}

function measureText(text) {
  const canvas = createCanvas(1000, 30);
  const ctx = canvas.getContext('2d');
  ctx.font = '16px Whitney';
  const result = ctx.measureText(text);
  return result.width;
}

function renderType(frames) {
  const width = measureText(frames[frames.length - 1].frame) + 50;
  const height = 30;

  const encoder = new GIFEncoder(width, height)
  encoder.start()
  encoder.setRepeat(-1);

  frames.forEach((frame, idx) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.font = '16px Whitney';

    ctx.fillStyle = 'rgb(54, 57, 63)';
    ctx.fillRect(0, 0, width, height);

    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(frame.frame, 0, height/2);

    encoder.addFrame(ctx);
    encoder.setDelay(frame.delay * 1000);

    // const buf = canvas.toBuffer('image/png');
    // fs.writeFileSync(`${os.tmpdir()}/typeframe-${idx}.png`, buf);
  });

  encoder.finish();
  return encoder.out.getData();

  /*
  const gr = gm();
  frames.forEach((frame, idx) => {
    const delay = (frame.delay * 100).toFixed(2);
    gr.in('-delay', delay, `${os.tmpdir()}/typeframe-${idx}.png`)
  });

  return new Promise((resolve, reject) => {
    gr.in('-loop', '1')
      .toBuffer('type.gif', (err, buffer) => {
        if (err) { reject(err); }
        resolve(buffer);
      });
  });
  */
}

async function type(text) {
  const frames = generateFrames(text);
  const img = await renderType(frames);
  return {
    data: img,
    ext: 'gif',
  };
}

registerFont('plugins/fonts/Whitney-Book.otf', { family: 'Whitney' });

commands = { type };
