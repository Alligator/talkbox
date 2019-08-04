const jsweather = require('jsweather');
const config = require('../config.json');

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

  const img = await jsweather.getWeather(location, config.bing_key, config.dark_sky_key);
  message.channel.send({
    files: [{
      attachment: img,
      name: 'weather.gif',
    }],
  });
}

commands = { weather };