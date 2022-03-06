const axios = require('axios');
const cheerio = require('cheerio');

async function userbar(text) {
  let imgUrl;
  if (text) {
    // search
    const src = await axios.get('https://www.userbars.be/search', { params: { search: text } });
    const $ = cheerio.load(src.data);
    const ubs = $('.ub').toArray();
    if (ubs.length === 0) {
      return 'no results';
    }
    const ub = ubs[Math.floor(Math.random() * ubs.length)];
    imgUrl = $(ub).attr('original');
  } else {
    // random
    const src = await axios.get('https://www.userbars.be/random');
    const $ = cheerio.load(src.data);
    imgUrl = $('.ub').first().attr('original');
  }
  const img = await axios.get(imgUrl, { responseType: 'arraybuffer' });
  const contentType = img.headers['content-type'];
  const ext = contentType.replace('image/', '');
  return {
    data: img.data,
    ext,
  };
}

commands = { userbar, usebar: userbar };
