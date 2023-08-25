const GIFEncoder = require('gif-encoder-2');
const sharp = require('sharp');
const { createCanvas, loadImage, registerFont } = require('canvas');
const { getImage, resize, isAnimatedGif } = require('../plugins/utils/image');
const { forEachGifFrame } = require('../plugins/utils/animated-gif');
const { inspect } = require('util');

registerFont('plugins/fonts/Neucha-Regular.ttf', { family: 'Neucha' });

async function gameboycamera(text, message, currentOutput) {
  const [success, img] = await getImage(message, currentOutput);
  if (!success) {
    return img;
  }

  let resizedImg = await resize(img, 128);
  const canvasImg = await loadImage(resizedImg);
  const w = canvasImg.width;
  const h = canvasImg.height;
  const margin = 16;

  const brightnessmodifier = 0.5;
  const contrast = 1;

  const thresholdArray = [
    [1, 49, 13, 61, 4, 52, 16, 64],
    [33, 17, 45, 29, 36, 20, 48, 32],
    [9, 57, 5, 53, 12, 60, 8, 56],
    [41, 25, 37, 21, 44, 28, 40, 24],
    [3, 51, 15, 63, 2, 50, 14, 62],
    [35, 19, 47, 31, 34, 18, 46, 30],
    [11, 59, 7, 55, 10, 58, 6, 54],
    [43, 27, 39, 23, 42, 26, 38, 22],
  ];

  function twobpp(pixel) {
    const brightestPixel = 255; // dont even bother finding the real brightest pixel no mo' fuck auto levelling
    if (pixel > Math.floor(brightestPixel / 100 * 75)) {
      return 0xFF;
    } else if (pixel > Math.floor(brightestPixel / 100 * 50)) {
      return 0xAA;
    } else if (pixel > Math.floor(brightestPixel / 100 * 25)) {
      return 0x55;
    } else {
      return 0x00;
    }
  }

  const canvas = createCanvas(w + margin * 2, h + margin * 2);
  const ctx = canvas.getContext('2d');
  const topImage = await loadImage('plugins/gbc-top.png');
  const tw = topImage.width;
  const bottomImage = await loadImage('plugins/gbc-bottom.png');
  const bw = bottomImage.width;

  ctx.font = '12px Neucha';
  ctx.textAlign = 'center';

  function doFrame(img, i, nframes) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, margin, margin);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // gayscale
    for (let i = 0; i < imageData.data.length; i += 4) {
      let brightness = brightnessmodifier * imageData.data[i] + 0.5 * imageData.data[i + 1] + 0.16 * imageData.data[i + 2];
      // contrast
      brightness = ((((brightness / 255) - 0.5) * contrast) + 0.5) * 255;
      //
      imageData.data[i] = brightness;
      imageData.data[i + 1] = brightness;
      imageData.data[i + 2] = brightness;
    }

    // dithering!
    for (let i = 0; i < imageData.data.length; i += 4) {
      const coord = i / 4;
      const x = coord % canvas.width;
      const y = Math.ceil(coord / canvas.height);
      let val = imageData.data[i];
      val += thresholdArray[x % 4][y % 4];
      val = twobpp(val);
      imageData.data[i] = val;
      imageData.data[i + 1] = val;
      imageData.data[i + 2] = val;
    }

    ctx.putImageData(imageData, 0, 0);
    if (!text) {
      ctx.drawImage(topImage, Math.floor(canvas.width / 2) - Math.floor(tw / 2) + 3, 0);
      ctx.drawImage(bottomImage, Math.floor(canvas.width / 2) - Math.floor(bw / 2), canvas.height - 16);
    } else {
      ctx.fillStyle = 'white';
      ctx.fillText(text, Math.floor(canvas.width/2), 12);
      ctx.fillText(text, Math.floor(canvas.width/2), 12);
    }
  }

  if (isAnimatedGif(resizedImg)) {

    const encoder = new GIFEncoder(canvas.width, canvas.height);
    encoder.start();
    encoder.setDelay(33);
    encoder.setRepeat(0);
    encoder.setTransparent(null);

    forEachGifFrame(resizedImg, (img, i, nframes, delay) => {
      encoder.setDelay(delay);
      ctx.fillStyle = '#000000FF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      doFrame(img, i, nframes);
      encoder.addFrame(ctx);
    });

    encoder.finish();
    const gif = encoder.out.getData();
    const biggif = await resize(gif, canvas.width * 3, true);
    return { data: biggif, ext: 'gif' };

  } else {
    doFrame(canvasImg, 0, 1);
    const bigcanvas = createCanvas(canvas.width * 3, canvas.height * 3);
    bigctx = bigcanvas.getContext('2d');
    bigctx.imageSmoothingEnabled = false;
    bigctx.drawImage(canvas, 0, 0, bigcanvas.width, bigcanvas.height);

    return { data: bigcanvas.toBuffer('image/png'), ext: 'png' };

  }
}

commands = { gameboycamera, gbc: gameboycamera };
