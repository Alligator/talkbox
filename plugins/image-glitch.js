const sharp = require('sharp');
const GIFEncoder = require('gif-encoder-2');
const { createCanvas, loadImage } = require('canvas');
const { getMostRecentImage } = require('../plugins/utils/image');

async function glitchImage(image) {
  let buf = await sharp(image)
    .toFormat('jpg')
    .toBuffer();

  let maxTemp = buf.length / 20;
  let temp = maxTemp;
  for (let i = 0; i < buf.length; i++) {
    if (temp <= 0) {
      buf[i] = buf[i] ^ Math.floor(Math.random() * 8);
      temp = maxTemp;
    } else {
      temp -= Math.floor(Math.random() * 3);
    }
  }

  return buf;
}

async function glitch(text, message, currentOutput) {
  let inputImg;
  if (currentOutput.data) {
    inputImg = currentOutput.data.data;
  } else {
    inputImg = await getMostRecentImage(message);
    if (typeof inputImg === 'string') {
      // error message
      return inputImg;
    }
  }

  if (text === 'animate') {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const meta = await sharp(inputImg).metadata();

        const encoder = new GIFEncoder(meta.width, meta.height);
        encoder.start();
        encoder.setDelay(128);
        encoder.setRepeat(0);
        encoder.setTransparent(true);

        const canvas = createCanvas(meta.width, meta.height);
        const ctx = canvas.getContext('2d');

        for (let i = 0; i < 8; i++) {
          const frame = await glitchImage(inputImg);
          const img = await loadImage(frame);
          ctx.drawImage(img, 0, 0);
          encoder.addFrame(ctx);
        }

        encoder.finish();
        return {
          data: encoder.out.getData(),
          ext: 'gif',
        };
      } catch(e) {
        continue;
      }
    }

    return 'oops failed to glitch in 3 attempts';
  } else {
    // draw it to a canvas so the result is a valid image
    // otherwise piping to other commands might break
    const meta = await sharp(inputImg).metadata();
    const canvas = createCanvas(meta.width, meta.height);
    const ctx = canvas.getContext('2d');

    const glitchedImg = await glitchImage(inputImg);
    const img = await loadImage(glitchedImg);
    ctx.drawImage(img, 0, 0);

    return {
      data: canvas.toBuffer('image/jpeg'),
      ext: 'jpg',
    };
  }
}

commands = { glitch };
