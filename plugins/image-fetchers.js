const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const getMostRecentImage = require('../plugins/utils/most-recent-image');

function fetchFastestImage(imageUrls) {
  return new Promise((resolve, reject) => {
    const source = axios.CancelToken.source();
    const ct = source.token;
    const promises = imageUrls.map((url) =>
      new Promise((resolve, reject) =>
        // these promises only resolve never reject, so the race call below only gets successful requests
        axios.get(url, { cancelToken: ct, responseType: 'arraybuffer' })
        .then((resp) => {
          if (resp.headers['content-type'].startsWith('image')) {
            resolve(resp);
          }
        })
        .catch((e) => { throw e; })));

    Promise.race(promises).then((result) => {
      source.cancel('cancelled');
      resolve(result);
    });
  });
}

async function imgsearch(text) {
  const images = await axios.get('https://api.qwant.com/v3/search/images', {
    params: {
      count: 5,
      q: text,
      t: 'images',
      safesearch: 1,
      locale: 'en_US',
      uiv: 5,
      offset: Math.floor(Math.random() * 10),
    },
  });
  const imageUrls = images.data.data.result.items.map(img => img.media);
  const finalImage = await fetchFastestImage(imageUrls);
  log(finalImage.config.url);
  const resizedImg = await sharp(finalImage.data)
    .resize({
      width: 600,
    })
    .toFormat('jpg')
    .toBuffer();
  return {
    data: resizedImg,
    ext: 'jpg',
  };
}

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

function testImage() {
  const img = fs.readFileSync('plugins/test.png');
  return {
    data: img,
    ext: 'png',
  };
}

commands = { imgsearch, testImage, lastimage: lastImage, duck };
