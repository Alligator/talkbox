const { createCanvas, Image } = require('canvas');

const GLYPH_WIDTH = 64;
const GLYPH_HEIGHT = 56;
const GLYPH_MAP =
    ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[¥]^_'
  + '`abcdefghijklmnopqrstuvwxyz{|}~                                 ';
const GLYPH_MAP_WIDTH = 64;
const OUTPUT_GLYPH_WIDTH = 36;
const MAX_LINE_WIDTH = 40;

function deadlyPrem(text) {
  function drawString(ctx, img, text) {
    // wrap text
    const words = text.substring(0, 400).split(/ +/);
    const lines = [words[0]];

    words.slice(1).forEach((word) => {
      if (lines[lines.length - 1].length + word.length + 1 > MAX_LINE_WIDTH) {
        lines.push(word);
      } else {
        lines[lines.length - 1] += ` ${word}`;
      }
    });

    const longestLine = lines.reduce((longest, line) => Math.max(longest, line.length), 0);

    // draw glyphs
    const lightCanvas = createCanvas(longestLine * OUTPUT_GLYPH_WIDTH, lines.length * GLYPH_HEIGHT);
    const lightCtx = lightCanvas.getContext('2d');

    // DEBUG
    lines.forEach((line, lineIdx) => {
      const cy = lineIdx * GLYPH_HEIGHT;
      let cx = Math.floor((longestLine - line.length) / 2) * OUTPUT_GLYPH_WIDTH;
      line.split('').forEach((char) => {
        const idx = GLYPH_MAP.indexOf(char);
        if (idx >= 0) {
          const glyphX = (idx % GLYPH_MAP_WIDTH) * GLYPH_WIDTH;
          const glyphY = Math.floor(idx / GLYPH_MAP_WIDTH) * GLYPH_HEIGHT;
          lightCtx.drawImage(img, glyphX - 1, glyphY + 1, GLYPH_WIDTH - 2, GLYPH_HEIGHT - 1, cx, cy, GLYPH_WIDTH - 2, GLYPH_HEIGHT);
        }
        cx += OUTPUT_GLYPH_WIDTH;
      });
    });

    const invertedCanvas = createCanvas(lightCtx.canvas.width, lightCtx.canvas.height);
    const invertedCtx = invertedCanvas.getContext('2d');
    invertedCtx.drawImage(lightCtx.canvas, 0, 0);
    const imgData = invertedCtx.getImageData(0, 0, lightCtx.canvas.width, lightCtx.canvas.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      imgData.data[i] = 255 - imgData.data[i];
      imgData.data[i + 1] = 255 - imgData.data[i + 1];
      imgData.data[i + 2] = 255 - imgData.data[i + 2];
    }
    invertedCtx.putImageData(imgData, 0, 0);

    ctx.canvas.width = lightCanvas.width + 8;
    ctx.canvas.height = lightCanvas.height + 8;

    ctx.drawImage(invertedCanvas, 6, 6);
    ctx.drawImage(lightCanvas, 4, 4);

    ctx.restore();
  }

  return new Promise((resolve) => {
    const img = new Image();
    log('aaa');
    img.onload = () => {
      const canvas = createCanvas(100, 100);
      const ctx = canvas.getContext('2d');
      drawString(ctx, img, text);

      resolve({
        data: canvas.toBuffer('image/png'),
        ext: 'png',
      });
    }
    img.src = 'plugins/deadly-prem-font.png';
  });
}

commands = { deadlypremonition: deadlyPrem };
