const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const fonts = require('../plugins/doom-data.json');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const gm = require('gm');
const { textWrap } = require('../plugins/utils/text-wrap');

const MAX_LINE_WIDTH = 40;

function png(canvas) {
  return { 
    data: canvas.toBuffer('image/png'),
    ext: 'png',
  };
}

async function render(fontName, text, opts = {}) {
  const cfg = fonts[fontName];
  const fontImg = await loadImage(`plugins/fonts/${cfg.image}`);
  const { lines } = textWrap(text, opts.noWrap? 100 : MAX_LINE_WIDTH);

  // figure out the max line width
  let maxLineWidth = 0;
  for (const line of lines) {
    let x = 0;
    for (const c of line) {
      const glyph = cfg.glyphs[c];
      x += glyph ? glyph.width : cfg.space_width;
    }
    maxLineWidth = Math.max(maxLineWidth, x);
  }

  const canvas = createCanvas(maxLineWidth, cfg.line_height * lines.length);
  const ctx = canvas.getContext('2d');

  let y = 0;

  for (const line of lines) {
    let x = 0;

    for (const c of line) {
      const glyph = cfg.glyphs[c];

      if (!glyph) {
        x += cfg.space_width;
        continue;
      }

      ctx.drawImage(fontImg,
        glyph.x, glyph.y,
        glyph.width, glyph.height,
        x + glyph.dx, y + glyph.dy,
        glyph.width, glyph.height,
      );

      x += glyph.width;
    }

    y += cfg.line_height;
  }

  if (opts.colour) {
    const colourCanvas = createCanvas(canvas.width, canvas.height);
    const cctx = colourCanvas.getContext('2d');
    cctx.drawImage(canvas, 0, 0);
    cctx.globalCompositeOperation = 'source-in';
    cctx.fillStyle = opts.colour;
    cctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(colourCanvas, 0, 0);
  }

  if (cfg.scale) {
    const scaledCanvas = createCanvas(canvas.width * cfg.scale, canvas.height * cfg.scale);
    const sctx = scaledCanvas.getContext('2d');
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
    return scaledCanvas;
  }

  return canvas;
}

function createCmd(fontName, colour) {
  return async (text) => {
    const canvas = await render(fontName, text.toUpperCase(), { colour });
    return png(canvas);
  };
}

async function entering(text) {
  const top = await render('doom-bigfont', 'ENTERING', { colour: 'red', noWrap: true });
  const name = await render('doom-bigfont', text.toUpperCase(), { noWrap: true });

  const width = Math.max(top.width, name.width);
  const canvas = createCanvas(width, top.height + name.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(top, (width - (top.width)) / 2, 0);
  ctx.drawImage(name, (width - (name.width)) / 2, top.height);

  return png(canvas);
}

function wrap(cfg, text, width) {
  const lines = [];

  const measure = (text) => {
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      const glyph = cfg.glyphs[text[i]]
      let cw = 0;

      if (!glyph) {
        cw = cfg.space_width;
      } else {
        cw = glyph.width;
      }

      width += cw;
    }
    return width;
  };

  let currentLine = ''

  const words = text.split(/ +/);
  for (const word of words) {
    if (measure(currentLine + word) < width) {
      currentLine += word + ' ';
    } else {
      currentLine = currentLine.slice(0, -1);
      lines.push(currentLine);
      currentLine = word + ' ';
    }
  }

  currentLine = currentLine.slice(0, -1);
  lines.push(currentLine);

  return lines;
}

async function finale(text) {
  const flats = fs.readdirSync('plugins/doom-flats')
    .filter(f => f !== 'SLIME16.png' && f.endsWith('.png'));

  const flatFile = flats[Math.floor(Math.random() * flats.length)];
  const flatImg = await loadImage(`plugins/doom-flats/${flatFile}`);

  const scale = 2;
  const w = 320 * scale;
  const h = 200 * scale;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const cfg = fonts['doom-small'];
  cfg.scale = scale;
  const fontImg = await loadImage(`plugins/fonts/${cfg.image}`);
  const lines = wrap(cfg, text.toUpperCase(), 300);

  // draw the bg
  for (let x = 0; x < 320; x += 64) {
    for (let y = 0; y < 200; y += 64) {
      ctx.drawImage(flatImg, x * scale, y * scale, 64 * scale, 64 * scale);
    }
  }

  // draw one letter to get the palette
  const glyph = cfg.glyphs['B'];
  ctx.drawImage(fontImg,
    glyph.x, glyph.y,
    glyph.width, glyph.height,
    10, 10,
    glyph.width, glyph.height,
  );

  const { data, width, height } = ctx.getImageData(0, 0, w, h);
  const palette = quantize(data, 256);

  // draw the bg once more to cover the letter
  ctx.drawImage(flatImg, 0, 0, scale * 64, scale * 64);

  function writeFrame(delay, w, h, x = 0, y = 0) {
    const indexed = applyPalette(ctx.getImageData(x, y, w, h).data, palette);
    encoder.writeFrame(indexed, w, h, { delay, dispose: 0, transparent: true, x, y });
  }

  const encoder = new GIFEncoder();
  const indexed = applyPalette(ctx.getImageData(0, 0, w, h).data, palette);
  encoder.writeFrame(indexed, w, h, { palette, delay: 285, dispose: 0, transparent: false });

  let x = 10;
  let y = 10;
  for (const line of lines) {
    for (const c of line) {
      const glyph = cfg.glyphs[c];

      if (!glyph) {
        x += cfg.space_width;
        continue;
      }

      ctx.drawImage(fontImg,
        glyph.x, glyph.y,
        glyph.width, glyph.height,
        (x + glyph.dx) * scale, (y + glyph.dy) * scale,
        glyph.width * scale, glyph.height * scale,
      );

      writeFrame(85, glyph.width * scale, glyph.height * scale,
        (x + glyph.dx) * scale,
        (y + glyph.dy) * scale,
      );
      x += glyph.width;
      ctx.clearRect(0, 0, w, h);
    }

    x = 10;
    y += 11;
  }

  writeFrame(4000, w, h);

  encoder.finish();
  const gif = new Buffer(encoder.bytes());
  log(`doomfinale ${gif.length / 1000} kB`);
  return { data: gif, ext: 'gif' };
}

commands = {
  doom: createCmd('doom-small'),
  doombig: createCmd('doom-bigfont'),
  doombigred: createCmd('doom-bigfont', 'red'),
  strife: createCmd('strife-bigfont'),
  entering,
  doomfinale: finale,
};
