const sharp = require('sharp');
const axios = require('axios');
const getMostRecentImage = require('../plugins/utils/most-recent-image');

async function bigger(text, message) {
  const img = await getMostRecentImage(message);
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

  message.channel.send(new Attachment(result, 'wide.png'));
}
bigger._help = 'make the last image Bigger';

commands = { bigger };
