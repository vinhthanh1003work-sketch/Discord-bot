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
    .setName('lfg-panel')
    .setDescription('Send the LFG duty panel (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const container = new ContainerBuilder()

      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 🔍 Looking For Group\nGoing on duty? Let others know you\'re available!\n\n**On Duty** — Set your LFG settings and post your availability.\n**End Duty** — Remove your LFG tag and stop posting.\n\nWhile on duty, `[LFG]` will appear before your nickname.')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('lfg_start')
            .setLabel('Go On Duty')
            .setEmoji('🟢')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('lfg_end')
            .setLabel('End Duty')
            .setEmoji('🔴')
            .setStyle(ButtonStyle.Danger),
        )
      );

    await interaction.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.reply({ content: '✅ LFG panel sent!', flags: 64 });
  },
};