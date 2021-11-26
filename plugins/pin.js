const config = require('../config.json');
const util = require('util');

function ensureDb() {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS pins(
      channelId INTEGER
    , messageId INTEGER
    )
  `);

  sql.exec(`
    CREATE TABLE IF NOT EXISTS pin_channels(
      channelId     TEXT PRIMARY KEY
    , pinChannelId  TEXT
    , start_ts      DATE DEFAULT (strftime('%s', 'now'))
    )
  `);
}

async function pin(text, message) {
  if (message.author.id !== config.owner_id) {
    return;
  }

  const mentionedChannel = message.raw.mentions.channels.first();
  if (!mentionedChannel) {
    return 'you sure that\'s a channel?';
  }

  const pinChannelId = mentionedChannel.id;
  ensureDb();

  log('checking pin_channels');
  const channels = sql.query(
    'SELECT pinChannelId FROM pin_channels WHERE channelId = ?',
    message.channel.id,
  );
  if (channels.length > 0) {
    return `this channel is already sending pins to <#${channels[0].pinChannelId}>!`;
  }

  log('registering pin channel');
  sql.exec(`
    INSERT INTO pin_channels(channelId, pinChannelId)
    VALUES (?, ?)`,
    message.channel.id, pinChannelId,
  );

  log('fetching pins');
  const pinMap = await message.channel.messages.fetchPinned();
  for (const pin of pinMap.values()) {
    sql.exec(`
      INSERT INTO pins(channelId, messageId)
      VALUES(?, ?)`,
      message.channel.id, pin.id,
    );
  }

  return `new pins added this channel will now go to <#${pinChannelId}>`;
}

async function pinEvent(channel) {
  const pinChannels = sql.query(
    'SELECT * FROM pin_channels WHERE channelId = ?',
    channel.id,
  );

  if (pinChannels.length === 0) {
    return;
  }

  const pc = pinChannels[0];

  log(`checking pins for ${pc.channelId}`);

  const pinMap = await channel.messages.fetchPinned();
  for (const pin of pinMap.values()) {
    const foundPin = sql.query(
      'SELECT 1 FROM pins WHERE channelId = ? AND messageId = ?',
      channel.id, pin.id,
    );

    if (foundPin.length === 0) {
      // new pin!
      log(`adding new pin ${pin.id}`);
      const embed = new Discord.MessageEmbed();
      embed.setAuthor(pin.author.username, pin.author.displayAvatarURL({ format: 'png' }));
      embed.setDescription(pin.content);
      embed.setTimestamp();
      embed.setTitle('Jump to message');
      embed.setURL(pin.url);

      if (pin.attachments.size > 0) {
        embed.setImage(pin.attachments.first().url);
      }

      await channel.client.channels.cache.get(pc.pinChannelId).send({ embeds: [embed] });

      sql.exec('INSERT INTO pins(channelId, messageId) VALUES (?, ?)', channel.id, pin.id);

      log('unpinning message');
      await channel.messages.unpin(pin.id);
    }
  }
}
pinEvent._event = 'channelPinsUpdate';

commands = { pin };
