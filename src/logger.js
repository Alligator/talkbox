function log(message) {
  const timeStamp = new Date().toISOString();
  console.log(`${timeStamp} ${message}`);
}

function info(message) {
  log(message);
}

function debug(message) {
  log(message);
}

module.exports = {
  info,
  debug,
};
