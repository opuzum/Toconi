const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove a user timeout')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to untimeout')
        .setRequired(true)),
  category: 'Moderation',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({ content: 'You do not have permission to moderate members.', ephemeral: true });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({ content: 'I do not have the necessary permissions to untimeout members. Please check my role permissions.', ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: 'That user is not a member of this server.', ephemeral: true });
    }

    if (!member.isCommunicationDisabled()) {
      return interaction.reply({ content: `User **${targetUser.tag}** is not currently timed out.`, ephemeral: true });
    }

    try {
      await member.timeout(null, 'Removed timeout.');
      await interaction.reply({ content: `Timeout for **${targetUser.tag}** has been removed.` });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to remove the timeout. Please check my role hierarchy and permissions.', ephemeral: true });
    }
  }
};

