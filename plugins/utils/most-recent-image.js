const axios = require('axios');

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

module.exports = getMostRecentImage;
