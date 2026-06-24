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
        new TextDisplayBuilder().setContent(
          '# 🏖️ Leave of Absence\n' +
          'Need to step away? Submit a LOA application below.\n\n' +
          'Your request will be reviewed by staff before the tag is applied.\n\n' +
          '**End LOA** — If you are already on LOA and have returned, click below to remove your tag.'
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('loa_apply')
            .setLabel('Apply for LOA')
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