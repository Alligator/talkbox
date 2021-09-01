const axios = require('axios');
const cheerio = require('cheerio');
const fuzzyTime = require('../plugins/utils/fuzzy-time');

async function getUpcoming(text, message) {
  const src = await axios.get('https://giantbomb.com');
  const $ = cheerio.load(src.data);
  const embed = new MessageEmbed()
    .setThumbnail('https://giantbomb1.cbsistatic.com/bundles/giantbombsite/images/logo.png');
  
  let value = '';

  $('#wrapper .gb-promo-upcoming').first().find('dl').map(function (i) {
    const $el = $(this);
    const title = $el.find('p').first().text();

    const time = $el.find('.js-time-convert').first().attr('data-date-unix');
    const now = new Date().getTime();
    const diff = (time * 1000) - now;
    const hourDiff = Math.floor(diff) / 1000 / 60 / 60;
    let dateString = '';

    // if it's soon, show how long
    if (hourDiff <= 24) {
      const fuzzy = fuzzyTime(diff);
      dateString = fuzzy === 'now' ? fuzzy : `in ${fuzzy}`;
    } else {
      const dayDiff = Math.round(diff / 1000 / 60 / 60 / 24);
      dateString = `in ${Math.round(dayDiff)} day`;
      if (dayDiff > 1) {
        dateString += 's';
      }
    }

    value += `**${title}** ${dateString}\n`;
  });

  embed.addField('Giant Bomb Upcoming', value || 'apparently nothing');
  message.channel.send({ embeds: [embed] });
}
getUpcoming._help = 'gb - get upcoming giantbomb stuff';

commands = { giantbomb: getUpcoming };
