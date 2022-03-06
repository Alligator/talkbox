const sharp = require('sharp');
const axios = require('axios');
const gm = require('gm');
const fs = require('fs');

async function filterImage(image, filterFn) {
  return new Promise(async (resolve, reject) => {
    const img = gm(image);
    const result = filterFn(img);
    result.toBuffer((err, buffer) => {
      if (err) {
        reject(err);
      }
      resolve(buffer);
    });
  });
}

const imgCommands = {
  negative: { fn: img => img.negative() },
  invert: { fn: img => img.negative() },
  blur: {
    args: ['fradius'],
    fn: (img, radius) => img.blur(radius),
  },
  charcoal: {
    args: ['ffactor'],
    fn: (img, factor) => img.charcoal(factor),
  },
  contrast: {
    args: ['fcontrast'],
    fn: (img, contrast) => img.contrast(contrast),
  },
  edge: {
    args: ['fradius'],
    fn: (img, radius) => img.edge(radius),
  },
  dither: {
    args: ['icolours'],
    fn: (img, colours) => img.colors(colours).dither(),
  },
  emboss: {
    args: ['fradius'],
    fn: (img, radius) => img.emboss(radius),
  },
  enhance: { fn: img => img.enhance() },
  flip: { fn: img => img.enhance() },
  monochrome: { fn: img => img.monochrome() },
  sharpen: {
    args: ['fradius'],
    fn: (img, radius) => img.sharpen(radius),
  },
  rotate: {
    args: ['idegrees'],
    fn: (img, degrees) => img.rotate('transparent', degrees).trim(),
  },
};

async function img(text, message, { data }) {
  const args = text.split(' ');
  const cmd = args[0];

  if (cmd in imgCommands) {
    const imgCommand = imgCommands[cmd];
    const parsedArgs = [];

    if (imgCommand.args) {
      for (let i = 0; i < imgCommand.args.length; i++) {
        const argSpec = imgCommand.args[i];

        if (i + 1 >= args.length) {
          throw {
            userError: true,
            message: `expected ${argSpec.slice(1)} argument to ${cmd}`,
          };
        }

        if (argSpec.startsWith('f')) {
          parsedArgs.push(parseFloat(args[i + 1]));
        } else if (argSpec.startsWith('i')) {
          parsedArgs.push(parseInt(args[i + 1], 10));
        }
      }
    }

    const result = await filterImage(data.data, img => imgCommand.fn(img, ...parsedArgs));
    return {
      data: result,
      ext: data.ext || 'png',
    };
  } else {
    return img._help;
  }
}

function overlay(text, message) {
  const gravity = text || 'center';
  return {
    type: 'compose',
    fn: async (a, b) => {
      const img1 = await sharp(a.data);
      const img1Meta = await img1.metadata();

      let img2 = await sharp(b.data);
      const img2Meta = await img2.metadata();

      // if img2 is larger than img1, resize it to be the same size
      if (img2.width > img1.width || img2.height > img1.height) {
        img2 = await img2
          .resize({
            width: img1Meta.width,
            height: img1Meta.height,
            fit: 'inside',
          });
      }
      const result = await img1
        .composite([{
          input: await img2.toBuffer(),
          gravity
        }])
        .toFormat('png')
        .toBuffer();

      return {
        data: result,
        ext: 'png',
      };
    },
  };
}
overlay._help = 'overlay [gravity] overlay two images. gravity can be "center" or a direction, e.g. "west" or "southeast".';

function blend(text, message) {
  const blend = text || 'screen';
  return {
    type: 'compose',
    fn: async (img1, img2) => {
      const img = await sharp(img1.data);
      const imgMeta = await img.metadata();

      const otherImg = await sharp(img2.data)
        .resize({
          width: imgMeta.width,
          height: imgMeta.height,
          fit: 'inside',
        })
        .toBuffer();

      const data = await img.composite([{
        input: otherImg,
        blend,
        premultiplied: true,
      }])
        .flatten()
        .toFormat('png')
        .toBuffer();

      return {
        data,
        ext: 'png',
      };
    },
  };
}
blend._help = 'blend [type]\nblend two iamges together.\n\ntype can be one of `clear`, `source`, `over`, `in`, `out`, `atop`, `dest`, `dest-over`, `dest-in`, `dest-out`, `dest-atop`, `xor`, `add`, `saturate`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `colour-dodge`, `color-dodge`, `colour-burn,color-burn`, `hard-light`, `soft-light`, `difference` and `exclusion`. the default is `screen`.';

function stack(text) {
  const position = text || 'below'
  return {
    type: 'compose',
    fn: async (img1Raw, img2Raw) => {
      const img1 = await sharp(img1Raw.data);
      const img1Meta = await img1.metadata();

      const img2 = await sharp(img2Raw.data);
      const img2Meta = await img2.metadata();

      switch (position) {
        case 'below': {
          const img2Resized = await img2.resize({
            width: img1Meta.width,
          }).toBuffer();

          // wtf sharp
          const img2Height = (await sharp(img2Resized).metadata()).height;

          const workspace = sharp({
            create: {
              width: img1Meta.width,
              height: img1Meta.height + img2Height,
              channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
          });

          const result = await workspace
            .composite([
              { input: (await img1.toBuffer()), gravity: 'north' },
              { input: img2Resized, gravity: 'south' }
            ])
            .toFormat('png')
            .toBuffer();

          return {
            data: result,
            ext: 'png',
          }
        }
        default: {
          return `unknown position ${position}`;
        }
      }
    },
  };
}

async function jpeg(text, message, currentOutput) {
  const quality = parseInt(text, 10) || 20;

  let inputImg;
  if (currentOutput.data) {
    inputImg = currentOutput.data.data;
  } else {
    inputImg = await getMostRecentImage(message);
    if (typeof inputImg === 'string') {
      // error message
      return inputImg;
    }
  }

  const buf = await sharp(inputImg)
    .toFormat('jpeg', { quality })
    .toBuffer();

  return { data: buf, ext: 'jpg' };
}

img._help = 'img command [args...] manipulate an image. possible commands:\n```' +
  Object.keys(imgCommands)
  .map((cmd) => {
    const args = (imgCommands[cmd].args || []).map((arg) => {
      const type = arg[0];
      const name = arg.slice(1);
      switch (type) {
        case 'f': return `${name}:float`;
        case 'i': return `${name}:int`;
        default: return name;
      }
    });
    return `${cmd} ${args.join(' ')}`;
  })
  .join('\n')
  + '```';

commands = { img, overlay, blend, stack, jpeg };
