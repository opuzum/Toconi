const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Send a direct message to a user with a custom embed')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to DM')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message to send')
        .setRequired(true)),
  category: 'Utility',
    
  async execute(interaction) {
    // Permission check
    if (!interaction.member.permissions.has('KickMembers')) {
      return interaction.reply({
        content: '🚫 You don’t have permission to use this command.',
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser('target');
    const messageContent = interaction.options.getString('message');

    try {
      // Build the embed
      const embed = {
        title: `You got a message!`,
        description: messageContent,
        color: 0x00AEFF
      };

      await targetUser.send({ embeds: [embed] });

      await interaction.reply({
        content: `✅ Message sent to ${targetUser.tag}.`,
        ephemeral: true
      });
    } catch (error) {
      await interaction.reply({
        content: `⚠️ Failed to send DM. The user may have DMs disabled.`,
        ephemeral: true
      });
    }
  }
};

