const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a member from the server.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  category: 'Moderation',

  async execute(interaction) {
    // Acknowledge the interaction immediately to prevent the 3-second timeout.
    // This sends a "bot is thinking..." message to the user.
    // We use ephemeral: true so only the user who ran the command can see it.
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      // Use editReply now that we've deferred the initial reply.
      return interaction.editReply({ content: '❌ Member not found in this server.' });
    }

    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({ content: "You can't kick yourself!" });
    }

    if (targetUser.id === interaction.client.user.id) {
      return interaction.editReply({ content: "I can't kick myself!" });
    }

    if (!targetMember.kickable) {
      // More specific check for role hierarchy
      if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.editReply({ content: 'You cannot kick a user with a role equal to or higher than your own.' });
      }
      return interaction.editReply({ content: '⚠️ I cannot kick this member. Check role hierarchy or permissions.' });
    }

    try {
      // Attempt to DM the user before kicking them
      await targetUser.send(`You have been kicked from **${interaction.guild.name}**.\nReason: ${reason}`).catch(() => {
        console.log(`Could not DM ${targetUser.tag}.`);
      });

      await targetMember.kick(reason);

      // We use editReply to update the "bot is thinking..." message.
      // This message can now be public, as the action was successful.
      await interaction.editReply({ content: `✅ ${targetUser.tag} has been kicked.\n📝 Reason: ${reason}`, ephemeral: false });
    } catch (err) {
      console.error(err);
      // If the kick fails, we edit the initial reply with an error message.
      await interaction.editReply({ content: '❌ Failed to kick the member.' });
    }
  }
};