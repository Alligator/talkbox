const { loadImage, createCanvas, registerFont } = require('canvas');
const { getMostRecentImage } = require('../plugins/utils/image');
const config = require('../config.json');
const { wrapTextForCanvas } = require('../plugins/utils/text-wrap');

registerFont('plugins/fonts/tw-cen-mt-bold.ttf', { family: 'TW Cen MT' });

async function theatre(text) {
  const border = 16;
  const lineHeight = 40;
  const lineWidth = 400;
  const w = border * 2 + lineWidth;
  const h = border * 2 + lineHeight * 2;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // red bg
  ctx.fillStyle = 'rgb(192, 0, 0)';
  ctx.fillRect(0, 0, w, h);

  // dots
  ctx.fillStyle = 'yellow';
  ctx.shadowBlur = 3;
  ctx.shadowColor = 'yellow';
  const gridSize = 16;
  for (let x = 0; x < w; x += gridSize) {
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x + border/2, y + border/2, border * 0.25, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // white bg
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'white';
  ctx.fillRect(border, border, lineWidth, lineHeight * 2);

  // inside shadows
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(border, border, lineWidth, 4);

  ctx.fillStyle = 'black';
  ctx.font = '26pt TW Cen MT';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1;

  const drawLine = (line, y) => {
    ctx.save();

    ctx.beginPath();
    ctx.moveTo(border, y - 8.5);
    ctx.lineTo(border + lineWidth, y - 8.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(border, y + 8.5);
    ctx.lineTo(border + lineWidth, y + 8.5);
    ctx.stroke();

    ctx.shadowOffsetY = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.fillText(line, w/2, y);

    ctx.restore();
  };

  const lines = text.toUpperCase().split('\n');
  drawLine(lines[0] ?? '', border + lineHeight / 2);
  drawLine(lines[1] ?? '', border + lineHeight * 1.5);
  // for (let i = 0; i <= 18; i++) {
  //   const x = circleWidth + (w - circleWidth * 2) * (i / 18);
  //
  //   ctx.beginPath();
  //   ctx.arc(x, border/2, border * 0.4, 0, 2 * Math.PI);
  //   ctx.fill();
  //
  //   ctx.beginPath();
  //   ctx.arc(x, h - border/2, border * 0.4, 0, 2 * Math.PI);
  //   ctx.fill();
  // }

  const buf =  canvas.toBuffer('image/png');
  return { data: buf, ext: 'png' };
}

commands = { theatre };
