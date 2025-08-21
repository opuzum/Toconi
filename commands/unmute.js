const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Allow a user to send messages again')
        .addUserOption(opt => opt.setName('target')
            .setDescription('User to unmute from text channels')
            .setRequired(true)
        ),
    category: 'Moderation',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.editReply({ content: 'You do not have the required permissions to do that.' });
        }

        const target = interaction.options.getUser('target');
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        
        if (!member) {
            return interaction.editReply({ content: 'That user is not in this server.' });
        }
        
        if (!member.isCommunicationDisabled()) {
            return interaction.editReply({ content: `User **${member.user.tag}** is not currently muted.` });
        }

        try {
            await member.timeout(null, 'User unmuted.');
            await interaction.editReply({ content: `User **${member.user.tag}** has been unmuted.` });
        } catch (err) {
            console.error('Unmute error:', err);
            await interaction.editReply({ content: 'Failed to unmute the user. Please check the bot\'s permissions and role hierarchy.' });
        }
    }
};

