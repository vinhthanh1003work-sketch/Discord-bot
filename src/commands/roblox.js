const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roblox-panel')
    .setDescription('Send the Roblox tag removal panel (Admin only)'),

  async execute(interaction) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 🎮 Roblox Tag Removal\nDid Bloxlink or Rover add your Roblox username to your nickname?\n\nClick the button below to automatically remove it.')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# Only removes brackets containing a @ symbol, e.g. `(@ RobloxName)`')
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('roblox_remove')
            .setLabel('Remove Roblox Tag')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger),
        )
      );

    await interaction.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.reply({ content: '✅ Roblox tag removal panel sent!', flags: 64 });
  },
};