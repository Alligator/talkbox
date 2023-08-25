const GIFEncoder = require('gif-encoder-2');
const { createCanvas, loadImage, ImageData } = require('canvas');
const { getImage, resize, isAnimatedGif } = require('../plugins/utils/image');
const { forEachGifFrame } = require('../plugins/utils/animated-gif');

async function spin(text, message, currentOutput) {
  const [success, lastImg] = await getImage(message, currentOutput);
  if (!success) {
    return lastImg;
  }

  const resizedImg = await resize(lastImg, 400);
  const img = await loadImage(resizedImg);
  const diagonal = Math.floor(Math.sqrt((img.width * img.width)  + (img.height * img.height)));
  const xoffset = (img.width - diagonal) / 2;
  const yoffset = (img.height - diagonal) / 2;

  const encoder = new GIFEncoder(diagonal, diagonal);
  encoder.start();
  encoder.setDelay(33);
  encoder.setRepeat(0);
  encoder.setTransparent(true);

  const canvas = createCanvas(diagonal, diagonal);
  const ctx = canvas.getContext('2d');

  function doFrame(img, i, nframes) {
    const radians = (Math.PI * 2) * (i / nframes);
    ctx.save();
    {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.translate(diagonal/2, diagonal/2);
      ctx.rotate(radians);
      ctx.drawImage(img, (-diagonal/2) - xoffset, (-diagonal/2) - yoffset);
      encoder.addFrame(ctx);
    }
    ctx.restore();
  }

  if (isAnimatedGif(resizedImg)) {
    forEachGifFrame(resizedImg, doFrame);
  } else {
    let frames = 33;
    if (text === 'fast') {
      frames = 16;
    }

    for (let i = 0; i < frames; i++) {
      doFrame(img, i, frames);
    }
  }

  encoder.finish();
  return { data: encoder.out.getData(), ext: 'gif' };
}

spin._help = 'spin [fast] - spin an image';
commands = { spin };
