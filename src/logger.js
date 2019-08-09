const red = txt => `\x1b[91m${txt}\x1b[0m`;

function log(message) {
  const timeStamp = new Date().toISOString();

  console.log(`${timeStamp} ${message}`);
}

function info(message) {
  log(message);
}

function error(message) {
  log(red(message));
}

module.exports = {
  log,
  info,
  error,
};
