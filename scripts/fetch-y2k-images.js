const cfg = require('../config.json');
const axios = require('axios');
const fs = require('fs');

async function fetchUrls() {
  let posts = [];
  let offset = 0;
  while (true) {
    console.log(`fetching offset ${offset}`);
    const resp = await axios.get(`https://api.tumblr.com/v2/blog/y2kaestheticinstitute.tumblr.com/posts/photo?api_key=${cfg.tumblr_api_key}&offset=${offset}`);
    const data = resp.data;

    if (!data.response.posts || data.response.posts.length === 0) {
      break;
    }

    data.response.posts.forEach((post) => {
      post.photos?.forEach((photo) => {
        posts.push(photo.original_size.url);
      });
    });
    offset += 20;
  }
  return posts;
}

fetchUrls().then((urls) => {
  fs.writeFileSync('../plugins/y2k-urls.json', JSON.stringify(urls));
});
