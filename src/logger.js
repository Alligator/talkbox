const util = require('util');

function log(message) {
  const timeStamp = new Date().toISOString();
  if (typeof message ==='string') {
    console.log(`${timeStamp} ${message}`);
  } else {
    console.log(`${timeStamp} ${util.inspect(message)}`);
  }
}

function info(message) {
  log(message);
}

function debug(message) {
  log(message);
}

module.exports = {
  log,
  info,
  debug,
};
