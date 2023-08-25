const { loadImage, createCanvas, registerFont } = require('canvas');

function ca(text) {
  let rule = parseInt(text, 10);

  if (isNaN(rule)) {
    rule = Math.floor(Math.random() * 255);
  }

  if (rule < 0 || rule > 255) {
    return 'rule should be between 0 and 255';
  }

  log(`ca rule: ${rule}`);

  const width = 200;
  const height = 200;
  let cells = new Array(width);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // fill the first row
  for (let i = 0; i < width; i++) {
    cells[i] = Math.round(Math.random());
  }

  for (let y = 0; y < height; y++) {
    const ncells = new Array(width);
    cells.forEach((cell, i) => {
      let patt = i === 0 ? '0' : cells[i - 1].toString();
      patt += cell.toString();
      patt += i === (width - 1) ? '0' : cells[i + 1].toString();

      let c = 0;
      if ((rule & 2**parseInt(patt, 2)) > 0) {
        c = 1;
      }
      ncells[i] = c;

      ctx.fillStyle = c === 1 ? 'black' : 'white';
      ctx.fillRect(i, y, 1, 1);
    });
    cells = ncells;
  }

  return {
    ext: 'png',
    data: canvas.toBuffer('image/png'),
  };
}

commands = { ca };
