const sharp = require('sharp');
const GIFEncoder = require('gif-encoder-2');
const { createCanvas, Image, ImageData } = require('canvas');
const getMostRecentImage = require('../plugins/utils/most-recent-image');

async function lakeCmd(text, message, currentOutput) {
  let inputImg;
  if (currentOutput.data) {
    inputImg = currentOutput.data.data;
  } else {
    inputImg = await getMostRecentImage(message);
    if (typeof inputImg === 'string') {
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

  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = e => { throw e; };

    img.onload = () => {
      try {
        const result = lake(img);
        log('laked');
        resolve({ data: result, ext: 'gif' });
      } catch (e) {
        log(e.stack);
        resolve();
      }
    };

    img.src = resizedImg;
  });
}

function lake(image) {
  const waves = 10
  const speed = 1/4;
  const scale = 1/2;

  const ca = createCanvas(image.width, image.height);
  const c = ca.getContext('2d');

  let offset = 0;
  let frame = 0;
  let max_frames = 0;

  c.canvas.width  = image.width;
  c.canvas.height = image.height*2;
  c.drawImage(image, 0,  0);

  c.save();

  c.scale(1, -1);
  c.drawImage(image, 0, -image.height*2);

  c.restore();

  const w = c.canvas.width;
  const h = c.canvas.height;
  const dw = w;
  const dh = h/2;

  const id = c.getImageData(0, h/2, w, h).data;
  let end = false;

  const frames = [];
  // precalc frames
  // image displacement
  c.save();
  while (!end) {
    // var odd = c.createImageData(dw, dh);
    var odd = c.getImageData(0, h/2, w, h);
    var od = odd.data;
    // var pixel = (w*4) * 5;
    var pixel = 0;
    for (var y = 0; y < dh; y++) {
      for (var x = 0; x < dw; x++) {
        // var displacement = (scale * dd[pixel]) | 0;
        var displacement = (scale * 10 * (Math.sin((dh/(y/waves)) + (-offset)))) | 0;
        var j = ((displacement + y) * w + x + displacement)*4;

        // horizon flickering fix
        if (j < 0) {
          pixel += 4;
          continue;
        }

        // edge wrapping fix
        var m = j % (w*4);
        var n = scale * 10 * (y/waves);
        if (m < n || m > (w*4)-n) {
          var sign = y < w/2 ? 1 : -1;
          od[pixel]   = od[pixel + 4 * sign];
          od[++pixel] = od[pixel + 4 * sign];
          od[++pixel] = od[pixel + 4 * sign];
          od[++pixel] = od[pixel + 4 * sign];
          ++pixel;
          continue;
        }

        if (id[j+3] != 0) {
          od[pixel]   = id[j];
          od[++pixel] = id[++j];
          od[++pixel] = id[++j];
          od[++pixel] = id[++j];
          ++pixel;
        } else {
          od[pixel]   = od[pixel - w*4];
          od[++pixel] = od[pixel - w*4];
          od[++pixel] = od[pixel - w*4];
          od[++pixel] = od[pixel - w*4];
          ++pixel;
          // pixel += 4;
        }
      }
    }

    if (offset > speed * (6/speed)) {
      offset = 0;
      max_frames = frame - 1;
      // frames.pop();
      frame = 0;
      end = true;
    } else {
      offset += speed;
      frame++;
    }
    frames.push(odd);
  }

  c.restore();

  const encoder = new GIFEncoder(ca.width, ca.height);
  encoder.start();
  encoder.setDelay(33);
  encoder.setRepeat(0);
  encoder.setTransparent(true);

  frames.forEach((f) => {
    c.putImageData(f, 0, dh);
    encoder.addFrame(c);
  });

  encoder.finish();
  return encoder.out.getData();
}

commands = { lake: lakeCmd };

