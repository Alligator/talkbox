const { createCanvas, ImageData } = require('canvas');
const { parseGIF, decompressFrames } = require('gifuct-js');

function forEachGifFrame(img, cb) {
  const gif = parseGIF(img);
  const frames = decompressFrames(gif, true);
  const meta = { width: gif.lsd.width, height: gif.lsd.height };

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

    cb(frameCtx.canvas, i, nframes, frame.delay);
  }
}

module.exports = { forEachGifFrame };
