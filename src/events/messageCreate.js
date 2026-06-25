const { handleVouchCommand, handleVouchMessage } = require('../utils/vouchHandler');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    // Handle ongoing vouch session first (no prefix needed mid-flow)
    await handleVouchMessage(message, client);

    // Then check for prefix commands
    if (!message.content.startsWith('d,')) return;

    const args = message.content.slice(2).trim().split(/\s+/);
    const command = args[0].toLowerCase();

    if (command === 'vouch') {
      await handleVouchCommand(message, client);
    }
  },
};