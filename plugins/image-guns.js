const fs = require('fs');
const sharp = require('sharp');
const gm = require('gm');
const { getMostRecentImage } = require('../plugins/utils/image');

async function gun(text, message, currentOutput) {
  const guns = fs.readdirSync('plugins/guns')
    .filter(f => f.endsWith('.png'));
  const gunFile = guns[Math.floor(Math.random() * guns.length)];
  return await renderGun(gunFile, text, message, currentOutput);
}

async function paw(text, message, currentOutput) {
  const gunFile = 'centre-rott-3.png';
  return await renderGun(gunFile, text, message, currentOutput);
}

async function renderGun(gunFile, text, message, currentOutput) {
  let inputImg;
  if (currentOutput.data) {
    inputImg = currentOutput.data.data;
  } else {
    inputImg = await getMostRecentImage(message);
    if (typeof inputImg === 'string') {
      // error message
      return inputImg;
    }
  }

  const gunData = fs.readFileSync(`plugins/guns/${gunFile}`);
  const gun = sharp(gunData);
  const gunMeta = await gun.metadata();
  const gunRatio = gunMeta.width / gunMeta.height;

  const img = sharp(inputImg);
  const imgMeta = await img.metadata();

  const leftHanded = Math.random() > 0.9;
  const centered = gunFile.startsWith('centre-');

  let size = Math.floor(Math.min(imgMeta.width / 3 , imgMeta.height / 3));
  size += Math.floor((size * gunRatio) / 3);

  const gunBuf = await gun
    .resize({
      width: size,
      height: size,
      fit: 'inside',
      kernel: 'nearest',
    })
    .flop(!centered && leftHanded)
    .toBuffer();

  const result = await img
    .composite([{
      input: gunBuf,
      gravity: centered || gunFile.startsWith('framed-') ? 'south' : (leftHanded ? 'southwest' : 'southeast'),
    }])
    .toFormat('png')
    .toBuffer();

  return {
    data: result,
    ext: 'png',
  };
}

commands = { gun, paw };
