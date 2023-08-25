function shouldShutUp(globalDb) {
  return globalDb.cramOffUntil > new Date().getTime();
}

module.exports = { shouldShutUp };
