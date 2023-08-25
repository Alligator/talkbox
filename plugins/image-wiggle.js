const { createCanvas, loadImage, createImageData } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const { getImage, resize } = require('../plugins/utils/image');

function smoothstep(left, right, x) {
  if (x < left)
    return 0;
  if (x > right)
    return 1;

  x = (x - left) / (right - left);
  return (2 - x) * x;
}

async function wiggle(text, message, currentOutput) {
  const [success, img] = await getImage(message, currentOutput);
  if (!success) {
    return img;
  }

  const wigglePx = 50;

  const resizedImg = await loadImage(await resize(img, 400));
  const canvas = createCanvas(resizedImg.width + wigglePx * 2, resizedImg.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(resizedImg, wigglePx, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const cleanBuf8 = Uint8ClampedArray.from(imgData.data);
  let buf32 = new Uint32Array(imgData.data.buffer);

  const encoder = new GIFEncoder(canvas.width, canvas.height);
  encoder.start();
  encoder.setDelay(33);
  encoder.setRepeat(0);
  encoder.setTransparent(true);

  const frames = 25;
  for (let i = 0; i < frames; i++) {
    const wiggleAmt = Math.sin((i / frames) * Math.PI * 2);

    for (let y = 0; y < resizedImg.height; y++) {
      // const scaleFactor = 1 - (y / resizedImg.height) * (y / resizedImg.height);
      const scaleFactor = 1 - smoothstep(0, resizedImg.height, y);
      const offset = Math.round(wiggleAmt * scaleFactor * wigglePx);
      const rowStart = y * canvas.width;
      // log(`${y} ${scaleFactor} ${offset}`);
      if (offset > 0) {
        buf32.copyWithin(
          rowStart + offset,
          rowStart,
          rowStart + wigglePx + resizedImg.width + offset,
        );
      } else {
        buf32.copyWithin(
          rowStart + wigglePx + offset,
          rowStart + wigglePx,
          rowStart + canvas.width,
        );
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imgData, 0, 0);
    encoder.addFrame(ctx);

    imgData.data.set(cleanBuf8);
  }

  encoder.finish();
  return { data: encoder.out.getData(), ext: 'gif' };
}

commands = { wiggle };
