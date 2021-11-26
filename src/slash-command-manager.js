const sql = require('./sql');
const logger = require('./logger');

class SlashCommandManager {
  constructor(client, guildId) {
    this.client = client;
    this.guildId = guildId;
    this.commands = {};
    this.ensureDb();
  }

  ensureDb() {
    sql.exec(`
      CREATE TABLE IF NOT EXISTS slashCommands(
        discordId TEXT PRIMARY KEY NOT NULL
      , name      TEXT
      )
    `);
  }

  register(commandConfig, func) {
    const commandRegistered = sql.query(`
      SELECT count(*) as count
      FROM slashCommands
      WHERE name = ?
    `, commandConfig.name)[0].count > 0;

    if (!commandRegistered) {
      if (this.client.isReady()) {
        this.registerCommandWithDiscord(commandConfig);
      } else {
        this.client.once('ready', () => this.registerCommandWithDiscord(commandConfig));
      }
    }

    this.commands[commandConfig.name] = func;
  }

  unregister(commandConfig) {
    delete this.commands[commandConfig.name];
  }

  get(name) {
    return this.commands[name];
  }

  async registerCommandWithDiscord(commandConfig) {
    const guild = this.client.guilds.resolve(this.guildId);
    const cmd = await guild.commands.create(commandConfig);

    sql.exec(`
      INSERT INTO slashCommands(discordId, name)
      VALUES (?, ?)
    `, cmd.id, commandConfig.name);
  }
}

module.exports = SlashCommandManager;
