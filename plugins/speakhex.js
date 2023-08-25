const TEN = 0x10;
const A_HUNDRED = 0x100;
const A_THOUSAND = 0x1000;
const A_MILLION = 0x1000000;

const lt20 = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ann', 'bet', 'christ', 'dot', 'ernest', 'frost', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'annteen', 'betteen', 'christeen', 'dotteen', 'ernesteen', 'frosteen'];

const lt100 = ['0', '10', 'twenty', 'thirty', 'fourty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'annty', 'betty', 'christy', 'dotty', 'ernesty', 'frosty'];

function speakhex(text) {
  const num = parseInt(text, 16);
  if (isNaN(num)) {
    return 'doesn\'t look like a hex number mate';
  }

  if (num >= A_MILLION) {
    return 'too big mate';
  }
  if (num < 0) {
    return 'too small mate';
  }

  const words = [];
  let left = num;
  let iterations = 0;

  while (left && iterations < 20) {
    if (left < 0x20) {
      words.push(lt20[left]);
      break;
    } else if (left < A_HUNDRED) {
      const ones = lt20[left % TEN];
      const tens = lt100[Math.floor(left / TEN)];
      if (words.length > 0) {
        words.push('and');
      }
      words.push(tens);
      if (ones != 'zero') {
        words.push(ones);
      }
      break;
    } else if (left < A_THOUSAND) {
      words.push(lt20[Math.floor(left / A_HUNDRED)]);
      words.push('hundred');
      left = left % A_HUNDRED;
    } else if (left < A_MILLION) {
      words.push(speakhex(Math.floor(left / A_THOUSAND).toString(16)));
      words.push('thousand');
      left = left % A_THOUSAND;
    } else {
      return '???';
    }
    iterations++;
  }

  return words.join(' ');
}

commands = { hexspeak: speakhex };
