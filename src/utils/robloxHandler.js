const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

async function handleRobloxButtons(interaction) {
  const { member } = interaction;

  if (interaction.customId !== 'roblox_remove') return;

  const current = member.nickname || member.user.username;

  // Detect (@ ...) pattern — brackets containing @ (Bloxlink/Rover format)
  const robloxTagPattern = /\s*\([^)]*@[^)]*\)/g;

  if (!robloxTagPattern.test(current)) {
    return interaction.reply({
      content: '❌ No Roblox tag detected in your nickname. Your nickname must contain `(@...)` to be removed.',
      flags: 64,
    });
  }

  const cleaned = current.replace(/\s*\([^)]*@[^)]*\)/g, '').trim();

  try {
    await member.setNickname(cleaned === member.user.username ? null : cleaned || null);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ✅ Roblox Tag Removed!\n**Before:** ${current}\n**After:** ${cleaned || member.user.username}`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# Your Roblox username bracket has been removed from your nickname.')
      );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2 | 64,
    });
  } catch {
    await interaction.reply({
      content: '❌ I could not change your nickname. Make sure my role is above yours in the server settings.',
      flags: 64,
    });
  }
}

module.exports = { handleRobloxButtons };