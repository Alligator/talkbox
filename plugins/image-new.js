const { createCanvas } = require('canvas');

function star(text) {
  const canvas = createCanvas(100, 100);
  const ctx = canvas.getContext('2d');

  const radius = 100;

  ctx.fillStyle = 'red';
  starPath(ctx, canvas.width/2, canvas.height/2, radius, 16);

  ctx.fillStyle = 'white';
  ctx.font = '16pt sans-serif';
  starText(ctx, canvas.width/2, canvas.height/2, radius, text);

  const buf =  canvas.toBuffer('image/png');
  return { data: buf, ext: 'png' };
}

function starPath(ctx, x, y, radius, points) {
  ctx.beginPath();

  for (let p = 0; p < points * 2; p++) {
    const radians = (p / (points * 2)) * (Math.PI * 2);
    const pr = p % 2 === 0 ? radius : radius * 0.8;
    const px = Math.cos(radians) * (pr / 2) + x;
    const py = Math.sin(radians) * (pr / 2) + y;

    ctx.lineTo(px, py);
  }

  ctx.fill();
}

function starText(ctx, x, y, radius, text) {
  ctx.save();

  // wrap lines
  const wrapped = wrapText(ctx, text, radius * 0.7);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText('H');
  let height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  height *= 1.3;

  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 8);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < wrapped.length; i++) {
    const ly = (i + 0.5) - (wrapped.length/2);
    console.log(ly);
    ctx.fillText(wrapped[i], 0, ly * height);
  }

  ctx.restore();
}

function wrapText(ctx, text, width) {
  const lines = [];
  let lastSpace = null;
  let lastLineEnd = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === ' ') {
      lastSpace = i;
    }

    const metrics = ctx.measureText(text.slice(lastLineEnd, i));
    if (metrics.width > width) {
      if (lastSpace === null) {
        // no space on the this line, split the word
        lines.push(text.slice(lastLineEnd, i-1));
        lastLineEnd = i-1;
        i++;
      } else {
        // split at last space and rewind to there
        lines.push(text.slice(lastLineEnd, lastSpace));
        lastLineEnd = lastSpace + 1; // eat the space
        i = lastLineEnd;
        lastSpace = null;
      }
    } else {
      i++;
    }
  }

  lines.push(text.slice(lastLineEnd));
  return lines;
}

commands = { 'new': star, star };