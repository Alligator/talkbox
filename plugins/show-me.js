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
  await message.react('\uD83C\uDDEB');
  await message.react('\uD83C\uDDFA');
  await message.react('\uD83C\uDDE8');
  await message.react('\uD83C\uDDF0');
}

async function tea(match, message) {
  await message.react('\u2615');
}

showMe._regex = /computer, (?:show me|scroll up) (?:a )?(.*)/;
thanks._regex = /((thank you)|(thanks)),? computer/;
bad._regex = /bad? computer/;
tea._regex = /computer, tea, earl grey, hot/;
