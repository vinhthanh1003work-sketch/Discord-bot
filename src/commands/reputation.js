const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const db = require('../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reputation')
    .setDescription('Check a carrier reputation')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The carrier to check (defaults to yourself)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const rep = db.get('reputation', target.id) || 0;

    const stars = rep === 0
      ? 'No vouches yet'
      : '⭐'.repeat(Math.min(rep, 10)) + (rep > 10 ? ` +${rep - 10} more` : '');

    const container = new ContainerBuilder()

      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# 📊 Carrier Reputation\n**Carrier:** <@${target.id}>\n**Total Vouches:** ${rep}\n**Rating:** ${stars}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# Reputation is earned through vouches in carry tickets.')
      );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
