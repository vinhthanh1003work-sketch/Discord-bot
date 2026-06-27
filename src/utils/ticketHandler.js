const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder,
} = require('discord.js');
const db = require('./db');
require('dotenv').config();

const GAMES = {
  ticket_create_av:   { name: 'Anime Vanguards',           short: 'AV',   emoji: '<:anime_vanguards:1518886530306015343>',  roleEnv: 'AV_CARRIER_ROLE_ID'   },
  ticket_create_utdx: { name: 'Universal Tower Defense X', short: 'UTDX', emoji: '<:universal_tdx:1518886910691381358>',    roleEnv: 'UTDX_CARRIER_ROLE_ID' },
  ticket_create_as:   { name: 'Anime Squadron',            short: 'AS',   emoji: '<:anime_squadron:1518886230664679455>',   roleEnv: 'AS_CARRIER_ROLE_ID'   },
};

function genCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function isCarrier(member) {
  const roles = [
    process.env.AV_CARRIER_ROLE_ID,
    process.env.UTDX_CARRIER_ROLE_ID,
    process.env.AS_CARRIER_ROLE_ID,
  ].filter(Boolean);
  return roles.some(r => member.roles.cache.has(r));
}

async function handleTicketButtons(interaction, client) {
  const { customId, guild, member } = interaction;

  // ── CREATE TICKET ─────────────────────────────────────────────
  if (customId.startsWith('ticket_create_')) {
    const game = GAMES[customId];
    if (!game) return;

    await interaction.deferReply({ ephemeral: true });

    const allTickets = db.getAll('tickets');
    const existingId = Object.entries(allTickets).find(
      ([, t]) => t.ownerId === member.id && t.open
    )?.[0];

    if (existingId) {
      const existingChannel = guild.channels.cache.get(existingId);
      return interaction.editReply({
        content: existingChannel
          ? `❌ You already have an open ticket: ${existingChannel}`
          : '❌ You already have an open ticket.',
      });
    }

    const code = genCode();
    const safeName = member.user.username.toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 12) || 'user';
    const channelName = `${game.short}-${safeName}-${code}`.toLowerCase();

    const carrierRoleId = (process.env[game.roleEnv] || '').trim();
    const pingMsg = carrierRoleId ? `<@&${carrierRoleId}>` : '@here';

    const overwrites = [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    ];
    if (carrierRoleId) {
      overwrites.push({
        id: carrierRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: (process.env.TICKETS_CATEGORY_ID || '').trim() || null,
      permissionOverwrites: overwrites,
    });

    db.set('tickets', ticketChannel.id, {
      ownerId: member.id,
      game: game.name,
      short: game.short,
      carrierId: null,
      vouchedUsers: [],
      vouched: false,
      open: true,
      createdAt: Date.now(),
    });

    const embed = new EmbedBuilder()
      .setTitle(`${game.name} Carry Ticket`)
      .setDescription(
        `**Player:** ${member}\n` +
        `**Ticket:** \`${channelName}\`\n` +
        `**Status:** 🟡 Waiting for carrier\n\n` +
        `${member} please describe what carry you need!\n\n` +
        `-# Once the carry is done, type \`d,vouch\` to rate your carrier.`
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_claim_${ticketChannel.id}`)
        .setLabel('Claim')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`ticket_transcript_${ticketChannel.id}`)
        .setLabel('Transcript')
        .setEmoji('📄')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ticket_close_${ticketChannel.id}`)
        .setLabel('Close')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
    );

    await ticketChannel.send({
      content: `${pingMsg} — New carry ticket from ${member}!`,
      embeds: [embed],
      components: [row],
    });

    await interaction.editReply({ content: `✅ Your ticket has been created: ${ticketChannel}` });
    return;
  }

  // ── CLAIM TICKET ──────────────────────────────────────────────
  if (customId.startsWith('ticket_claim_')) {
    const channelId = customId.replace('ticket_claim_', '');
    const ticket = db.get('tickets', channelId);
    if (!ticket) return interaction.reply({ content: '❌ Ticket data not found.', ephemeral: true });

    if (!isCarrier(member) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Only carriers can claim tickets.', ephemeral: true });
    }
    if (ticket.carrierId) {
      return interaction.reply({ content: `❌ Already claimed by <@${ticket.carrierId}>.`, ephemeral: true });
    }

    ticket.carrierId = member.id;
    db.set('tickets', channelId, ticket);

    await interaction.channel.permissionOverwrites.create(member.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    const embed = new EmbedBuilder()
      .setTitle('✅ Ticket Claimed')
      .setDescription(`${member} has claimed this ticket!\n\n**Carrier:** ${member}`)
      .setColor(0x57F287)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    return;
  }

  // ── TRANSCRIPT ────────────────────────────────────────────────
  if (customId.startsWith('ticket_transcript_')) {
    const channelId = customId.replace('ticket_transcript_', '');
    const ticket = db.get('tickets', channelId);

    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = ticket?.ownerId === member.id;
    const carrier = isCarrier(member);

    if (!isAdmin && !isOwner && !carrier) {
      return interaction.reply({ content: '❌ You cannot generate a transcript.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    let allMessages = [];
    let lastId = null;
    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      const batch = await interaction.channel.messages.fetch(options);
      if (batch.size === 0) break;
      allMessages.push(...batch.values());
      lastId = batch.last().id;
      if (batch.size < 100) break;
    }
    allMessages.reverse();

    const lines = [
      `TRANSCRIPT — ${ticket?.game || 'Carry'} Ticket`,
      `Channel: ${interaction.channel.name}`,
      `Generated: ${new Date().toUTCString()}`,
      `Owner: <@${ticket?.ownerId}>`,
      `Carrier: ${ticket?.carrierId ? `<@${ticket.carrierId}>` : 'Unclaimed'}`,
      `Vouched: ${ticket?.vouched ? `Yes — ${ticket.vouchData?.stars}★ — "${ticket.vouchData?.comment}"` : 'No'}`,
      '─'.repeat(60),
      '',
      ...allMessages.map(m =>
        `[${new Date(m.createdTimestamp).toUTCString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`
      ),
    ];

    const buffer = Buffer.from(lines.join('\n'), 'utf8');
    const transcriptChannelId = (process.env.TRANSCRIPTS_CHANNEL_ID || '').trim();
    const transcriptChannel = transcriptChannelId ? guild.channels.cache.get(transcriptChannelId) : null;

    if (transcriptChannel) {
      await transcriptChannel.send({
        content: `📄 Transcript for **${interaction.channel.name}** — requested by ${member}`,
        files: [new AttachmentBuilder(Buffer.from(lines.join('\n'), 'utf8'), { name: `transcript-${interaction.channel.name}.txt` })],
      });
    }

    await interaction.editReply({
      content: transcriptChannel ? `✅ Transcript sent to ${transcriptChannel}!` : '✅ Here is your transcript:',
      files: [new AttachmentBuilder(buffer, { name: `transcript-${interaction.channel.name}.txt` })],
    });
    return;
  }

  // ── CLOSE TICKET ──────────────────────────────────────────────
  if (customId.startsWith('ticket_close_')) {
    const channelId = customId.replace('ticket_close_', '');
    const ticket = db.get('tickets', channelId);

    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = ticket?.ownerId === member.id;
    const carrier = isCarrier(member);

    if (!isAdmin && !isOwner && !carrier) {
      return interaction.reply({ content: '❌ You cannot close this ticket.', ephemeral: true });
    }

    // Block close if carry was done but user hasn't vouched
    if (ticket?.carrierId && !ticket?.vouched) {
      const embed = new EmbedBuilder()
        .setTitle('⚠️ Vouch Required Before Closing')
        .setDescription(
          `<@${ticket.ownerId}> hasn't vouched yet!\n\n` +
          `Please ask the player to type \`d,vouch\` to rate the carry before closing.\n\n` +
          `-# Admins can close without a vouch if needed.`
        )

      // Admins can still force close
      if (isAdmin) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_forceclose_${channelId}`)
            .setLabel('Force Close (Admin)')
            .setEmoji('🔨')
            .setStyle(ButtonStyle.Danger),
        );
        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await interaction.reply({ content: '🗑️ Closing ticket in 5 seconds...' });
    setTimeout(async () => {
      if (ticket) { ticket.open = false; db.set('tickets', channelId, ticket); }
      await interaction.channel.delete().catch(() => {});
    }, 5000);
    return;
  }

  // ── FORCE CLOSE (Admin only) ──────────────────────────────────
  if (customId.startsWith('ticket_forceclose_')) {
    const channelId = customId.replace('ticket_forceclose_', '');
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Only admins can force close.', ephemeral: true });
    }

    const ticket = db.get('tickets', channelId);
    await interaction.reply({ content: '🔨 Force closing ticket in 5 seconds...' });
    setTimeout(async () => {
      if (ticket) { ticket.open = false; db.set('tickets', channelId, ticket); }
      await interaction.channel.delete().catch(() => {});
    }, 5000);
    return;
  }
}

module.exports = { handleTicketButtons };