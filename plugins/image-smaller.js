const { removeSeams } = require('seam-carving');
const sharp = require('sharp');
const GIFEncoder = require('gif-encoder-2');
const { createCanvas, Image, ImageData } = require('canvas');
const getMostRecentImage = require('../plugins/utils/most-recent-image');

async function smaller(text, message, currentOutput) {
  const animate = text === 'animate';
  const start = new Date().getTime();

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

  const resizedImg = await sharp(inputImg)
    .resize({
      width: 400,
      height: 400,
      fit: 'inside',
    })
    .toFormat('png')
    .toBuffer();

  const s = sharp(resizedImg);
  const meta = await s.metadata();

  let encoder;
  let fixedCanvas;
  let fixedCanvasCtx;
  const frameData = [];
  if (animate) {
    encoder = new GIFEncoder(meta.width, meta.height);
    encoder.start();
    encoder.setDelay(33);
    encoder.setRepeat(0);
    encoder.setTransparent(true);
    fixedCanvas = createCanvas(meta.width, meta.height);
    fixedCanvasCtx = fixedCanvas.getContext('2d');
  }

  return new Promise((resolve) => {
    const canvasImage = new Image();
    canvasImage.onerror = e => { throw e; };
    canvasImage.onload = () => {
      const canvas = createCanvas(meta.width, meta.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(canvasImage, 0, 0);

      const newWidth = Math.floor(canvas.width/2);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (animate) {
        let i = 0;
        removeSeams(imgData.data, canvas.width, canvas.height, canvas.width - newWidth, (newData, cWidth) => {
          if (i++ % 5 !== 0) {
            return;
          }
          const newImgData = new ImageData(newData, cWidth, canvas.height);
          ctx.canvas.width = cWidth;
          ctx.putImageData(newImgData, 0, 0);

          fixedCanvasCtx.clearRect(0, 0, meta.width, meta.height);
          fixedCanvasCtx.drawImage(canvas, Math.floor(i/2), 0);

          encoder.addFrame(fixedCanvasCtx);
          frameData.push(fixedCanvasCtx.getImageData(0, 0, meta.width, meta.height).data);
        });
      } else {
        const newData = removeSeams(imgData.data, canvas.width, canvas.height, canvas.width - newWidth);
        const newImgData = new ImageData(newData, newWidth, canvas.height);
        ctx.canvas.width = newWidth;
        ctx.putImageData(newImgData, 0, 0);
      }

      const elapsed = new Date().getTime() - start;
      log(`smaller took ${elapsed}ms`);

      if (animate) {
        fixedCanvasCtx.clearRect(0, 0, meta.width, meta.height);
        fixedCanvasCtx.drawImage(canvas, Math.floor((meta.width - newWidth) / 2), 0);
        encoder.addFrame(fixedCanvasCtx);
        for (let i = frameData.length - 1; i >= 0; i--) {
          encoder.addFrame(frameData[i]);
        }
        encoder.finish();
        resolve({ data: encoder.out.getData(), ext: 'gif' });
        return;
      }

      const buf =  canvas.toBuffer('image/png');
      resolve({ data: buf, ext: 'png' });
    }
    canvasImage.src = resizedImg;
  });
}

commands = { smaller };
