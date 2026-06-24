const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorSpacingSize,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const db = require('./db');
require('dotenv').config();

const GAMES = {
  ticket_create_av:   { name: 'Anime Vanguards',           emoji: '🌸', color: 0xFF69B4 },
  ticket_create_utdx: { name: 'Universal Tower Defense X', emoji: '🗼', color: 0x00BFFF },
  ticket_create_as:   { name: 'Anime Squadron',            emoji: '⚔️', color: 0xFF4500 },
};

async function handleTicketButtons(interaction, client) {
  const { customId, guild, member } = interaction;

  if (customId.startsWith('ticket_create_')) {
    const game = GAMES[customId];
    if (!game) return;

    await interaction.deferReply({ flags: 64 });

    const existing = guild.channels.cache.find(
      c => c.topic?.includes(`owner:${member.id}`) && c.topic?.includes('carry-ticket')
    );
    if (existing) {
      return interaction.editReply({ content: `❌ You already have an open ticket: ${existing}` });
    }

    const ticketChannel = await guild.channels.create({
      name: `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      type: ChannelType.GuildText,
      topic: `carry-ticket | owner:${member.id} | game:${game.name}`,
      parent: process.env.TICKETS_CATEGORY_ID || null,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ],
    });

    db.set('tickets', ticketChannel.id, {
      ownerId: member.id,
      game: game.name,
      carrierId: null,
      vouchedUsers: [],
      createdAt: Date.now(),
    });

    const carriersRoleId = process.env.CARRIERS_ROLE_ID;
    const pingMsg = carriersRoleId ? `<@&${carriersRoleId}>` : '@here';

    const container = new ContainerBuilder()

      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${game.emoji} ${game.name} Carry Ticket\nWelcome ${member}! A carrier will be with you shortly.\n\n**Game:** ${game.emoji} ${game.name}\n**Status:** 🟡 Waiting for carrier\n\nPlease describe what carry you need below.`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_claim_${ticketChannel.id}`)
            .setLabel('Claim Ticket')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`ticket_close_${ticketChannel.id}`)
            .setLabel('Close Ticket')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`ticket_vouch_${ticketChannel.id}`)
            .setLabel('Vouch Carrier')
            .setEmoji('⭐')
            .setStyle(ButtonStyle.Secondary),
        )
      );

    await ticketChannel.send({
      content: `${pingMsg} — New carry ticket!`,
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.editReply({ content: `✅ Your ticket has been created: ${ticketChannel}` });
    return;
  }


  if (customId.startsWith('ticket_claim_')) {
    const channelId = customId.replace('ticket_claim_', '');
    const ticket = db.get('tickets', channelId);
    if (!ticket) return interaction.reply({ content: '❌ Ticket data not found.', flags: 64 });

    const carriersRoleId = process.env.CARRIERS_ROLE_ID;
    if (carriersRoleId && !member.roles.cache.has(carriersRoleId)) {
      return interaction.reply({ content: '❌ Only carriers can claim tickets.', flags: 64 });
    }
    if (ticket.carrierId) {
      return interaction.reply({ content: `❌ Already claimed by <@${ticket.carrierId}>.`, flags: 64 });
    }

    ticket.carrierId = member.id;
    db.set('tickets', channelId, ticket);

    await interaction.channel.permissionOverwrites.create(member.id, {
      ViewChannel: true,
      SendMessages: true,
    });

    const container = new ContainerBuilder()

      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ✅ Ticket Claimed\n${member} has claimed this ticket and will carry you!\n\n**Carrier:** ${member}`)
      );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }


  if (customId.startsWith('ticket_close_')) {
    const channelId = customId.replace('ticket_close_', '');
    const ticket = db.get('tickets', channelId);

    const carriersRoleId = process.env.CARRIERS_ROLE_ID;
    const isCarrier = carriersRoleId ? member.roles.cache.has(carriersRoleId) : false;
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = ticket?.ownerId === member.id;

    if (!isCarrier && !isAdmin && !isOwner) {
      return interaction.reply({ content: '❌ You cannot close this ticket.', flags: 64 });
    }

    await interaction.reply({ content: '🗑️ Closing ticket in 5 seconds...' });
    setTimeout(async () => {
      db.del('tickets', channelId);
      await interaction.channel.delete().catch(() => {});
    }, 5000);
    return;
  }

  if (customId.startsWith('ticket_vouch_')) {
    const channelId = customId.replace('ticket_vouch_', '');
    const ticket = db.get('tickets', channelId);

    if (!ticket) return interaction.reply({ content: '❌ Ticket not found.', flags: 64 });
    if (!ticket.carrierId) return interaction.reply({ content: '❌ No carrier has claimed this ticket yet.', flags: 64 });
    if (ticket.carrierId === member.id) return interaction.reply({ content: '❌ You cannot vouch yourself.', flags: 64 });
    if (ticket.vouchedUsers.includes(member.id)) return interaction.reply({ content: '❌ You already vouched.', flags: 64 });
    if (ticket.ownerId !== member.id) return interaction.reply({ content: '❌ Only the ticket creator can vouch.', flags: 64 });

    ticket.vouchedUsers.push(member.id);
    db.set('tickets', channelId, ticket);

    // Update reputation
    const currentRep = db.get('reputation', ticket.carrierId) || 0;
    const newRep = currentRep + 1;
    db.set('reputation', ticket.carrierId, newRep);

    const container = new ContainerBuilder()

      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ⭐ Vouch Submitted!\n${member} vouched for <@${ticket.carrierId}>!\n\n**Carrier Reputation:** ⭐ ${newRep} vouch${newRep !== 1 ? 'es' : ''}`)
      );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }
}

module.exports = { handleTicketButtons };