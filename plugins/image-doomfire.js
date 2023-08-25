const sharp = require('sharp');
const { createCanvas, loadImage, createImageData } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const gm = require('gm');
const { getImage } = require('../plugins/utils/image');

async function doomfire(text, message, currentOutput) {
  const [success, img] = await getImage(message, currentOutput);
  if (!success) {
    return img;
  }

  let resizedImg = await sharp(img)
      .resize({
        width: 200,
        height: 200,
        fit: 'inside',
      })
      .toFormat('png')
      .toBuffer();

  const canvasImg = await loadImage(resizedImg);
  const w = canvasImg.width;
  const h = canvasImg.height;
  const fire = new Array(w * h);
  const fireMax = h/2;

  for (let i = 0; i < w; i++) {
    fire[w * (h-1) + i] = fireMax;
  }

  function doFire(stop) {
    for (let x = 0; x < w; x++) {
      for (let y = 1; y < h; y++) {
        const from = y * w + x;
        if (typeof fire[from] === 'undefined' || fire[from] <= 0) {
          fire[from - w] = 0;
          continue;
        }
        const r = Math.round(Math.random() * 3.0) & 3;
        const to = from - w - r + 1;
        fire[to] = fire[from] - (r & 1);
        if (stop) {
          fire[from] = fire[from] - ((r & 2) >> 1);
        }
      }
    }
  }

  const encoder = new GIFEncoder(w, h);
  encoder.start();
  encoder.setDelay(33);
  encoder.setRepeat(0);
  encoder.setTransparent(true);

  const fireCanvas = createCanvas(w, h);
  const ctx = fireCanvas.getContext('2d');

  const imageCanvas = createCanvas(w, h);
  const imageCtx = imageCanvas.getContext('2d');
  imageCtx.drawImage(canvasImg, 0, 0);
  const imgData = imageCtx.getImageData(0, 0, w, h);
  const imgBuf32 = new Uint32Array(imgData.data.buffer);

  for (let i = 0; i < h * 1.5; i++) {
    const maskedImgData = createImageData(w, h);
    const buf32 = new Uint32Array(maskedImgData.data.buffer);

    if (i > h * 0.5) {
      doFire(true);
    } else {
      doFire();
    }

    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const f = fire[y * w + x];
        if (f > 0) {
          const imgPixel = imgBuf32[y * w + x];
          let r = imgPixel & 0xff;
          let g = (imgPixel >> 8) & 0xff;
          let b = (imgPixel >> 16) & 0xff;
          let a = (imgPixel >> 24) & 0xff;
          if (f < fireMax/4) {
            r /= 2;
            g /= 2;
            b /= 2;
          } else if (f < fireMax/6) {
            r /= 3;
            g /= 3;
            b /= 3;
          }
          buf32[y * w + x] = r | (g << 8) | (b << 16) | (a << 24);
        } else {
          buf32[y * w + x] = 0;
        }
      }
    }

    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(maskedImgData, 0, 0);

    encoder.addFrame(ctx);
  }

  encoder.finish();
  return { data: encoder.out.getData(), ext: 'gif' };
}

async function doommelt(text, message, currentOutput) {
  const [success, img] = await getImage(message, currentOutput);
  if (!success) {
    return img;
  }

  let resizedImg = await sharp(img)
      .resize({
        width: 300,
        height: 300,
        fit: 'inside',
      })
      .rotate(-90)
      .toFormat('png')
      .toBuffer();

  // image is rotated -90 deg, so columns are rows
  const canvasImg = await loadImage(resizedImg);
  const w = canvasImg.width;
  const h = canvasImg.height;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(canvasImg, 0, 0);

  const encoder = new GIFEncoder(w, h);
  encoder.start();
  encoder.setDelay(33);
  encoder.setRepeat(0);
  encoder.setTransparent(true);

  // column offsets
  const colOffset = [Math.floor(Math.random()*16)];
  for (let i = 1; i < h; i ++) {
    const r = Math.floor(Math.random()*3) - 1;
    colOffset[i] = colOffset[i-1] + r;
    if (colOffset[i] > 0) {
      colOffset[i] = 0;
    } else if (colOffset[i] == -16) {
      colOffset[i] = -15;
    }
  }

  const imgData = ctx.getImageData(0, 0, w, h);
  let buf32 = new Uint32Array(imgData.data.buffer);
  const cleanBuf8 = Uint8ClampedArray.from(imgData.data);

  encoder.setDelay(500);
  encoder.addFrame(ctx);
  encoder.setDelay(33);

  let done = false;

  while (!done) {
    done = true;

    for (let y = 0; y < h; y++) {
      const nx = colOffset[y];
      if (nx < 0) {
        colOffset[y] += 1;
        done = false;
        continue;
      } else if (colOffset[y] < w) {
        let dx = colOffset[y] < 16 ? colOffset[y] + 1 : 8;
        if (colOffset[y] + dx > w) {
          dx = Math.abs(w - colOffset[y]);
        }
        colOffset[y] += dx;
        done = false;
      }

      buf32.copyWithin(y * w + colOffset[y], y * w, ((y + 1) * w) - colOffset[y]);
      buf32.fill(0, y * w, y * w + colOffset[y]);
    }
    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(imgData, 0, 0);

    if (done) {
      encoder.setDelay(500);
    }

    encoder.addFrame(ctx);

    imgData.data.set(cleanBuf8);
    buf32 = new Uint32Array(imgData.data.buffer);
  }

  encoder.finish();

  return new Promise((resolve, reject) => {
    const gif = encoder.out.getData();
    gm(gif).rotate('transparent', 90).toBuffer((err, buffer) => {
      if (err) {
        reject(err);
      }
      resolve({ data: buffer, ext: 'gif' });
    });
  });
}

commands = { doomfire, doommelt, melt: doommelt };
