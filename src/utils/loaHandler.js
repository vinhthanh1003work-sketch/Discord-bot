const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const db = require('./db');

async function handleLoaButtons(interaction, client) {
  const { customId, member } = interaction;

  // ── GO ON LOA ─────────────────────────────────────────────────
  if (customId === 'loa_start') {
    if (db.get('loa', member.id)) {
      return interaction.reply({ content: '❌ You are already on LOA!', flags: 64 });
    }

    db.set('loa', member.id, { startedAt: Date.now() });
    await addLoaTag(member);

    const container = new ContainerBuilder()

      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# 🏖️ LOA Started\n${member} is now on **Leave of Absence**.\nThey will not be expected to be active while away.`)
      );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
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

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }
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

module.exports = { handleLoaButtons };