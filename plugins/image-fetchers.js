const axios = require('axios');
const fs = require('fs');
const imgsearch = require('../plugins/utils/imgsearch');
const getMostRecentImage = require('../plugins/utils/most-recent-image');

async function lastImage(text, message) {
  const img = await getMostRecentImage(message);
  return { data: img, ext: 'png' };
}

async function duck() {
  const img = await axios.get('https://random-d.uk/api/v2/randomimg', { responseType: 'arraybuffer' })
  const contentType = img.headers['content-type'];
  const ext = contentType.replace('image/', '');
  return { data: img.data, ext };
}

const y2kUrls = require('../plugins/y2k-urls.json');
async function y2k() {
  const url = y2kUrls[Math.floor(Math.random() * y2kUrls.length)];
  const img = await axios.get(url, { responseType: 'arraybuffer' })
  const contentType = img.headers['content-type'];
  const ext = contentType.replace('image/', '');
  return { data: img.data, ext };
}

function testImage() {
  const img = fs.readFileSync('plugins/test.png');
  return {
    data: img,
    ext: 'png',
  };
}

commands = { imgsearch, testImage, lastimage: lastImage, duck, y2k };
