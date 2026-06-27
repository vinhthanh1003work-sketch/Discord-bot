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
    .setName('loa-panel')
    .setDescription('Send the LOA panel (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🏖️ Leave of Absence')
      .setDescription(
        'Submit a LOA application below.\n\n' +
        'Your request will be reviewed by staff before the tag is applied.\n\n' +
        '**End LOA** — If you are already on LOA and have returned, click below to remove your tag.'
      )

    const row = new ActionRowBuilder().addComponents(
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
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ LOA panel sent!', ephemeral: true });
  },
};