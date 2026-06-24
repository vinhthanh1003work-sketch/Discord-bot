const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}`);

    const clientId = (process.env.CLIENT_ID || '').trim();
    const guildId = (process.env.GUILD_ID || '').trim();
    const token = (process.env.DISCORD_TOKEN || '').trim();

    const commands = [];
    const commandsPath = path.join(__dirname, '../commands');
    for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
      const command = require(path.join(commandsPath, file));
      if (command.data) commands.push(command.data.toJSON());
    }

    const rest = new REST().setToken(token);
    try {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`Registered ${commands.length} slash commands.`);
    } catch (err) {
      console.error('Failed to register slash commands:', err.message);
    }
  },
};
