const { handleTicketButtons } = require('../utils/ticketHandler');
const { handleLfgButtons, handleLfgSelect, handleLfgModal } = require('../utils/lfgHandler');
const { handleLoaButtons, handleLoaModal } = require('../utils/loaHandler');
const { handleRobloxButtons } = require('../utils/robloxHandler');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // ── Slash Commands ────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(err);
        const reply = { content: '❌ An error occurred.', flags: 64 };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
      return;
    }

    // ── Buttons ───────────────────────────────────────────────────
    if (interaction.isButton()) {
      const id = interaction.customId;
      if (id.startsWith('ticket_')) await handleTicketButtons(interaction, client);
      else if (id.startsWith('lfg_')) await handleLfgButtons(interaction, client);
      else if (id.startsWith('loa_')) await handleLoaButtons(interaction, client);
      else if (id.startsWith('roblox_')) await handleRobloxButtons(interaction, client);
      return;
    }

    // ── Select Menus ──────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'lfg_game_select') {
        await handleLfgSelect(interaction, client);
      }
      return;
    }

    // ── Modals ────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('lfg_modal_')) {
        await handleLfgModal(interaction, client);
      }
      if (interaction.customId === 'loa_modal') {
        await handleLoaModal(interaction, client);
      }
    }
  },
};