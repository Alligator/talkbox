const fs = require('fs');
const { registerFont, createCanvas, Image } = require('canvas');
const textWrap = require('../plugins/utils/text-wrap');

function createTextGenerator(font, lineHeight, postProcess) {
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

    const { lines, longestLine } = textWrap(finalText, 30);

    const height = lines.length * lineHeight;
    const canvas = createCanvas(100, height);
    const ctx = canvas.getContext('2d');

    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    const metrics = ctx.measureText(longestLine);

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

    if (postProcess) {
      postProcess(ctx);
    }

    const buf =  canvas.toBuffer('image/png');
    return { data: buf, ext: 'png' };
    // message.channel.send(new Attachment(buf, 'papyrus.png'));
    // fs.writeFileSync('/var/www/vcr.png', buf);
  };
}

function vcrNoise(ctx) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const newImageData = ctx.createImageData(ctx.canvas.width, ctx.canvas.height);

  const idxForCoords = (x, y) => y * (imageData.width * 4) + x * 4;

  const r = Math.random();

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      let offsetX = x;

      for (let i = 0; i < 0.71; i += 0.1313) {
        const o = Math.sin(1 - Math.tan(y * 0.8 * i + r));
        offsetX += Math.floor(o / 2);
      }

      const brightnessOffset = 1 - Math.sin(y / 0.9) / 7;

      const offsetR = 2.5;
      const offsetG = 2.5;

      const rIdx = idxForCoords(Math.round(offsetX + offsetR), y);
      const gIdx = idxForCoords(Math.round(offsetX - offsetG), y);

      const idx = idxForCoords(x, y);
      const offsetIdx = idxForCoords(offsetX, y);

      newImageData.data[idx]     = imageData.data[rIdx] * brightnessOffset;
      newImageData.data[idx + 1] = imageData.data[gIdx + 1] * brightnessOffset;
      newImageData.data[idx + 2] = imageData.data[offsetIdx + 2] * brightnessOffset;
      newImageData.data[idx + 3] = imageData.data[offsetIdx + 3] * brightnessOffset;

    }
  }

  // 3x3 gaussian blur
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const pixels = [
        [idxForCoords(x - 1, y), 0.118318],
        [idxForCoords(x - 1, y + 1), 0.0947416],
        [idxForCoords(x - 1, y - 1), 0.0947416],

        [idxForCoords(x + 1, y), 0.118318],
        [idxForCoords(x + 1, y + 1), 0.0947416], 
        [idxForCoords(x + 1, y - 1), 0.0947416],  

        [idxForCoords(x, y + 1), 0.118318],
        [idxForCoords(x, y - 1), 0.118318],
        [idxForCoords(x, y), 0.147761],
      ];

      const rSum = pixels.reduce((acc, [idx, weight]) => acc + newImageData.data[idx] * weight, 0);
      const gSum = pixels.reduce((acc, [idx, weight]) => acc + newImageData.data[idx + 1] * weight, 0);
      const bSum = pixels.reduce((acc, [idx, weight]) => acc + newImageData.data[idx + 2] * weight, 0);
      const aSum = pixels.reduce((acc, [idx, weight]) => acc + newImageData.data[idx + 3] * weight, 0);

      const idx = idxForCoords(x, y);

      newImageData.data[idx] = rSum;
      newImageData.data[idx + 1] = gSum;
      newImageData.data[idx + 2] = bSum;
      newImageData.data[idx + 3] = aSum;
    }
  }

  ctx.putImageData(newImageData, 0, 0);
  return ctx;
}

const vcrGen = createTextGenerator('30pt VCR OSD Mono', 34, vcrNoise);

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

registerFont('plugins/fonts/papyrus.ttf', { family: 'Papyrus' });
registerFont('plugins/fonts/VCR_OSD_MONO_1.001.ttf', { family: 'VCR OSD Mono' });
registerFont('plugins/fonts/dpquake.ttf', { family: 'dpquake' });

// createTextGenerator('30pt VCR OSD Mono', vcrNoise)('ISNT IT FUNNY HOW WHENEVER A PARTY SEEMS TO BE WINDING DOWN AT SOMEBODYS HOUSE, YOU CAN ALWAYS KEEP IT GOING BY TALKING A LOT AND EATING AND DRINKING WHATEVERS LEFT.');

commands = {
  papyrus: createTextGenerator('20pt Papyrus', 30),
  vcr,
  quake: createTextGenerator('34pt dpquake', 70),
};
