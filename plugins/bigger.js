const sharp = require('sharp');
const axios = require('axios');
const getMostRecentImage = require('../plugins/utils/most-recent-image');

async function bigger(text, message) {
  const img = await getMostRecentImage(message);
  const s = sharp(img);
  const meta = await s.metadata();
  const result = await s
    .resize({
      width: meta.width,
      height: Math.floor(meta.height * 0.66),
      fit: 'fill',
    })
    .toFormat('png')
    .toBuffer();

  message.channel.send(new Attachment(result, 'wide.png'));
}
bigger._help = 'make the last image Bigger';

commands = { bigger };
