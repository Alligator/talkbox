const { loadImage, createCanvas, registerFont } = require('canvas');
const { getImage } = require('../plugins/utils/image');

registerFont('plugins/fonts/Roboto-Medium.ttf', { family: 'Roboto' });

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function youtubeapology(text, message, currentOutput) {
  const [success, img] = await getImage(message, currentOutput);
  if (!success) {
    return img;
  }

  // preview is 210x118
  const imgw = 210;
  const imgh = 118;
  const imgmargin = 10;
  const w = imgw + (imgmargin * 2);
  const h = imgh + (imgmargin * 2) + 50;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.fillColor = 'black';
  ctx.fillRect(0, 0, w, h);

  // make a rounded clipping rectangle
  const radius = 5;
  roundRect(ctx, imgmargin, imgmargin, imgw, imgh, 5);
  ctx.save();
  ctx.clip();

  // draw the background image
  const backgroundImg = await loadImage(img);
  ctx.drawImage(backgroundImg, imgmargin, imgmargin, imgw, imgh);
  ctx.restore();


  // draw the lil time guy
  roundRect(ctx, imgmargin + imgw - 42, imgmargin + imgh - 22, 40, 18, 5);
  ctx.fillStyle = 'black';
  ctx.fill();

  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.font = '12px Roboto';
  ctx.fillText('48:32', imgmargin + imgw - 38, imgmargin + imgh - 13);

  // draw the text
  ctx.textBaseline = 'top';
  ctx.font = '14px Roboto';
  const msgs = [
    'we need to talk...',
    'i messed up',
    'I\'m Sorry',
  ];
  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  ctx.fillText(msg, imgmargin, imgh + imgmargin * 1.9);

  // views etc
  ctx.font = '12px Roboto';
  ctx.fillStyle = 'rgb(170, 170, 170)';
  const views = Math.floor(Math.random() * 800 + 30);
  const minsAgo = Math.floor(Math.random() * 45 + 10);
  ctx.fillText(`${views}k views • ${minsAgo} minutes ago`, imgmargin, imgh + imgmargin * 4.2);

  const buf =  canvas.toBuffer('image/png');
  return { data: buf, ext: 'png' };
}

commands = { youtubeapology };
