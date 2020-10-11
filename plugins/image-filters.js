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

async function gun(text, message, currentOutput) {
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

  const guns = fs.readdirSync('plugins/guns')
    .filter(f => !f.startsWith('framed') && f.endsWith('.png'));
  const gunFile = guns[Math.floor(Math.random() * guns.length)];
  const gunData = fs.readFileSync(`plugins/guns/${gunFile}`);
  const gun = sharp(gunData);
  const gunMeta = await gun.metadata();
  const gunRatio = gunMeta.width / gunMeta.height;

  const img = sharp(inputImg);
  const imgMeta = await img.metadata();

  let gunBuf;
  if (gunFile.startsWith('framed-')) {
    // const resizedBuf = await gun.resize({
    //   height: imgMeta.height,
    //   fit: 'inside',
    // }).toBuffer();
    //
    // const resized = sharp(resizedBuf);
    // const meta = await resized.metadata();
    //
    // log(Math.abs(Math.floor((meta.width - imgMeta.width) / 2)));
    // log(imgMeta.width);
    // log(imgMeta.height);
    //
    // gunBuf = await resized.extract({
    //   top: 0,
    //   left: Math.floor((meta.width > imgMeta.width ? meta.width - imgMeta.width : imgMeta.width - meta.width) / 2),
    //   width: imgMeta.width,
    //   height: imgMeta.height,
    // }).toBuffer();
  } else {
    let size = Math.floor(Math.min(imgMeta.width / 3 , imgMeta.height / 3));
    size += Math.floor((size * gunRatio) / 3);

    gunBuf = await gun
      .resize({
        width: size,
        height: size,
        fit: 'inside',
        kernel: 'nearest',
      })
      .toBuffer();
  }

  const result = await img
    .composite([{
      input: gunBuf,
      gravity: gunFile.startsWith('centre-') || gunFile.startsWith('framed-') ? 'south' : 'southeast',
    }])
    .toFormat('png')
    .toBuffer();

  return {
    data: result,
    ext: 'png',
  };
}

img._help = 'img command [args...] manipulate an image. possible commands:\n```' +
  Object.keys(imgCommands)
  .map(cmd => `${cmd} ${(imgCommands[cmd].args || []).map(x => x.slice(1))}`)
  .join('\n')
  + '```';

commands = { img, overlay, gun, blend };
