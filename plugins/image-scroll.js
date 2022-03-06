const GIFEncoder = require('gif-encoder-2');
const { createCanvas, Image } = require('canvas');
const getMostRecentImage = require('../plugins/utils/most-recent-image');

async function scroll(text, message, currentOutput) {
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

  const loop = text === 'loop';

  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = e => { throw e; };
    img.onload = () => {
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      const encoder = new GIFEncoder(img.width, img.height);
      encoder.start();
      encoder.setDelay(100);
      encoder.setRepeat(0);
      encoder.setTransparent(true);

      const step = Math.max(Math.ceil(img.height / 40), 1);

      for (let y = img.height; y > -img.height; y -= step) {
        ctx.clearRect(0, 0, img.width, img.height);
        ctx.drawImage(img, 0, y);
        if (loop) {
          ctx.drawImage(img, 0, y + img.height);
          ctx.drawImage(img, 0, y - img.height);
        }
        encoder.addFrame(ctx);
      }

      encoder.finish();
      resolve({ data: encoder.out.getData(), ext: 'gif' });
    };
    img.src = inputImg;
  });
}

commands = { scroll };
