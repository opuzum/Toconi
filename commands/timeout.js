const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Time out a user for a specified duration')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to time out')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('How long the user will be timed out (e.g., 1m, 1h, 1d)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('The reason for the timeout')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  category: 'Moderation',

  async execute(interaction) {
    const targetUser = interaction.options.getMember('target');
    const durationString = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided.';

    
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: 'You do not have the required permissions to do that.', ephemeral: true });
    }

    if (!targetUser) {
      return interaction.reply({ content: 'That user is not a member of this server.', ephemeral: true });
    }

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot time out yourself.', ephemeral: true });
    }

    if (targetUser.id === interaction.guild.ownerId) {
      return interaction.reply({ content: 'You cannot time out the server owner.', ephemeral: true });
    }
    
    if (targetUser.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: 'You cannot time out an administrator.', ephemeral: true });
    }

    if (targetUser.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ content: 'You cannot time out a user with a role equal to or higher than your own.', ephemeral: true });
    }

    const durationMap = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
    };

    const durationMatch = durationString.match(/^(\d+)([smhd])$/);
    if (!durationMatch) {
      return interaction.reply({ content: 'Invalid duration format. Please use a number followed by s, m, h, or d (e.g., 1m, 1h, 1d).', ephemeral: true });
    }

    const value = parseInt(durationMatch[1]);
    const unit = durationMatch[2];
    const duration = value * durationMap[unit];

    if (duration > 28 * 24 * 60 * 60 * 1000) {
      return interaction.reply({ content: 'The maximum timeout duration is 28 days.', ephemeral: true });
    }

    try {
      await targetUser.timeout(duration, reason);
      const embed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('User Timed Out')
        .setDescription(`**User:** ${targetUser.user.tag}\n**Duration:** ${value}${unit}\n**Reason:** ${reason}`)
        .setTimestamp()
        .setFooter({ text: `Timed out by ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Timeout error:', error);
      await interaction.reply({ content: 'Failed to time out the user. Please check the bot\'s permissions and role hierarchy.', ephemeral: true });
    }
  },
};

