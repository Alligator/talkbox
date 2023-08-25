const axios = require('axios');
const cheerio = require('cheerio');

async function search(query) {
  let resp = await axios.get('https://freesound.org/search', { params: { q: query } });
  let $ = cheerio.load(resp.data);

  const files = $('.sound_filename a');
  const index = Math.floor(Math.random() * files.length);
  const file = $(files[index]);
  const url = `https://freesound.org${file.attr('href')}`;

  resp = await axios.get(url);
  log(resp.request.path);

  $ = cheerio.load(resp.data);
  const mp3url = $('.mp3_file').attr('href');
  if (!mp3url) {
    return 'no mp3 found :(';
  }

  const mp3 = await axios.get(mp3url, { responseType: 'arraybuffer' });
  return {
    data: mp3.data,
    ext: 'mp3',
  };
}

async function freesound(text) {
  if (text) {
    return search(text);
  }

  let attempts = 5;
  while (attempts > 0) {
    log('attempting to get freesound');
    attempts--;

    const resp = await axios.get('https://freesound.org/browse/random/');
    log(resp.request.path);

    const $ = cheerio.load(resp.data);
    const durationInMs = parseInt($('.duration').text(), 10);
    if (isNaN(durationInMs) || durationInMs > 20000) {
      continue;
    }

    const url = $('.mp3_file').attr('href');
    if (!url) {
      continue;
    }

    const mp3 = await axios.get(url, { responseType: 'arraybuffer' });
    return {
      data: mp3.data,
      ext: 'mp3',
    };
  }
  return 'giving up after 5 attempts to get a sound';
}

commands = { freesound };
