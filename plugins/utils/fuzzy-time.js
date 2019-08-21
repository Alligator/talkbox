function fuzzyTime(timeDiff) {
  let hours = Math.floor(timeDiff / 1000 / 60 / 60);
  const minutes = (timeDiff / 1000 / 60) % 60;
  let fuzzyMinutes = Math.floor((minutes + 7.5) / 15) * 15;

  if (fuzzyMinutes === 60) {
    hours++;
    fuzzyMinutes = 0;
  }

  let result = [];

  if (hours > 1) {
    result.push(`${hours} hours`);
  } else if (hours > 0) {
    result.push(`${hours} hour`);
  }

  if (fuzzyMinutes > 1) {
    result.push(`${fuzzyMinutes} minutes`);
  } else if (fuzzyMinutes > 0) {
    result.push(`${fuzzyMinutes} minute`);
  }

  if (result.length === 0) {
    return 'now';
  }

  return result.join(' ');
}

function testFuzzyTime() {
  const assert = require('assert');
  // 1h 5m -> 1h
  assert.equal(fuzzyTime(65 * 1000 * 60), '1 hour');
  // 1h 10m -> 1h 15m
  assert.equal(fuzzyTime(75 * 1000 * 60), '1 hour 15 minutes');
  // 38m -> 45m
  assert.equal(fuzzyTime(38 * 1000 * 60), '45 minutes');
  // 55m -> 1 hour
  assert.equal(fuzzyTime(55 * 1000 * 60), '1 hour');
  // 1h 53m -> 2 hours
  assert.equal(fuzzyTime(113 * 1000 * 60), '2 hours');
  // 5m -> now
  assert.equal(fuzzyTime(5 * 1000 * 60), 'now');
  // 3h 37m -> 3h 30m
  assert.equal(fuzzyTime(217 * 1000 * 60), '3 hours 30 minutes');
}

module.exports = fuzzyTime;