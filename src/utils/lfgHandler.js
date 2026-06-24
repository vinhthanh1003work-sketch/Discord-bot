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
  StringSelectMenuBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const db = require('./db');
require('dotenv').config();

// In-memory interval tracker (intervals can't be JSON-serialized)
const dutyIntervals = new Map();

const GAME_EMOJIS = {
  'Anime Vanguards': '🌸',
  'Universal Tower Defense X': '🗼',
  'Anime Squadron': '⚔️',
};

async function handleLfgButtons(interaction, client) {
  const { customId, member } = interaction;

  // ── GO ON DUTY → show game dropdown ──────────────────────────
  if (customId === 'lfg_start') {
    const existing = db.get('lfg', member.id);
    if (existing) {
      return interaction.reply({ content: '❌ You are already on duty! Use **End Duty** first.', flags: 64 });
    }

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('lfg_game_select')
        .setPlaceholder('Select your game...')
        .addOptions([
          { label: 'Anime Vanguards', value: 'Anime Vanguards', emoji: '🌸' },
          { label: 'Universal Tower Defense X', value: 'Universal Tower Defense X', emoji: '🗼' },
          { label: 'Anime Squadron', value: 'Anime Squadron', emoji: '⚔️' },
        ])
    );

    await interaction.reply({
      content: '🎮 **Select your game to go on duty:**',
      components: [row],
      flags: 64,
    });
    return;
  }

  // ── END DUTY ─────────────────────────────────────────────────
  if (customId === 'lfg_end') {
    const existing = db.get('lfg', member.id);
    if (!existing) {
      return interaction.reply({ content: '❌ You are not currently on duty.', flags: 64 });
    }

    // Clear interval
    if (dutyIntervals.has(member.id)) {
      clearInterval(dutyIntervals.get(member.id));
      dutyIntervals.delete(member.id);
    }

    db.del('lfg', member.id);
    await removeLfgTag(member);

    await interaction.reply({ content: '✅ You are now **off duty**. Your `[LFG]` tag has been removed.', flags: 64 });
    return;
  }
}

async function handleLfgSelect(interaction, client) {
  const { member } = interaction;
  const game = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`lfg_modal_${member.id}_${Buffer.from(game).toString('base64')}`)
    .setTitle('LFG Settings');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('lfg_gamemode')
        .setLabel('Game Mode (e.g. Portals, Rifts, Stories)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('lfg_duration')
        .setLabel('Duration (e.g. 1 hour, 30 mins)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(30)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('lfg_slots')
        .setLabel('Available Slots (e.g. 2)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(2)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('lfg_leech')
        .setLabel('Leech Allowed? (yes / no)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(3)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('lfg_mvp')
        .setLabel('MVP Service? (yes / no)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(3)
    ),
  );

  await interaction.showModal(modal);
}

async function handleLfgModal(interaction, client) {
  const { member, guild } = interaction;

  const parts = interaction.customId.split('_');
  const gameB64 = parts[parts.length - 1];
  const game = Buffer.from(gameB64, 'base64').toString('utf8');

  const gamemode = interaction.fields.getTextInputValue('lfg_gamemode');
  const duration = interaction.fields.getTextInputValue('lfg_duration');
  const slots = interaction.fields.getTextInputValue('lfg_slots');
  const leech = interaction.fields.getTextInputValue('lfg_leech').toLowerCase().trim();
  const mvp = interaction.fields.getTextInputValue('lfg_mvp').toLowerCase().trim();

  const leechAllowed = leech === 'yes' ? '✅ Yes' : '❌ No';
  const mvpService = mvp === 'yes' ? '✅ Yes' : '❌ No';

  await interaction.deferReply({ flags: 64 });

  const lfgChannelId = (process.env.LFG_CHANNEL_ID || '').trim();
  const lfgChannel = guild.channels.cache.get(lfgChannelId);
  if (!lfgChannel) {
    return interaction.editReply({ content: '❌ LFG channel not found. Check `LFG_CHANNEL_ID` in .env.' });
  }

  await addLfgTag(member);

  // Save duty state to JSON
  db.set('lfg', member.id, {
    game, gamemode, duration, slots, leechAllowed, mvpService,
    startedAt: Date.now(),
  });

  await sendLfgPanel(lfgChannel, member, game, gamemode, duration, slots, leechAllowed, mvpService);

  // Repeat every 5 minutes
  const interval = setInterval(async () => {
    if (!db.get('lfg', member.id)) return clearInterval(interval);
    await sendLfgPanel(lfgChannel, member, game, gamemode, duration, slots, leechAllowed, mvpService);
  }, 6 * 60 * 60 * 1000);

  dutyIntervals.set(member.id, interval);

  await interaction.editReply({
    content: `✅ You are now **on duty**! LFG panel posted in ${lfgChannel}. Your nickname now shows \`[LFG]\`.`,
  });
}

async function sendLfgPanel(channel, member, game, gamemode, duration, slots, leech, mvp) {
  const emoji = GAME_EMOJIS[game] || '🎮';

  const container = new ContainerBuilder()

    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 🔍 Player Looking For Group!\n @silent ${member} is on duty and looking for a group!`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `🎮 **Game:** ${emoji} ${game}\n` +
        `⚔️ **Game Mode:** ${gamemode}\n` +
        `⏱️ **Duration:** ${duration}\n` +
        `🪑 **Available Slots:** ${slots}\n` +
        `🧸 **Leech Allowed:** ${leech}\n` +
        `🏆 **MVP Service:** ${mvp}`
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# Ping them or join their session!')
    );

  await channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function addLfgTag(member) {
  try {
    let nick = member.nickname || member.user.username;
    nick = nick.replace(/^\[LOA\] /, '').replace(/^\[LFG\] /, '');
    await member.setNickname(`[LFG] ${nick}`.slice(0, 32));
  } catch {}
}

async function removeLfgTag(member) {
  try {
    const nick = (member.nickname || member.user.username).replace(/^\[LFG\] /, '');
    await member.setNickname(nick === member.user.username ? null : nick);
  } catch {}
}

module.exports = { handleLfgButtons, handleLfgSelect, handleLfgModal };