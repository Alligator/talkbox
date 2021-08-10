const { createCanvas } = require('canvas');
const { format } = require('date-fns');

// db stuff
function ensureDb() {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS turnipUsers(
      id    INTEGER PRIMARY KEY NOT NULL
    , user  TEXT
    )
  `);

  sql.exec(`
    CREATE TABLE IF NOT EXISTS turnipPrices(
      userId    INTEGER
    , price     REAL
    , priceType TEXT -- 'buy' or 'sell'
    , timestamp TEXT
    )
  `);

  sql.exec(`
    CREATE VIEW IF NOT EXISTS turnipPrices_lastWeek AS
    SELECT *
    FROM turnipPrices
    WHERE timestamp BETWEEN date('now', '-6 days', 'weekday 0') AND date('now', '1 days')
  `);
}

function getWeeklyPrices() {
  return sql.query(`
    SELECT
      U.user AS userName
    , P.price
    , P.priceDiff
    , MAX(P.timestamp) as timestamp
    FROM (
      SELECT
        userId
      , price
      , priceType
      , price - LAG(price) OVER (PARTITION BY userId ORDER BY timestamp) AS priceDiff
      , timestamp
      FROM turnipPrices_lastWeek
      WHERE priceType = 'sell'
    ) AS P
    INNER JOIN turnipUsers AS U
      ON U.id = P.userId
    GROUP BY P.userId
    ORDER BY price DESC
  `);
}

function getBuyPrices() {
  return sql.query(`
    SELECT
      U.user
    , P.price
    , MAX(P.timestamp) AS timestamp
    FROM turnipPrices_lastWeek AS P
    INNER JOIN turnipUsers AS U
      ON U.id = P.userId
    WHERE P.priceType = 'buy'
    GROUP BY P.userId
    ORDER BY price
  `);
}

function getUserPrices(user, type) {
  return sql.query(`
    SELECT
      price
    , priceType
    , timestamp
    FROM turnipPrices_lastWeek AS P
    INNER JOIN turnipUsers AS U
      ON U.id = P.userId
    WHERE U.user = ?
    AND P.priceType = ?
    ORDER BY P.timestamp DESC
  `, user, type);
}

function addUserPrice(user, price, type) {
  sql.exec(`
    INSERT INTO turnipUsers(user)
    SELECT :user
    WHERE NOT EXISTS (
      SELECT 1 FROM turnipUsers WHERE user = :user
    )
  `, { user });

  const userId = sql.query('SELECT * FROM turnipUsers WHERE user = ?', user)[0].id;

  sql.exec(`
    INSERT INTO turnipPrices (userId, price, priceType, timestamp)
    SELECT :userId, :price, :type, datetime()
  `, { userId, price, type });
}


// graph
function generateTrendGraph() {
  // users with > 1 price this week
  const users = sql.query(`
    SELECT id, user, MAX(timestamp)
    FROM turnipUsers AS U
    INNER JOIN turnipPrices_lastWeek AS P
      ON P.userId = U.id
    WHERE P.priceType = 'sell'
    GROUP BY P.userId
    ORDER BY P.price DESC
  `);

  if (users.length === 0) {
    return;
  }

  const extent = sql.query(`
    SELECT max(price) AS max, min(price) AS min
    FROM turnipPrices_lastWeek
    WHERE priceType = 'sell'
  `)[0];

  const width = 200;
  const height = 15;

  const spacing = 3; // space between graphs
  const padding = 4;

  const boxWidth = width + padding * 2;
  const boxHeight = height + padding * 2;

  const canvas = createCanvas(width + padding * 2, (boxHeight + spacing) * users.length);
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.lineJoin = 'round';

  users.forEach((user, idx) => {
    const prices = sql.query(`
      SELECT price
      FROM turnipPrices_lastWeek
      WHERE priceType = 'sell'
      AND userId = ?
      ORDER BY timestamp
    `, user.id);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, idx * (boxHeight + spacing), width + padding * 2, height + padding * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(user.user, width, idx * (boxHeight + spacing) + (boxHeight / 2));

    ctx.save();
    ctx.translate(padding, idx * (boxHeight + spacing) + padding);
    drawGraph(ctx, width, height, prices.map(x => x.price), extent.min, extent.max);
    ctx.restore();
  });

  return canvas.toBuffer('image/png');
}

function drawGraph(ctx, width, height, values, min, max) {
  const c = x => height - ((height / (max - min)) * (x - min));

  // assume max 14 values
  const xStep = Math.round(width / 14);

  ctx.strokeStyle = 'rgb(112, 222, 238)';
  ctx.beginPath();
  ctx.moveTo(0, c(values[0]));
  for (let i = 0; i < values.length; i++) {
    ctx.lineTo(i * xStep, c(values[i]));
  }
  ctx.stroke();
  ctx.closePath();

  ctx.fillStyle = 'rgb(112, 222, 238)';
  for (let i = 0; i < values.length; i++) {
    ctx.beginPath();
    ctx.ellipse(i * xStep, c(values[i]), 2, 2, 0, 0, 4*Math.PI);
    ctx.fill();
  }

  return ctx;
}


// util
function isSunday() {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  // consider sunday to be 7am sunday - 7am monday UTC
  return (
    (day === 0 && hour >= 7)
    || (day === 1 && hour < 7)
  );
}

function formatTimeDiff(diff) {
  const diffMinutes = diff / 1000 / 60;
  const diffHours = diffMinutes / 60;
  const diffDays = diffHours / 24;

  if (diffMinutes < 45) {
    return 'just now';
  } else if (diffHours <= 1.5) {
    return `${diffHours.toFixed(0)} hour ago`;
  } else if (diffHours < 24) {
    return `${diffHours.toFixed(0)} hours ago`;
  } else if (Math.round(diffDays) === 1) {
    return `${diffDays.toFixed(0)} day ago`;
  }

  return `${diffDays.toFixed(0)} days ago`;
}


// commands
function myPrices(text, message) {
  const name = message.author.username;
  const prices = sql.query(`
    SELECT
      U.user
    , price
    , priceType
    -- , strftime('%Y-%m-%d %H:%M', timestamp) as timestamp
    , timestamp
    FROM turnipPrices AS P
    INNER JOIN turnipUsers AS U
      ON U.id = P.userId
    WHERE U.user = ?
    ORDER BY P.timestamp
    LIMIT 14
  `, name);

  const formatDate = ts => format(new Date(ts), 'yyyy-MM-dd HH:mm (EEE)');

  const embed = new RichEmbed();
  embed.setTitle(`${name}'s price history`);
  embed.setFooter('times in UTC');

  embed.addField('sell prices', '```\n' + prices
    .filter(p => p.priceType === 'sell')
    .map(p => `${formatDate(p.timestamp)}  ${p.price}`)
    .join('\n') + '```');

  embed.addField('buy prices', '```\n' + prices
    .filter(p => p.priceType === 'buy')
    .map(p => `${formatDate(p.timestamp)}  ${p.price}`)
    .join('\n') + '```');

  message.channel.send(embed);
}

