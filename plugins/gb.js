const axios = require('axios');
const cheerio = require('cheerio');

async function getUpcoming(text, message) {
  const src = await axios.get('https://giantbomb.com');
  const $ = cheerio.load(src.data);
  const embed = new RichEmbed()
    .setThumbnail('https://giantbomb1.cbsistatic.com/bundles/giantbombsite/images/logo.png');
  
  let value = '';

  const streams = $('.gb-promo-upcoming').first().find('dl').map(function (i) {
    const $el = $(this);
    const title = $el.find('p').first().html();

    const time = $el.find('.js-time-convert').first().attr('data-date-unix');
    const date = new Date(time * 1000);
    const hourDiff = Math.round((date.getTime() - new Date().getTime()) / 1000 / 60 / 60);

    let dateString = '';

    // if it's soon, show how long
    if (hourDiff <= 0) {
      dateString = `now`;
    } else if (hourDiff <= 24) {
      dateString = `in ${Math.round(hourDiff)} hour`;
      if (hourDiff > 1) {
        dateString += 's';
      }
    } else {
      const dayDiff = Math.round((date.getTime() - new Date().getTime()) / 1000 / 60 / 60 / 24);
      dateString = `in ${Math.round(dayDiff)} day`;
      if (dayDiff > 1) {
        dateString += 's';
      }
    }

    value += `**${title}** ${dateString}\n`;
  });

  embed.addField('Giant Bomb Upcoming', value);
  message.channel.send(embed);
}

commands = { giantbomb: getUpcoming };