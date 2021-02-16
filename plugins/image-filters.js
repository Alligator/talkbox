const sharp = require('sharp');
const axios = require('axios');
const gm = require('gm');
const fs = require('fs');
const getMostRecentImage = require('../plugins/utils/most-recent-image');

async function filterImage(image, filterFn) {
  return new Promise(async (resolve, reject) => {
    const img = gm(image);
    const result = filterFn(img);
    result.toBuffer('PNG', (err, buffer) => {
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
      ext: 'png',
    };
  } else {
    return img._help;
  }
}

function overlay(text, message) {
  const gravity = text || 'centre';
  return {
    type: 'compose',
    fn: async (img1, img2) => {
      const img = await sharp(img1.data);
      const imgMeta = await img.metadata();

      const resizedImg = await sharp(img2.data)
        .resize({
          width: imgMeta.width,
          height: imgMeta.height,
          fit: 'inside',
        }).toBuffer();

      const result = await img
        .composite([{
          input: resizedImg,
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

function blend(text, message) {
  const blend = text.length ? text : 'screen';
  return {
    type: 'compose',
    fn: async (img1, img2) => {
      const img = await sharp(img1.data);
      const imgMeta = await img.metadata();

      const otherImg = await sharp(img2.data)
        .resize({
          width: imgMeta.width,
          height: imgMeta.height,
          fit: 'outside',
        })
        .extract({
          left: 0,
          top: 0,
          width: imgMeta.width,
          height: imgMeta.height,
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

img._help = 'img command [args...] manipulate an image. possible commands:\n```' +
  Object.keys(imgCommands)
  .map(cmd => `${cmd} ${(imgCommands[cmd].args || []).map(x => x.slice(1))}`)
  .join('\n')
  + '```';

commands = { img, overlay, blend };
