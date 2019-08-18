const config = require('../config.json');
const { createCanvas }  = require('canvas');

function memory() {
  const memUsage = process.memoryUsage();
  const msg = Object.keys(memUsage)
    .map(key => `${key}: ${(memUsage[key] / 1024 / 1024).toFixed(2)}`)
    .join('\n');
  return 'memory usage:\n```' + new Date().toISOString() + '\n' + msg + '```';
}

function generatePng(data) {
  const max = Math.max.apply(Math, data);
  const min = Math.min.apply(Math, data);
  const height = 20;
  const width = 100;
  const xStep = Math.round(width / (data.length - 1));

  const c = x => {
    if (max - min === 0) {
      return 0;
    }
    const s = height / (max - min);
    return s * (x - min);
  };

  const canvas = createCanvas(width, height + 4);
  const ctx = canvas.getContext('2d');

  ctx.strokeStyle = 'white';

  ctx.beginPath();
  ctx.moveTo(0, c(data[0]) + 2);

  for (let i = 0; i < data.length; i++) {
    ctx.lineTo(i * xStep, c(data[i]) + 2);
  }

  ctx.stroke();

  /*
  let path = 'M0 ' + c(data[0]).toFixed(2);
  for (let i = 0; i < data.length; i++) {
    path += ' L ' + (i * xStep) + ' ' + c(data[i]).toFixed(2);
  }

  return `<svg width="${width}" height=${height}" transform="translate(0, 2)">
    <path d="${path}" fill="none" stroke="white"></path>
  </svg>`;
  */

  return canvas.createPNGStream();
}

let usageHistory = [];
let message = null;

async function memoryInterval(client) {
  // get memory usage
  const usage = process.memoryUsage();
  usageHistory.push(usage);

  if (usageHistory.length === 1) {
    return;
  }

  // make svg
  // const embed = new RichEmbed().setTitle('Memory Usage');
  const files = [
    {
      attachment: generatePng(usageHistory.map(u => u.rss)),
      name: `rss${usageHistory.length}.png`,
    },
    {
      attachment: generatePng(usageHistory.map(u => u.heapTotal)),
      name: 'heapTotal.png',
    },
    {
      attachment: generatePng(usageHistory.map(u => u.heapUsed)),
      name: 'heapUsed.png',
    },
    {
      attachment: generatePng(usageHistory.map(u => u.external)),
      name: 'external.png',
    },
  ];
  const embed = new RichEmbed()
    .setTitle('Memory Usage')
    .attachFiles(files);

  if (message !== null) {
    message.edit(embed);
  } else {
    const owner = client.users.get(config.owner_id);
    message = await owner.send(embed);
  }

  usageHistory = usageHistory.splice(-20);
}

// memoryInterval._interval = 10 * 1000;

commands = { memory };