async function cramoff(match, message) {
  globalDb.cramOffUntil = new Date().getTime() + 1000 * 60 * 60;
  log(`cramming off until ${globalDb.cramOffUntil}`);
  await message.react('<:mouthreal:823357563990966282>');
  await message.react('<:gunreal:814251451647131698>');
}

cramoff._regex = /cram off,? homero/i;
