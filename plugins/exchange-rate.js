const axios = require('axios');
const util = require('util');

const BASE_CURRENCY = 'EUR';
let currencies = {};
let lastFetched = null;

// initial fetch
fetchCurrencies();

async function fetchCurrencies() {
  const now = new Date().getTime();

  // fetch once every 24 hours
  if (lastFetched !== null && now - lastFetched < (1000 * 60 * 60 * 24)) {
    return currencies
  } else {
    log('fetching currencies');
    const resp = await axios.get('https://api.exchangeratesapi.io/latest');
    lastFetched = new Date().getTime();
    currencies = resp.data;
    currencies.rates[BASE_CURRENCY] = 1;
    return currencies
  }
}

async function getRate(from, to) {
  return new Promise(async (resolve, reject) => {
    const cur = await fetchCurrencies();
    if (!cur || !cur.rates) {
      reject('no currencies loaded');
      return;
    }

    const fromRate = cur.rates[from.toUpperCase()];
    const toRate = cur.rates[to.toUpperCase()];

    if (typeof fromRate === 'undefined') {
      reject(`unknown currency ${from}`);
      return;
    } else if (typeof toRate === 'undefined') {
      reject(`unknown currency ${to}`);
      return;
    }

    resolve(toRate/fromRate);
  });
}

async function exchangerate(text) {
  const args = text.split(' ');
  if (args.length !== 3) {
    return exchangerate._help;
  }

  const [amount, from, to] = args;
  const parsedAmount = parseInt(amount, 10);

  if (!parsedAmount) {
    return exchangerate._help;
  }

  try {
    const rate = await getRate(from, to);
    return `${amount} ${from.toUpperCase()} = ${(parsedAmount * rate).toFixed(2)} ${to.toUpperCase()}`;
  } catch (e) {
    return `uh oh: ${e}`;
  }
}

exchangerate._help = 'exchangerate amount FROM TO - convert amount between currencies';

commands = { exchangerate };