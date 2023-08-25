const { removeSeams } = require('seam-carving');
const sharp = require('sharp');
const GIFEncoder = require('gif-encoder-2');
const { createCanvas, Image, ImageData } = require('canvas');
const { parseGIF, decompressFrames } = require('gifuct-js');
const gm = require('gm');
const { getMostRecentImage } = require('../plugins/utils/image');
const util = require('util');

function rotate(img, degrees) {
  return new Promise((resolve, reject) => {
    const result = gm(img).rotate('transparent', degrees);
    result.toBuffer((err, buffer) => {
      if (err) {
        reject(err);
      }
      resolve(buffer);
    });
  });
}

async function smaller(text, message, currentOutput) {
  let animate = false;
  let vertical = false;
  if (text && text.length) {
    for (const arg of text.split(/ +/)) {
      switch (arg) {
        case 'animate': {
          animate = true;
          break;
        }
        case 'vertical': {
          vertical = true;
          break;
        }
        default:
          return `unknown option ${arg}`;
      }
    }
  }

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

  if (animate && inputImg.slice(0, 6).toString() === 'GIF89a') {
    return smallerGif(inputImg, message);
  }

  let resizedImg = await sharp(inputImg)
      .resize({
        width: 400,
        height: 400,
        fit: 'inside',
      })
      .toFormat('png')
      .toBuffer();

  if (vertical) {
    resizedImg = await rotate(resizedImg, 90);
  }

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
    canvasImage.onload = async () => {
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
        if (vertical) {
          resolve({ data: await rotate(encoder.out.getData(), -90), ext: 'gif' });
        } else {
          resolve({ data: encoder.out.getData(), ext: 'gif' });
        }
        return;
      }

      let buf =  canvas.toBuffer('image/png');
      if (vertical) {
        resolve({ data: await rotate(buf, -90), ext: 'png' });
      } else {
        resolve({ data: buf, ext: 'png' });
      }
    }
    canvasImage.src = resizedImg;
  });
}

function smallerGif(inputImg, message) {
  const start = new Date().getTime();

  const gif = parseGIF(inputImg);
  const frames = decompressFrames(gif, true);
  const meta = frames[0].dims;
  const step = frames.length / (meta.width/2);

  const encoder = new GIFEncoder(meta.width, meta.height);
  encoder.start();
  encoder.setDelay(33);
  encoder.setRepeat(0);
  encoder.setTransparent(true);

  return new Promise((resolve) => {
    // the output
    const canvas = createCanvas(meta.width, meta.height);
    const ctx = canvas.getContext('2d');

    // the next frame's image data gets put here
    const tmpCanvas = createCanvas(meta.width, meta.height);
    const tmpCtx = tmpCanvas.getContext('2d');

    // the frame gets composited here
    const frameCanvas = createCanvas(meta.width, meta.height);
    const frameCtx = frameCanvas.getContext('2d');

    const nframes = frames.length;

    for (let i = 0; i < nframes; i++) {
      const frame = frames[i];

      // draw the new frame over top of the previous one
      tmpCanvas.width = frame.dims.width;
      tmpCanvas.height = frame.dims.height;
      tmpCtx.putImageData(new ImageData(frame.patch, frame.dims.width, frame.dims.height), 0, 0);

      if (frame.disposalType ===  2) {
        frameCtx.clearRect(0, 0, meta.width, meta.height);
      }

      frameCtx.drawImage(tmpCanvas, frame.dims.left, frame.dims.top);

      // figure out the desired width
      const w = (i / ((nframes - 1) / meta.width));
      const desiredWidth = Math.floor(w <= meta.width / 2 ? meta.width - w : w);

      // // remove seams
      const frameImgData = frameCtx.getImageData(0, 0, meta.width, meta.height);
      const newData = removeSeams(frameImgData.data, meta.width, meta.height, meta.width - desiredWidth);
      const newImgData = new ImageData(newData, desiredWidth, meta.height);

      tmpCanvas.width = desiredWidth;
      tmpCtx.putImageData(newImgData, 0, 0);

      const margin = Math.floor((meta.width - desiredWidth) / 2)
      ctx.drawImage(tmpCanvas, margin, 0);
      ctx.clearRect(0, 0, margin, meta.height);
      ctx.clearRect(margin + desiredWidth, 0, meta.width, meta.height);
      encoder.addFrame(ctx);
      encoder.setDelay(frame.delay);
    }

    encoder.finish();
    const elapsed = new Date().getTime() - start;
    log(`smaller took ${elapsed}ms`);
    resolve({ data: encoder.out.getData(), ext: 'gif' });
  });
}

commands = { smaller };
