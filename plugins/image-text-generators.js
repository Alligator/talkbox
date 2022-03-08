const fs = require('fs');
const { registerFont, createCanvas, Image } = require('canvas');
const { textWrap } = require('../plugins/utils/text-wrap');

function createTextGenerator(font, lineHeight, opts = {}) {
  const padding = 4;

  return (text, message, currentOutput) =>  {
    let leftAlign = false
    let rightAlign = false;
    let finalText = (currentOutput.rawArgs || text)
      .replace(/```/g, '');

    if (finalText.includes('-left')) {
      finalText = finalText.replace(/-left ?/, '');
      leftAlign = true;
    } else if (finalText.includes('-right')) {
      finalText = finalText.replace(/-right ?/, '');
      rightAlign = true;
    }

    const { lines } = textWrap(finalText, 30);

    const height = lines.length * lineHeight;
    const canvas = createCanvas(100, height);
    const ctx = canvas.getContext('2d');

    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    let metrics;
    lines.forEach((line) => {
      const m = ctx.measureText(line);
      if (!metrics || m.width > metrics.width) {
        metrics = m;
      }
    });

    ctx.canvas.width = metrics.width + (padding * 2);
    ctx.font = font;
    ctx.textBaseline = 'middle';

    if (leftAlign) {
      ctx.textAlign = 'left';
    } else if (rightAlign) {
      ctx.textAlign = 'right';
    } else {
      ctx.textAlign = 'center';
    }

    ctx.fillStyle = 'white';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (leftAlign) {
        ctx.fillText(line, padding / 2, i * lineHeight + (lineHeight / 2));
      } else if (rightAlign) {
        ctx.fillText(line, ctx.canvas.width - padding / 2, i * lineHeight + (lineHeight / 2));
      } else {
        ctx.fillText(line, metrics.width / 2 + padding, i * lineHeight + (lineHeight / 2));
      }
    }

    if (opts.postProcess) {
      opts.postProcess(ctx);
    }

    const buf =  canvas.toBuffer('image/png');
    return { data: buf, ext: 'png' };
    // message.channel.send(new Attachment(buf, 'papyrus.png'));
    // fs.writeFileSync('/var/www/vcr.png', buf);
  };
}

function vcrNoise(ctx) {
  log('vcr start');
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const newImageData = ctx.createImageData(ctx.canvas.width, ctx.canvas.height);
  const buf32 = new Uint32Array(imageData.data.buffer);
  const newBuf32 = new Uint32Array(newImageData.data.buffer);

  // const idxForCoords = (x, y) => y * (imageData.width * 4) + x * 4;
  const satMul8 = ((x, y) => {
    const res = (x * y);
    const hi = res >> 8;
    if (hi > 0) return 0xff;
    return res;
  });

  const w = imageData.width;
  const h = imageData.height;
  const r = Math.random();

  // 3x3 gaussian blur
  for (let i = 0; i < buf32.length; i++) {
    const pixels = [
      [i - 1, 0.118318],
      [i + w - 1, 0.0947416],
      [i - w - 1, 0.0947416],

      [i + 1, 0.118318],
      [i + w + 1, 0.0947416], 
      [i - w + 1, 0.0947416],  

      [i + w, 0.118318],
      [i - w, 0.118318],
      [i, 0.147761],
    ];

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let aSum = 0;

    for (let p = 0; p < pixels.length; p++) {
      const [idx, weight] = pixels[p];
      rSum += (newBuf32[idx] & 0xff) * weight;
      gSum += (newBuf32[idx] >> 8 & 0xff) * weight;
      bSum += (newBuf32[idx] >> 16 & 0xff) * weight;
      aSum += (newBuf32[idx] >> 24 & 0xff) * weight;
    }

    newBuf32[i] = 
      aSum << 24
    | bSum << 16
    | gSum << 8
    | rSum;
  }

  for (let i = 0; i < buf32.length; i++) {
    const y = Math.floor(i / w);
    const x = i - y;
    let offsetX = 0;

    const o = Math.sin(1 - Math.tan(y * 0.1 + r));
    offsetX += Math.floor(o);

    const brightnessOffset = 1 - Math.sin(y / 0.7) / 7;

    const offsetR = 2;
    const offsetG = 2;

    const rIdx = Math.floor(i + offsetX + offsetR);
    const gIdx = Math.floor(i + offsetX - offsetG);

    const offsetIdx = Math.floor(i + offsetX);

    newBuf32[i] =
      (buf32[i] >> 24) << 24
      | satMul8((buf32[offsetIdx] >> 16 & 0xff), brightnessOffset) << 16
      | satMul8((buf32[gIdx] >> 8 & 0xff), brightnessOffset) << 8
      | satMul8((buf32[rIdx] & 0xff), brightnessOffset);
  }

  log('vcr end');
  ctx.putImageData(newImageData, 0, 0);
  return ctx;
}

const vcrGen = createTextGenerator('30pt VCR OSD Mono', 34, { postProcess: vcrNoise });

async function vcr(text, message, currentOutput) {
  if (text && text.length) {
    return vcrGen(text, message, currentOutput);
  }

  if (currentOutput && currentOutput.data) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        vcrNoise(ctx);
        const buf =  canvas.toBuffer('image/png');
        resolve({ data: buf, ext: 'png' });
      };
      img.src = currentOutput.data.data;
    });
  }
}

function darkSouls(text, message, currentOutput) {
  const padding = 16;
  const lineHeight = 50;
  let finalText = (currentOutput.rawArgs || text)
    .replace(/```/g, '');

  const height = lineHeight;
  const canvas = createCanvas(100, height);
  const ctx = canvas.getContext('2d');

  ctx.font = '34pt Garamond';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  const metrics = ctx.measureText(text);

  ctx.canvas.width = metrics.width + (padding * 2) + 20;
  ctx.font = '34pt Garamond';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'white';

  ctx.fillText(text, ctx.canvas.width / 2, ctx.canvas.height / 2);

  let alpha = 0;
  let alphaDelta = 0;
  for (let i = 0; i < ctx.canvas.width; i++) {
    if (i < 20) {
      alpha += 0.05;
    } else if (i > (ctx.canvas.width - 20)) {
      alpha -= 0.05;
    } else if (i % 5 === 0) {
      if (Math.random() > 0.25) {
        alphaDelta = 0.08;
      } else {
        alphaDelta = -0.08;
      }
      alpha = Math.max(Math.min(alpha + alphaDelta, 0.9), 0.3);
    }

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
    ctx.fillRect(i, lineHeight - 10, 1, 1);

    ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.75).toFixed(2)})`;
    ctx.fillRect(i, lineHeight - 9, 1, 1);
  }

  const finalCanvas = createCanvas(canvas.width * 0.9, canvas.height);
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.drawImage(canvas, 0, 0, finalCanvas.width, finalCanvas.height);

  const buf =  finalCanvas.toBuffer('image/png');
  return { data: buf, ext: 'png' };
}

registerFont('plugins/fonts/papyrus.ttf', { family: 'Papyrus' });
registerFont('plugins/fonts/VCR_OSD_MONO_1.001.ttf', { family: 'VCR OSD Mono' });
registerFont('plugins/fonts/dpquake.ttf', { family: 'dpquake' });
registerFont('plugins/fonts/Omikron.TTF', { family: 'Omikron' });
registerFont('plugins/fonts/dark-souls.ttf', { family: 'Garamond' });

commands = {
  papyrus: createTextGenerator('20pt Papyrus', 32),
  vcr,
  vhs: vcr,
  quake: createTextGenerator('34pt dpquake', 70),
  omikronthenomadsoulbygamevisionaryandnotedabuserdavidcage: createTextGenerator('34pt Omikron', 50),
  darksouls: darkSouls,
};
