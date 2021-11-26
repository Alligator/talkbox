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
  return {
    data: img,
    ext: 'gif',
  };
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

commands = { weather };

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
