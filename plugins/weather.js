const jsweather = require('jsweather');
const config = require('../config.json');
const moment = require('moment');
const { textWrap } = require('../plugins/utils/text-wrap');

async function weather(text, message) {
  const name = message.author.username;
  let location = text;

  if (location && location.length > 0) {
    db[name] = location;
  } else if (name in db) {
    location = db[name];
  } else {
    return 'no saved location';
  }

  try {
    const img = await jsweather.getWeather(location, config.bing_key, config.pirate_weather_key);
    return {
      data: img,
      ext: 'gif',
    };
  } catch (e) {
    return 'uh oh something went wrong. maybe the api is down https://stats.uptimerobot.com/DRKqBCok2N';
  }
}

async function weatherSlashCmd(interaction) {
  const name = interaction.user.username;
  let location = interaction.options.getString('location', false);

  if (location && location.length > 0) {
    db[name] = location;
  } else if (name in db) {
    location = db[name];
  } else {
    return 'no saved location';
  }

  const img = await jsweather.getWeather(location, config.bing_key, config.dark_sky_key);
  const attachment = new Discord.MessageAttachment(img, 'weather.gif');
  interaction.reply({ files: [attachment] });
}

async function textWeather(text, message, currentOutput) {
  let title = 'Special Announcement';
  let body = '';
  let ticker = '';

  const unwrappedLines = text.split('\n');
  const words = text.split(/ +/g)
  const randomWord = words[Math.floor(Math.random() * words.length)];

  if (currentOutput.text) {
    title = currentOutput.args[0] || 'Special Announcement';
    ticker = currentOutput.args[1] || randomWord;
    body = currentOutput.text;
  } else if (unwrappedLines.length >= 3) {
    title = unwrappedLines[0];
    ticker = unwrappedLines[unwrappedLines.length - 1];
    body = unwrappedLines.slice(1, unwrappedLines.length - 1).join('\n');
  } else {
    title = 'Special Announcement';
    ticker = randomWord;
    body = text;
  }

  const { lines } = textWrap(body.replace(/```/g, ''), 43);
  const img = await jsweather.renderText(title, lines.join('\n'), ticker, moment());
  return {
    data: img,
    ext: 'png',
  };
}

commands = { weather, textWeather, textweather: textWeather };

slashCommands = [
  {
    func: weatherSlashCmd,
    config: {
      name: 'weather',
      description: 'get the weather',
      options: [{
        type: 3, // string
        name: 'location',
        description: 'the location to get. city, zip code, postcode, etc',
      }],
    },
  },
];
