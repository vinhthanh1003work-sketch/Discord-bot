const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorSpacingSize,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loa-panel')
    .setDescription('Send the LOA panel (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const container = new ContainerBuilder()

      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 🏖️ Leave of Absence\n Set yourself on LOA so others know you are unavailable.\n\n**Go on LOA** — Adds `[LOA]` before your nickname.\n**End LOA** — Removes the tag and marks you as back.')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('loa_start')
            .setLabel('Go on LOA')
            .setEmoji('🏖️')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('loa_end')
            .setLabel('End LOA')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success),
        )
      );

    await interaction.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.reply({ content: '✅ LOA panel sent!', flags: 64 });
  },
};