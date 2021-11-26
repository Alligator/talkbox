const imgsearch = require('../plugins/utils/imgsearch');

async function showMe(match, message) {
  const img = await imgsearch(match[1]);
  const attachment = new Discord.MessageAttachment(
    img.data,
    `computer.${img.ext}`,
  );
  message.reply({ files: [attachment] });
}

showMe._regex = /computer, show me (?:a )?(.*)/;
