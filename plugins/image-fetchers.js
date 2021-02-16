const axios = require('axios');

function fetchFastestImage(imageUrls) {
  return new Promise((resolve, reject) => {
    const source = axios.CancelToken.source();
    const ct = source.token;
    const promises = imageUrls.map((url) =>
      new Promise((resolve, reject) =>
        // these promises only resolve never reject, so the race call below only gets successful requests
        axios.get(url, { cancelToken: ct, responseType: 'arraybuffer' })
        .then(resolve)
        .catch(() => null)));

    Promise.race(promises).then((result) => {
      source.cancel('cancelled');
      resolve(result);
    });
  });
}

async function imgsearch(text) {
  const images = await axios.get('https://api.qwant.com/api/search/images', {
    params: {
      count: 5,
      q: text,
      t: 'images',
      safesearch: 1,
      locale: 'en_US',
      uiv: 4,
      offset: Math.floor(Math.random() * 10),
    },
  });
  const imageUrls = images.data.data.result.items.map(img => img.media);
  const finalImage = await fetchFastestImage(imageUrls);
  return {
    data: finalImage.data,
    ext: 'jpg',
  };
}

commands = { imgsearch };
