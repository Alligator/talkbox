const { createCanvas, loadImage } = require('canvas');
const fonts = require('../plugins/doom-data.json');
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

commands = {
  doom: createCmd('doom-small'),
  doombig: createCmd('doom-bigfont'),
  doombigred: createCmd('doom-bigfont', 'red'),
  strife: createCmd('strife-bigfont'),
  entering,
};
