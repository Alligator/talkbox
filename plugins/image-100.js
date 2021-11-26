const { createCanvas, registerFont } = require('canvas');

registerFont('plugins/fonts/Ranga-Bold.ttf', { family: 'Ranga' });

function bezier(t, p0, p1, p2, p3) {
  const cX = 3 * (p1.x - p0.x);
  const bX = 3 * (p2.x - p1.x) - cX;
  const aX = p3.x - p0.x - cX - bX;

  const cY = 3 * (p1.y - p0.y);
  const bY = 3 * (p2.y - p1.y) - cY;
  const aY = p3.y - p0.y - cY - bY;

  const x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
  const y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;
  return { x: x, y: y };
}

function oneHundred(text) {
  const canvas = createCanvas(110, 110);
  const ctx = canvas.getContext('2d');
  text = text.slice(0, 50);

  ctx.font = '56pt Ranga';

  const totalWidth = ctx.measureText(text).width;
  canvas.width = totalWidth + 20;
  canvas.height = (totalWidth / 8) +  110;

  ctx.strokeStyle = '#BC1331';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.fillStyle = '#BC1331';
  ctx.font = '56pt Ranga';
  ctx.textBaseline = 'middle';

  function underline(ctx, x, y, len) {
    ctx.beginPath()
    ctx.moveTo(x, y);
    const yOffset = len / 8;
    ctx.bezierCurveTo(
      // control point 1
      x + (len * 0.25), y - yOffset * 1.0,
      // control point 2
      x + (len * 0.75) + 10, y - yOffset * 1.2,
      // end
      x + len, y - yOffset,
    );
    ctx.stroke();
  }

  function draw(ctx, x, y, str) {
    const totalWidth = ctx.measureText(str).width;
    const yOffset = totalWidth / 8;

    let textX = x;
    let textY = y;
    let cx = textX;
    let cy = textY;
    const ty = cy - yOffset * 0.9;

    str.split('').forEach((char, i) => {
      const t = (cx - textX) / (totalWidth);
      cy = bezier(t,
        { x: textX, y: textY },
        { x: textX + (totalWidth * 0.2), y: textY - yOffset * 1.0 },
        { x: textX + (totalWidth * 0.8), y: textY - yOffset * 1.2 },
        { x: textX + totalWidth, y: ty },
      ).y;

      const metrics = ctx.measureText(char);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.min(-20 * (Math.PI / 180) * (1 - t), -0.1));
      ctx.fillText(char, 0, 0);
      cx += metrics.width;
      ctx.restore();
    });

    underline(ctx, x + 5, ctx.canvas.height - 25, totalWidth - 10);
    underline(ctx, x + 20, ctx.canvas.height - 10, totalWidth - 35);
  }

  draw(ctx, 5, ctx.canvas.height - 60, text);

  const buf =  canvas.toBuffer('image/png');
  return { data: buf, ext: 'png' };
}

commands = { '100': oneHundred };
