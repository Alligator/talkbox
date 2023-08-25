const { createCanvas, registerFont } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const { wrapTextForCanvas } = require('../plugins/utils/text-wrap');

registerFont('plugins/fonts/Warpaint.ttf', { family: 'Warpaint' });

const margin = 20;
const lineSpacing = 10;
const fontSize = 24;

function steal(text) {
  const width = 500;
  const height = 225;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.font = `${fontSize * 2}pt Warpaint`;
  const lines = wrapTextForCanvas(ctx, text, ctx.canvas.width - margin);

  let maxWidth = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line);
    maxWidth = Math.max(maxWidth, metrics.width);
  }

  const metrics = ctx.measureText('H');
  const lineHeight = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);

  canvas.width = maxWidth + margin;
  canvas.height = (lineHeight + lineSpacing * 2) * lines.length;

  const textCtx = getTextCtx(ctx, lines, 'Warpaint', lineHeight / 2);

  const encoder = new GIFEncoder(canvas.width, canvas.height);
  encoder.start();
  encoder.setDelay(100);
  encoder.setRepeat(0);
  encoder.setTransparent(true);

  let zoom = true;
  for (let i = 0; i < 20; i++) {
    const x = Math.cos(i * 4) * 0.5;
    const y = Math.sin(i * 3) * 0.5;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (i % 8 === 0) {
      zoom = !zoom;
      if (zoom) {
        const zoomLevel = 0.9 + (1 + Math.sin(i * 3)) * 0.05;
        ctx.translate(
           0 -((canvas.width * zoomLevel) - canvas.width) / 2,
           0 -((canvas.height * zoomLevel) - canvas.height) / 2,
        );
        ctx.scale(zoomLevel, zoomLevel);
      } else {
        ctx.resetTransform();
      }
    }

    ctx.drawImage(textCtx.canvas, x, y, canvas.width, canvas.height);
    encoder.addFrame(ctx);

    i++;
  }

  encoder.finish();
  return { data: encoder.out.getData(), ext: 'gif' };
}

function getTextCtx(ogCtx, lines, font, lineHeight) {
  const width = ogCtx.canvas.width / 2;
  const height = ogCtx.canvas.height / 2;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.font = `${fontSize}pt ${font}`;

  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 3;
  ctx.textBaseline = 'top';

  ctx.miterLimit = 2;
  ctx.lineJoin = 'circle';

  let inc = 0;
  for (let i = 0; i < lines.length; i++) {
    ctx.font = `${fontSize}pt ${font}`;

    const line = lines[i];
    const lineMetrics = ctx.measureText(line);
    const xOffset = (ctx.canvas.width - lineMetrics.width) / 2;
    let x = margin / 2;

    for (const word of line.split(' ')) {
      const adjustedFontSize = fontSize - Math.floor((1 - Math.sin(inc * 2)) * (fontSize / 4));
      const yOffset = Math.min(1 + Math.cos(inc * 3) * (fontSize / 16), lineSpacing);
      ctx.font = `${adjustedFontSize}pt ${font}`;
      const wordMetrics = ctx.measureText(word + ' ');
      ctx.strokeText(word, x + xOffset, i * (lineHeight + lineSpacing) + yOffset);
      ctx.fillText(word, x + xOffset, i * (lineHeight + lineSpacing) + yOffset);
      x += wordMetrics.width;
      inc += Math.PI/3;
    }
  }

  return ctx;
}

commands = { steal };
