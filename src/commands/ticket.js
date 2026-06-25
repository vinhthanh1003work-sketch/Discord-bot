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
        new TextDisplayBuilder().setContent(
          '# 🎟️ Carry Services\nNeed a carry? Open a ticket for your game below!\n\n<:anime_vanguards:1518886530306015343> **Anime Vanguards**\n<:universal_tdx:1518886910691381358> **Universal Tower Defense X**\n<:anime_squadron:1518886230664679455> **Anime Squadron**'
        )
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
            .setEmoji({
              id: '1518886530306015343',
              name: 'anime_vanguards',
            })
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId('ticket_create_utdx')
            .setLabel('UTD X')
            .setEmoji({
              id: '1518886910691381358',
              name: 'universal_tdx',
            })
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId('ticket_create_as')
            .setLabel('Anime Squadron')
            .setEmoji({
              id: '1518886230664679455',
              name: 'anime_squadron',
            })
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