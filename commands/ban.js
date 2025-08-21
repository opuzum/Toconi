const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  category: 'Moderation',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await interaction.guild.members.ban(targetUser.id, { reason });
      await interaction.reply(`🔨 ${targetUser.tag} has been banned.\n📄 Reason: ${reason}`);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: '❌ Failed to ban the user. Make sure I have permission and the user is bannable.', ephemeral: true });
    }
  }
};

