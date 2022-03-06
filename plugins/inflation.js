const axios = require('axios');

async function inflation(text) {
  const args = text.split(' ');
  if (args.length < 2) {
    return;
  }

  const year = parseInt(args[0], 10);
  if (isNaN(year)) {
    return 'u sure that\'s a year?';
  }

  const amt = parseFloat(args[1]);
  if (isNaN(amt)) {
    return 'u sure that\'s a number?';
  }

  const endYear = new Date().getFullYear();

  let country = 'united-states';
  switch ((args[2] || '').toLowerCase()) {
    case 'gbp':
      country = 'united-kingdom';
      break;
    case 'eur':
      country = 'eurozone';
      break;
  }

  const url = `https://www.statbureau.org/calculate-inflation-price-json?country=${country}&start=${year}/01/01&end=${endYear}/06/01&amount=${amt}`
  const resp = await axios.get(url);
  return resp.data;
}

inflation._help = 'inflation - year amount [gbp]';

commands = { inflation };
