const { createCanvas, loadImage } = require('canvas');
const { getMostRecentImage } = require('../plugins/utils/image');

async function photocopy(text, message, currentOutput) {
  let img;
  if (currentOutput.data) {
    img = currentOutput.data.data;
  } else {
    img = await getMostRecentImage(message);
    if (typeof img === 'string') {
      // error message
      return img;
    }
  }

  const canvasImg = await loadImage(img);
  const inputCanvas = createCanvas(canvasImg.width, canvasImg.height);
  const inputCtx = inputCanvas.getContext('2d');
  // inputCtx.fillStyle = 'black';
  // inputCtx.fillRect(0, 0, canvasImg.width, canvasImg.height);
  inputCtx.drawImage(canvasImg, 0, 0);

  const outputCanvas = createCanvas(canvasImg.width, canvasImg.height);
  const ctx = outputCanvas.getContext('2d');

  const inputImgData = inputCtx.getImageData(0, 0, inputCanvas.width, inputCanvas.height);
  const inputBuf32 = new Uint32Array(inputImgData.data.buffer);

  const numSamples = inputCanvas.width * inputCanvas.height * 1.5;

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  const imgData = ctx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const buf32 = new Uint32Array(imgData.data.buffer);

  const smear = Math.floor(Math.random() * inputCanvas.width);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  // ctx.fillStyle = 'black';
  for (let i = 0; i < numSamples; i++) {
    const sampleX = Math.floor(Math.random() * inputCanvas.width);
    const sampleY = Math.floor(Math.random() * inputCanvas.height);
    const index = sampleY * inputCanvas.width + sampleX;
    const sample = inputBuf32[index];

    let smearAmt = ((inputCanvas.width - Math.abs(smear - sampleX)) / inputCanvas.width) * 48;

    const r = sample & 0xff;
    const g = (sample >> 8) & 0xff;
    const b = (sample >> 16) & 0xff;
    const a = (sample >> 24) & 0xff;

    let gray = Math.floor((r + g + b) / 3);
    if (a === 0) {
      // count transparent pixels as white
      gray = 255;
    }
    gray = Math.max(0, gray - Math.random() * smearAmt);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    let circleRadius = Math.ceil(gray / 255) * 1.25;
    if (gray < 127) {
      ctx.beginPath();
      ctx.arc(sampleX, sampleY, circleRadius, 0, 2 * Math.PI, false);
      ctx.fill();
    }
  }

  return { data: outputCanvas.toBuffer('image/jpeg'), ext: 'jpg' };
}

commands = { photocopy };
