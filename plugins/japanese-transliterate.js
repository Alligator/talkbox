const axios = require('axios');
const querystring = require('querystring');

async function japanese(text) {
  const resp = await axios.get(
    'https://apps.nolanlawson.com/jnameconverter-server/convert?' + querystring.stringify({ q: text }),
    { headers: {'User-Agent': 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.2 Safari/605.1.15' }},
  );
  const data = resp.data;
  if (!data.error) {
    return data.roomaji;
  }
}

commands = { japanese };