function sunday(text, message) {
  if (text && text.length > 0) {
    const name = message.author.username;
    const amount = parseInt(text, 10);

    if (isNaN(amount)) {
      return 'that didn\'t look like a number';
    }
    addUserPrice(name, amount, 'buy');
  }

  const prices = getBuyPrices();

  if (prices.length === 0) {
    return 'no buy prices saved';
  }

  const embed = new RichEmbed()
  embed.setTitle('stalk market insider trading')

  let output = '';

  prices.forEach((price) => {
    output += `**${price.user}** ${price.price} `;

    const now = new Date().getTime();
    const ts = new Date(price.timestamp).getTime();
    const formatteDiff = formatTimeDiff(now - ts);
    output += ` *${formatteDiff}*`;

    output += '\n';
  });

  embed.addField('selling prices', output);
  message.channel.send(embed);
}

function turnips(text, message) {
  if (text === 'history') {
    return myPrices(text, message);
  }

  if (isSunday()) {
    return sunday(text, message);
  }

  if (text && text.length > 0) {
    const name = message.author.username;
    const amount = parseInt(text, 10);

    if (isNaN(amount)) {
      return 'that didn\'t look like a number';
    }

    addUserPrice(name, amount, 'sell');
  }

  const prices = getWeeklyPrices();

  const embed = new RichEmbed();
  embed.setTitle('stalk market insider trading');

  let output = '';
  prices.forEach((price) => {
    output += `**${price.userName}** ${price.price}`;

    if (price.priceDiff) {
      output += ` (${price.priceDiff > 0 ? '+' : '-'}${Math.abs(price.priceDiff)} ${price.priceDiff > 0 ? ':chart_with_upwards_trend:' : ':chart_with_downwards_trend:'})`;
    }

    const now = new Date().getTime();
    const ts = new Date(price.timestamp).getTime();
    const formatteDiff = formatTimeDiff(now - ts);
    output += ` *${formatteDiff}*`;

    output += '\n';
  });

  embed.addField('buying prices', output);

  const trends = generateTrendGraph();
  if (trends) {
    embed.attachFile({ name: 'trend.png', attachment: trends });
    embed.setImage('attachment://trend.png');
  }
  message.channel.send(embed);
}

ensureDb();
commands = { turnips, sundayturnips: sunday };
