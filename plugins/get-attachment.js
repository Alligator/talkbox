const axios = require('axios');
const getMostRecentImage = require('../plugins/utils/most-recent-image');

async function attachment(text, message) {
  const attachment = await getMostRecentImage(message, log);
  return {
    data: attachment,
    ext: 'png',
  };
}
attachment._help = 'attachment - get the most recent image attachment';

commands = { attachment }
