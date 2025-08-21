const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('call')
    .setDescription('Call a user to this channel')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to call')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  category: 'Utility',

  async execute(interaction) {
    const executor = interaction.member;
    const targetUser = interaction.options.getUser('user');
    const guildOwnerId = interaction.guild.ownerId;
    const isAdmin = executor.permissions.has(PermissionsBitField.Flags.Administrator);
    const isOwner = executor.id === guildOwnerId;

    if (!isAdmin && !isOwner) {
      return interaction.reply({
        content: '⛔ Only administrators or the server owner can use this command.',
        ephemeral: true
      });
    }

    const channelMention = `<#${interaction.channel.id}>`;
    const executorMention = `<@${executor.id}>`;

    try {
      await targetUser.send(`📩 You’ve been called by ${executorMention} to join ${channelMention} in **${interaction.guild.name}**.`);

      await interaction.reply({
        content: `✅ Successfully sent a DM to ${targetUser.tag}.`,
        ephemeral: true
      });
    } catch (error) {
      console.error(`Failed to DM ${targetUser.tag}:`, error);
      await interaction.reply({
        content: `⚠️ Could not send a DM to ${targetUser.tag}. They might have DMs disabled.`,
        ephemeral: true
      });
    }
  }
};

