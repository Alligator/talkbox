const { spawn } = require('child_process');
const { Readable } = require('stream');
const { inspect } = require('util');
const { WaveFile } = require('wavefile');
const { createCanvas, loadImage } = require('canvas');
const sharp = require('sharp');
const { getImage } = require('../plugins/utils/image');

// TODO: don't use a copy of this function
async function sox(buffer, args) {
  const command = '/usr/bin/sox';
  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0);
    let dead = false;
    let stderr = '';

    const proc = spawn(command, args);

    const timeout = setTimeout(() => {
      if (!dead) {
        proc.kill();
        log('sox killed');
        reject(new Error('5s timeout exceeded, sox killed'));
      }
    }, 5000);

    proc.stdout.on('data', (data) => {
      buf = Buffer.concat([buf, data]);
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('exit', (code) => {
      dead = true;
      if (code !== 0) {
        log(stderr);
        reject(stderr);
      }
      resolve(buf);
    });

    proc.on('error', (error) => {
      reject(error);
    });

    if (buffer && proc.stdin.writable) {
      const stream = Readable.from(buffer);
      stream.pipe(proc.stdin);
    }
  });
}

async function img2snd(text, message, currentOutput) {
  const [success, img] = await getImage(message, currentOutput);
  if (!success) {
    return img;
  }

  let resizedImg = await sharp(img)
      .resize({
        width: 400,
        height: 400,
        fit: 'inside',
      })
      .toFormat('png')
      .toBuffer();

  const canvasImg = await loadImage(resizedImg);
  const w = canvasImg.width;
  const h = canvasImg.height;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(canvasImg, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const buf32 = new Uint32Array(imgData.data.buffer);
  const bw = new Uint8ClampedArray(buf32.length);

  for (let i = 0; i < buf32.length; i++) {
      const r = buf32[i] & 0xff;
      const g = buf32[i] >> 8 & 0xff;
      const b = buf32[i] >> 16 & 0xff;
      bw[i] = (r + g + b) / 3;
  }

  const wav = new WaveFile();
  wav.fromScratch(1, 44100, '8', bw);
  const buf = wav.toBuffer();

  return {
    data: Buffer.from(buf),
    name: `${w}x${h}`,
    ext: 'wav',
  };
}

async function snd2img(text, message, currentOutput) {
  if (currentOutput.data) {
    const data = currentOutput.data;

    let mp3TrimArgs = [];
    if (data.ext === 'mp3') {
      mp3TrimArgs = ['trim', '1105s'];
    }

    // convert to wav
    const buf = await sox(data.data, [
      // input
      '-t', data.ext, '-',
      // output
      '-t', 'wav', '-b', '8', '-',
      ...mp3TrimArgs,
    ]);

    const wav = new WaveFile();
    wav.fromBuffer(buf);

    let [w, h] = (data.name || '').split('x');
    w = parseInt(w, 10);
    h = parseInt(h, 10);
    if (!w || !h) {
      w = 200;
      h = 200;
    }

    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const index = y * w + x;
        if (index >= wav.data.samples.length) {
          break;
        }
        const c = wav.getSample(index);
        ctx.fillStyle = `rgb(${c}, ${c}, ${c})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    return {
      data: canvas.toBuffer('image/png'),
      name: data.name,
      ext: 'png',
    };
  }
  return 'i need audio mate';
}

commands = { img2snd, snd2img };
