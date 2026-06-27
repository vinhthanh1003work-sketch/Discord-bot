const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reputation')
    .setDescription('Check a carrier reputation')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The carrier to check (defaults to yourself)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const repData = db.get('reputation_detail', target.id) || { total: 0, vouches: [] };
    const total = repData.total;

    // Average stars
    const avgStars = total > 0
      ? (repData.vouches.reduce((sum, v) => sum + v.stars, 0) / total).toFixed(1)
      : 'N/A';

    const starDisplay = total === 0 ? 'No vouches yet' : `⭐ ${avgStars}/5 avg (${total} vouch${total !== 1 ? 'es' : ''})`;

    // Last 3 vouches
    const recent = repData.vouches.slice(-3).reverse();
    const recentText = recent.length > 0
      ? recent.map(v => `${'⭐'.repeat(v.stars)} — "${v.comment}"\n-# <@${v.from}> • ${new Date(v.date).toDateString()}`).join('\n\n')
      : 'No recent vouches.';

    const embed = new EmbedBuilder()
      .setTitle('📊 Carrier Reputation')
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'Carrier', value: `<@${target.id}>`, inline: true },
        { name: 'Rating', value: starDisplay, inline: true },
        { name: 'Recent Vouches', value: recentText },
      )
      .setFooter({ text: 'Reputation earned through d,vouch in carry tickets' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};