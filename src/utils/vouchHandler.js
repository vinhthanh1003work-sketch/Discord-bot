const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require('discord.js');
const db = require('./db');
require('dotenv').config();

// Track ongoing vouch sessions: userId -> { step, carrierId, stars, channelId }
const vouchSessions = new Map();

async function handleVouchCommand(message, client) {
  const { author, channel, guild } = message;

  // Must be inside a ticket channel
  const ticket = db.get('tickets', channel.id);
  if (!ticket) {
    return message.reply('❌ You can only vouch inside a ticket channel.');
  }

  if (ticket.ownerId !== author.id) {
    return message.reply('❌ Only the ticket creator can vouch.');
  }

  if (!ticket.carrierId) {
    return message.reply('❌ No carrier has claimed this ticket yet.');
  }

  if (ticket.ownerId === ticket.carrierId) {
    return message.reply('❌ You cannot vouch yourself.');
  }

  if (ticket.vouchedUsers && ticket.vouchedUsers.includes(author.id)) {
    return message.reply('❌ You have already vouched for this carrier.');
  }

  // Start vouch session
  vouchSessions.set(author.id, {
    step: 'stars',
    carrierId: ticket.carrierId,
    channelId: channel.id,
  });

  const embed = new EmbedBuilder()
    .setTitle('⭐ Vouch Your Carrier')
    .setDescription(
      `How would you rate <@${ticket.carrierId}>?\n\n` +
      '**3** — Good\n' +
      '**5** — Excellent\n\n' +
      'Reply with `3` or `5`.'
    )
    .setColor(0xFEE75C);

  await message.reply({ embeds: [embed] });
}

async function handleVouchMessage(message, client) {
  const { author, channel, guild } = message;

  const session = vouchSessions.get(author.id);
  if (!session) return;
  if (session.channelId !== channel.id) return;

  // ── STEP 1: Stars ─────────────────────────────────────────────
  if (session.step === 'stars') {
    const input = message.content.trim();
    if (input !== '3' && input !== '5') {
      return message.reply('❌ Please reply with `3` or `5`.');
    }

    session.stars = parseInt(input);
    session.step = 'comment';
    vouchSessions.set(author.id, session);

    const embed = new EmbedBuilder()
      .setTitle('💬 Leave a Comment')
      .setDescription('Share your thoughts about the carrier. What did you like? How was the experience?\n\n*Reply with your comment (max 500 characters).*')
      .setColor(0xFEE75C);

    await message.reply({ embeds: [embed] });
    return;
  }

  // ── STEP 2: Comment ───────────────────────────────────────────
  if (session.step === 'comment') {
    const comment = message.content.trim().slice(0, 500);
    vouchSessions.delete(author.id);

    const ticket = db.get('tickets', session.channelId);
    if (!ticket) return message.reply('❌ Ticket not found.');

    // Mark as vouched
    if (!ticket.vouchedUsers) ticket.vouchedUsers = [];
    ticket.vouchedUsers.push(author.id);
    ticket.vouched = true;
    ticket.vouchData = { stars: session.stars, comment, vouchedAt: Date.now() };
    db.set('tickets', session.channelId, ticket);

    // Update reputation — store full vouch history
    const repData = db.get('reputation_detail', session.carrierId) || { total: 0, vouches: [] };
    repData.total += 1;
    repData.vouches.push({
      from: author.id,
      stars: session.stars,
      comment,
      ticketChannel: channel.name,
      date: new Date().toISOString(),
    });
    db.set('reputation_detail', session.carrierId, repData);

    // Also update simple reputation count
    const currentRep = db.get('reputation', session.carrierId) || 0;
    db.set('reputation', session.carrierId, currentRep + 1);

    const starDisplay = '⭐'.repeat(session.stars);

    // Vouch confirmation in ticket channel
    const confirmEmbed = new EmbedBuilder()
      .setTitle('⭐ Vouch Submitted!')
      .setDescription(
        `**Carrier:** <@${session.carrierId}>\n` +
        `**Rating:** ${starDisplay} (${session.stars}/5)\n` +
        `**Comment:** ${comment}\n\n` +
        `**Total Vouches:** ${repData.total}`
      )
      .setColor(0xFEE75C)
      .setTimestamp();

    await message.reply({ embeds: [confirmEmbed] });

    // Send vouch transcript to transcripts channel
    const transcriptChannelId = (process.env.TRANSCRIPTS_CHANNEL_ID || '').trim();
    const transcriptChannel = transcriptChannelId ? guild.channels.cache.get(transcriptChannelId) : null;

    if (transcriptChannel) {
      const lines = [
        `VOUCH TRANSCRIPT`,
        `Ticket: ${channel.name}`,
        `Date: ${new Date().toUTCString()}`,
        `─`.repeat(60),
        `Carrier: <@${session.carrierId}> (${session.carrierId})`,
        `Vouched by: ${author.tag} (${author.id})`,
        `Rating: ${session.stars}/5 stars`,
        `Comment: ${comment}`,
        `─`.repeat(60),
        `Carrier total vouches: ${repData.total}`,
        ``,
        `Full vouch history for carrier:`,
        ...repData.vouches.map((v, i) =>
          `[${i + 1}] ${v.date} | ${v.stars}★ | From: ${v.from} | "${v.comment}"`
        ),
      ];

      const buffer = Buffer.from(lines.join('\n'), 'utf8');
      const attachment = new AttachmentBuilder(buffer, { name: `vouch-${channel.name}-${author.id}.txt` });

      const transcriptEmbed = new EmbedBuilder()
        .setTitle('📄 Vouch Transcript')
        .setDescription(
          `**Ticket:** ${channel.name}\n` +
          `**Carrier:** <@${session.carrierId}>\n` +
          `**Vouched by:** ${author}\n` +
          `**Rating:** ${starDisplay} (${session.stars}/5)\n` +
          `**Comment:** ${comment}`
        )
        .setColor(0xFEE75C)
        .setTimestamp();

      await transcriptChannel.send({ embeds: [transcriptEmbed], files: [attachment] });
    }

    return;
  }
}

module.exports = { handleVouchCommand, handleVouchMessage };