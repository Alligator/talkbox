const axios = require('axios');

async function getMostRecentImage(message) {
  const prevMessages = await message.channel.fetchMessages({ limit: 20, before: message.id })
  const reversedMessages = prevMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp);

  let url;
  for (const [id, msg] of reversedMessages) {
    // maybe a bad assumption? if an attachment has a width it's an image
    if (msg.attachments.size && msg.attachments.exists(a => a.width)) {
      url = msg.attachments.first().url;
      break;
    } else if (msg.embeds.length) {
      const embed = msg.embeds[0];
      if (embed.thumbnail) {
        url = embed.thumbnail.url;
        break;
      }
    }
  }

  // fetch the image from the url
  const resp = await axios.get(url, { responseType: 'arraybuffer' });
  return resp.data;
}

module.exports = getMostRecentImage;
