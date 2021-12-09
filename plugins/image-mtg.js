const { loadImage, createCanvas, registerFont } = require('canvas');
const getMostRecentImage = require('../plugins/utils/most-recent-image');
const config = require('../config.json');

registerFont('plugins/fonts/CrimsonPro-Bold.ttf', { family: 'Crimson_Bold' });
registerFont('plugins/fonts/CrimsonPro-Medium.ttf', { family: 'Crimson_Medium' });
registerFont('plugins/fonts/CrimsonPro-Italic.ttf', { family: 'Crimson_Italic' });

async function getMessages(message, count) {
  const prevMessages = await message.channel.messages.fetch({ limit: 10, before: message.id })
  const reversedMessages = prevMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp);

  const foundMessages = [];
  for (const [id, msg] of reversedMessages) {
    if (
      msg.attachments.size
      || msg.cleanContent.startsWith(config.leader)
    ) {
      continue;
    }

    foundMessages.push(msg);
    if (foundMessages.length === count) {
      break;
    }
  }

  return foundMessages;
}


function wrapText(ctx, text, width) {
  const lines = [];
  let lastSpace = null;
  let lastLineEnd = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === ' ') {
      lastSpace = i;
      console.log('found space!');
    }

    const metrics = ctx.measureText(text.slice(lastLineEnd, i));
    if (metrics.width > width) {
      if (lastSpace === null) {
        // no space on the this line, split the word
        lines.push(text.slice(lastLineEnd, i-1));
        lastLineEnd = i-1;
        i++;
      } else {
        // split at last space and rewind to there
        lines.push(text.slice(lastLineEnd, lastSpace));
        lastLineEnd = lastSpace + 1; // eat the space
        i = lastLineEnd;
        lastSpace = null;
      }
    } else {
      i++;
    }
  }

  lines.push(text.slice(lastLineEnd));
  return lines;
}

async function mtg(text, message, currentOutput) {
  const img = await getMostRecentImage(message, { limit: 100, stickers: true });
  const messages = await getMessages(message);

  if (messages.length < 3) {
    return 'couldn\'t find three messages';
  }

  messages.sort((a, b) => a.cleanContent.length - b.cleanContent.length);
  // shortest
  const title = messages[0];
  // longest
  const body = messages[messages.length - 1];
  // middle
  const footer = messages[Math.floor(messages.length / 2)];

  const template = await loadImage('plugins/mtg.png');
  const avatar = await loadImage(title.author.displayAvatarURL({ format: 'png' }));
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(template, 0, 0);

  // draw the background image
  const backgroundImg = await loadImage(img);
  ctx.drawImage(backgroundImg, 35, 68, 329, 242);

  const font = 'Crimson_Medium';
  const boldFont = 'Crimson_Bold';
  const italicFont = 'Crimson_Italic';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'black';

  // draw the title
  ctx.font = `16pt ${boldFont}`;
  ctx.fillText(title.cleanContent, 38, 58);

  // draw 'Instant'
  ctx.font = `14pt ${boldFont}`;
  ctx.fillText('Instant', 38, 340);
  ctx.drawImage(avatar, 340, 320, 20, 20);

  // draw the body text
  ctx.font = `12pt ${font}`;
  const lines = wrapText(ctx, body.cleanContent, 312);
  let y = 374;
  let i = 0;
  for (const line of lines) {
    ctx.fillText(line, 40, y);
    y += 16;
    if (i++ >= 4) {
      break;
    }
  }

  // dividing line
  ctx.fillRect(42, 445, 312, 1);

  // draw the footer
  ctx.font = `italic 12pt ${italicFont}`;
  const footerLines = wrapText(ctx, footer.cleanContent, 312);
  y = 465;
  i = 0;
  for (const line of footerLines) {
    ctx.fillText(line, 40, y);
    y += 16;
    if (i++ >= 2) {
      break;
    }
  }

  const buf =  canvas.toBuffer('image/png');
  return { data: buf, ext: 'png' };
}

commands = { mtg };
