const sharp = require('sharp');
const axios = require('axios');
const { getMostRecentImage } = require('../plugins/utils/image');

async function bigger(text, message, currentOutput) {
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

  const s = sharp(img);
  const meta = await s.metadata();

  let width = Math.floor(meta.width * 1.5);
  let height = meta.height;

  // if the image is wide change the height instead
  if (meta.width > 1000) {
    width = meta.width;
    height = Math.floor(meta.height * 0.666);
  }

  const result = await s
    .resize({
      width,
      height,
      fit: 'fill',
    })
    .toFormat('png')
    .toBuffer();

  return { data: result, ext: 'png' };
}
bigger._help = 'make the last image Bigger';

commands = { bigger };
