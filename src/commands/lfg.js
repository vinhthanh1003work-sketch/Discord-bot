const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lfg-panel')
    .setDescription('Send the LFG duty panel (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔍 Looking For Group')
      .setDescription(
        'Let others know you\'re available!\n\n' +
        '**On Duty** — Set your LFG settings and post your availability.\n' +
        '**End Duty** — Remove your `[LFG]` tag and stop posting.'
      )

    const row = new ActionRowBuilder().addComponents(
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
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ LFG panel sent!', ephemeral: true });
  },
};