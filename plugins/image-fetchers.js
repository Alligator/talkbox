const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const imgsearch = require('../plugins/utils/imgsearch');
const { getMostRecentImage, getMostRecentSticker } = require('../plugins/utils/image');

async function lastImage(text, message) {
  const img = await getMostRecentImage(message);
  return { data: img, ext: 'png' };
}

async function lastSticker(text, message) {
  const img = await getMostRecentSticker(message);
  return { data: img, ext: 'png' };
}

async function tingle() {
  const img = await fs.readFile('plugins/tingle.png');
  return {
    data: img,
    ext: 'png',
  };
}

async function slice() {
  const img = await fs.readFile('plugins/bread.gif');
  return {
    data: img,
    ext: 'gif',
  };
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

async function travel() {
  const files = await fs.readdir('plugins/travel-posters/small');
  const file = files[Math.floor(Math.random() * files.length)];
  const img = await fs.readFile(path.join('plugins', 'travel-posters', 'small', file));
  return {
    data: img,
    ext: 'jpg',
  }
}

async function testImage() {
  const img = await fs.readFile('plugins/test.png');
  return {
    data: img,
    ext: 'png',
  };
}

testImage._channels = ['368082254871658503'];

commands = {
  imgsearch,
  testImage,
  lastimage: lastImage,
  laststicker: lastSticker,
  duck,
  y2k,
  tingle,
  slice,
  travel,
};
