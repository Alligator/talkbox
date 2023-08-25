const axios = require('axios');
const sharp = require('sharp');
const gm = require('gm');

const defaultConfig = {
  limit: 20,
  stickers: false,
};

async function getMostRecentImage(message, cfg = defaultConfig) {
  const prevMessages = await message.channel.messages.fetch({ limit: cfg.limit, before: message.id })
  const reversedMessages = prevMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp);

  let url;
  for (const [id, msg] of reversedMessages) {
    // maybe a bad assumption? if an attachment has a width it's an image
    if (msg.attachments.size && msg.attachments.some(a => a.width)) {
      url = msg.attachments.first().url;
      break;
    } else if (msg.embeds.length) {
      const embed = msg.embeds[0];
      if (embed.thumbnail) {
        url = embed.thumbnail.url;
        break;
      }
    } else if (cfg.stickers && msg.stickers.size > 0) {
      const sticker = msg.stickers.first();
      url = sticker.url;
      break;
    }
  }

  // fetch the image from the url
  const resp = await axios.get(url, { responseType: 'arraybuffer' });
  return resp.data;
}

async function getMostRecentSticker(message, cfg = defaultConfig) {
  const prevMessages = await message.channel.messages.fetch({ limit: cfg.limit, before: message.id })
  const reversedMessages = prevMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp);

  let url;
  for (const [id, msg] of reversedMessages) {
    if (msg.stickers.size > 0) {
      const sticker = msg.stickers.first();
      url = sticker.url;
      break;
    }
  }

  // fetch the image from the url
  const resp = await axios.get(url, { responseType: 'arraybuffer' });
  return resp.data;
}

// get an input either from input, or from recent messages
async function getImage(message, currentOutput) {
  let img;
  if (currentOutput.data) {
    img = currentOutput.data.data;
  } else {
    img = await getMostRecentImage(message);
    if (typeof img === 'string') {
      // error message
      return [false, img];
    }
  }
  return [true, img]
}

function resize(img, maxLength, nearestNeighbour = false) {
  return new Promise((resolve, reject) => {
    let resized = gm(img).resize(maxLength, maxLength);
    if (nearestNeighbour) {
      resized = resized.filter('point');
    }

    resized.toBuffer((err, buffer) => {
      if (err)
        reject(err);
      resolve(buffer);
    });
  });
}

function isAnimatedGif(img) {
  return img.slice(0, 6).toString() === 'GIF89a';
}

module.exports = { getMostRecentImage, getImage, resize, isAnimatedGif, getMostRecentSticker };
