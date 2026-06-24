const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const db = require('./db');
require('dotenv').config();

async function handleLoaButtons(interaction, client) {
  const { customId, member, guild } = interaction;

  // ── APPLY FOR LOA → open modal ────────────────────────────────
  if (customId === 'loa_apply') {
    if (db.get('loa', member.id)) {
      return interaction.reply({ content: '❌ You are already on LOA!', flags: 64 });
    }

    // Check if they already have a pending application
    const pending = db.getAll('loa_pending');
    const alreadyPending = Object.values(pending).find(p => p.userId === member.id);
    if (alreadyPending) {
      return interaction.reply({ content: '❌ You already have a pending LOA application awaiting review.', flags: 64 });
    }

    const modal = new ModalBuilder()
      .setCustomId('loa_modal')
      .setTitle('LOA Application');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('loa_reason')
          .setLabel('Reason for LOA')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(500)
          .setPlaceholder('Explain why you need to go on leave...')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('loa_duration')
          .setLabel('Expected Duration')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50)
          .setPlaceholder('e.g. 1 week, 2 days...')
      ),
    );

    await interaction.showModal(modal);
    return;
  }

  // ── END LOA ───────────────────────────────────────────────────
  if (customId === 'loa_end') {
    if (!db.get('loa', member.id)) {
      return interaction.reply({ content: '❌ You are not currently on LOA.', flags: 64 });
    }

    db.del('loa', member.id);
    await removeLoaTag(member);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ✅ Welcome Back!\n${member} has returned from **Leave of Absence**!`)
      );

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    return;
  }

  // ── APPROVE APPLICATION ───────────────────────────────────────
  if (customId.startsWith('loa_approve_')) {
    if (!member.permissions.has('Administrator') && !member.permissions.has('ManageRoles')) {
      return interaction.reply({ content: '❌ You do not have permission to approve LOA requests.', flags: 64 });
    }

    const applicationId = customId.replace('loa_approve_', '');
    const application = db.get('loa_pending', applicationId);
    if (!application) return interaction.reply({ content: '❌ Application not found.', flags: 64 });

    const targetMember = await guild.members.fetch(application.userId).catch(() => null);
    if (!targetMember) {
      db.del('loa_pending', applicationId);
      return interaction.reply({ content: '❌ User no longer in server. Application removed.', flags: 64 });
    }

    // Grant LOA
    db.set('loa', application.userId, { startedAt: Date.now(), reason: application.reason });
    db.del('loa_pending', applicationId);
    await addLoaTag(targetMember);

    // Update the application message
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ✅ LOA Approved\n` +
          `**User:** ${targetMember}\n` +
          `**Reason:** ${application.reason}\n` +
          `**Duration:** ${application.duration}\n\n` +
          `**Approved by:** ${member}`
        )
      );

    await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });

    // Notify the user
    await targetMember.send({
      content: `✅ Your LOA application has been **approved** by ${member.user.tag}! Your \`[LOA]\` tag has been applied.`,
    }).catch(() => {});
    return;
  }

  // ── DECLINE APPLICATION ───────────────────────────────────────
  if (customId.startsWith('loa_decline_')) {
    if (!member.permissions.has('Administrator') && !member.permissions.has('ManageRoles')) {
      return interaction.reply({ content: '❌ You do not have permission to decline LOA requests.', flags: 64 });
    }

    const applicationId = customId.replace('loa_decline_', '');
    const application = db.get('loa_pending', applicationId);
    if (!application) return interaction.reply({ content: '❌ Application not found.', flags: 64 });

    const targetMember = await guild.members.fetch(application.userId).catch(() => null);
    db.del('loa_pending', applicationId);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ❌ LOA Declined\n` +
          `**User:** <@${application.userId}>\n` +
          `**Reason:** ${application.reason}\n` +
          `**Duration:** ${application.duration}\n\n` +
          `**Declined by:** ${member}`
        )
      );

    await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });

    // Notify the user
    if (targetMember) {
      await targetMember.send({
        content: `❌ Your LOA application has been **declined** by ${member.user.tag}.`,
      }).catch(() => {});
    }
    return;
  }
}

async function handleLoaModal(interaction, client) {
  const { member, guild } = interaction;

  const reason = interaction.fields.getTextInputValue('loa_reason');
  const duration = interaction.fields.getTextInputValue('loa_duration');

  await interaction.deferReply({ flags: 64 });

  const appChannelId = (process.env.LOA_APPLICATIONS_CHANNEL_ID || '').trim();
  const appChannel = guild.channels.cache.get(appChannelId);
  if (!appChannel) {
    return interaction.editReply({ content: '❌ LOA applications channel not configured. Ask an admin to set `LOA_APPLICATIONS_CHANNEL_ID`.' });
  }

  // Generate a unique application ID
  const applicationId = `${member.id}_${Date.now()}`;

  db.set('loa_pending', applicationId, {
    userId: member.id,
    reason,
    duration,
    submittedAt: Date.now(),
  });

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# 📋 LOA Application\n` +
        `**Applicant:** ${member}\n` +
        `**Reason:** ${reason}\n` +
        `**Duration:** ${duration}`
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`loa_approve_${applicationId}`)
          .setLabel('Approve')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`loa_decline_${applicationId}`)
          .setLabel('Decline')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger),
      )
    );

  await appChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });

  await interaction.editReply({
    content: `✅ Your LOA application has been submitted! Staff will review it shortly.`,
  });
}

async function addLoaTag(member) {
  try {
    let nick = member.nickname || member.user.username;
    nick = nick.replace(/^\[LFG\] /, '').replace(/^\[LOA\] /, '');
    await member.setNickname(`[LOA] ${nick}`.slice(0, 32));
  } catch {}
}

async function removeLoaTag(member) {
  try {
    const nick = (member.nickname || member.user.username).replace(/^\[LOA\] /, '');
    await member.setNickname(nick === member.user.username ? null : nick);
  } catch {}
}

module.exports = { handleLoaButtons, handleLoaModal };