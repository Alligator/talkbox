const fs = require('fs');
const sqlite = require('better-sqlite3');

function burgerTop(text) {
  const img = fs.readFileSync('plugins/burger-top.png');
  return {
    data: img,
    ext: 'png',
  };
}

function burgerBottom(text) {
  const img = fs.readFileSync('plugins/burger-bottom.png');
  return {
    data: img,
    ext: 'png',
  };
}

function burgerFilling() {
  const db = sqlite('/home/alligator/dev/meal-rater/messages.db');
  const results = db.prepare(`
    select *
    from messages
    where content != ''
    order by random()
    limit 5
  `).all();

  const filling = results
    .map(m => m.content)
    .join('\n');

  return filling;
}

commands = { burgertop: burgerTop, burgerbottom: burgerBottom, burgerfilling: burgerFilling };
