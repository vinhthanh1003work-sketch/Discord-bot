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
    .setName('ticket-panel')
    .setDescription('Send the ticket creation panel (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const container = new ContainerBuilder()

      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 🎟️ Carry Services\nNeed a carry? Open a ticket for your game below!\n\n**Available Games:**\n🌸 Anime Vanguards\n🗼 Universal Tower Defense X\n⚔️ Anime Squadron')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('A carrier will be pinged and claim your ticket shortly.')
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_create_av')
            .setLabel('Anime Vanguards')
            .setEmoji('🌸')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('ticket_create_utdx')
            .setLabel('UTD X')
            .setEmoji('🗼')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('ticket_create_as')
            .setLabel('Anime Squadron')
            .setEmoji('⚔️')
            .setStyle(ButtonStyle.Primary),
        )
      );

    await interaction.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.reply({ content: '✅ Ticket panel sent!', flags: 64 });
  },
};
