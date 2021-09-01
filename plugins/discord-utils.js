async function guilds(text, message) {
  const client = message.client;
  const guilds = await client.guilds.fetch();
  const reply = guilds.map(guild => guild.name);
  return reply.toString();
}

commands = { guilds };
