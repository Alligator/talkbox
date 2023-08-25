const sharp = require('sharp');
const fs = require('fs');
const { getImage } = require('../plugins/utils/image');

async function jeb(text, message, currentOutput) {
  const [ok, img] = await getImage(message, currentOutput);
  if (!ok) {
    return img;
  }

  let jeb = sharp(fs.readFileSync('plugins/jeb.png'));
  if (text === 'solo') {
    return {
      data: jeb,
      ext: 'png',
    };
  }

  const jebMeta = await jeb.metadata();

  const bg = await sharp(img);
  const bgMeta = await bg.metadata();

  jeb = await jeb
    .resize({
      width: Math.floor(bgMeta.width * 0.75),
      fit: 'inside',
    });

  let gravity = 'southwest';
  if (text === 'reverse') {
    jeb = await jeb.flop();
    gravity = 'southeast';
  }

  const result = await bg
    .composite([{
      input: await jeb.toBuffer(),
      gravity,
    }])
    .toFormat('jpg')
    .toBuffer();

  return {
    data: result,
    ext: 'jpg',
  };
}

commands = { jeb }
