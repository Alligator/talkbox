const imgsearch = require('../plugins/utils/imgsearch');

async function showMe(match, message) {
  const img = await imgsearch(match[1]);
  const attachment = new Discord.MessageAttachment(
    img.data,
    `computer.${img.ext}`,
  );
  message.reply({ files: [attachment] });
}

function thanks(match, message) {
  message.react('😉');
}

async function bad(match, message) {
  await message.react('\uD83C\uDDEE');
  await message.react('\uD83C\uDDF2');
  await message.react('\uD83C\uDDF8');
  await message.react('\uD83C\uDDF4');
  await message.react('\uD83C\uDDF7');
  await message.react('\uD83C\uDDFE');
}

async function tea(match, message) {
  await message.react('\u2615');
}

showMe._regex = /computer,? (?:show me|scroll up) (?:a )?(.*)/i;
thanks._regex = /((thank you)|(thanks)),? computer/;
bad._regex = /bad? computer/;
tea._regex = /computer, tea, earl grey, hot/;
