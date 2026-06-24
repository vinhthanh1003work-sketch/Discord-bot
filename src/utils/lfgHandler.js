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

const dutyIntervals = new Map();

const GAME_EMOJIS = {
  'Anime Vanguards': '<:anime_vanguards:1518886530306015343>',
  'Universal Tower Defense X': '<:universal_tdx:1518886910691381358>',
  'Anime Squadron': '<:anime_squadron:1518886230664679455>',
};

async function handleLfgButtons(interaction, client) {
  const { customId, member } = interaction;

  if (customId === 'lfg_start') {
    if (db.get('lfg', member.id)) {
      return interaction.reply({ content: '❌ You are already on duty! Use **End Duty** first.', flags: 64 });
    }

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('lfg_game_select')
        .setPlaceholder('Select your game...')
        .addOptions([
          { label: 'Anime Vanguards', value: 'Anime Vanguards', emoji: { id: '1518886530306015343' } },
          { label: 'Universal Tower Defense X', value: 'Universal Tower Defense X', emoji: { id: '1518886910691381358' } },
          { label: 'Anime Squadron', value: 'Anime Squadron', emoji: { id: '1518886230664679455' } },
        ])
    );

    await interaction.reply({ content: '🎮 **Select your game to go on duty:**', components: [row], flags: 64 });
    return;
  }

  if (customId === 'lfg_end') {
    if (!db.get('lfg', member.id)) {
      return interaction.reply({ content: '❌ You are not currently on duty.', flags: 64 });
    }

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
        .setLabel('Game Mode (e.g. Ranked, Casual, Story)')
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

  db.set('lfg', member.id, { game, gamemode, duration, slots, leechAllowed, mvpService, startedAt: Date.now() });

  await sendLfgPanel(lfgChannel, member, game, gamemode, duration, slots, leechAllowed, mvpService, guild);

  const interval = setInterval(async () => {
    if (!db.get('lfg', member.id)) return clearInterval(interval);
    await sendLfgPanel(lfgChannel, member, game, gamemode, duration, slots, leechAllowed, mvpService, guild);
  }, 5 * 60 * 1000);

  dutyIntervals.set(member.id, interval);

  await interaction.editReply({
    content: `✅ You are now **on duty**! LFG panel posted in ${lfgChannel}. Your nickname now shows \`[LFG]\`.`,
  });
}

async function sendLfgPanel(channel, member, game, gamemode, duration, slots, leech, mvp, guild) {
  const emoji = GAME_EMOJIS[game] || '🎮';

  // Ping LFG role
  const lfgRoleId = (process.env.LFG_ROLE_ID || '').trim();
  const pingMsg = lfgRoleId ? `<@&${lfgRoleId}>` : '';

  const displayName = member.nickname || member.user.username;

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 🔍 Looking For Group`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emoji} **Game:** ${game}\n` +
        `👤 **Player:** ${displayName}\n` +
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
      new TextDisplayBuilder().setContent('-# DM them or join their session!')
    );

  await channel.send({
    content: pingMsg || undefined,
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