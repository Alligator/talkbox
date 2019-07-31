function guilds(text, message) {
  const client = message.client;
  const reply = client.guilds.map(guild => guild.name);
  return reply;
}

commands = { guilds };
