const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Temporarily mute a user in the server.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .setDMPermission(false)
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to mute.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('time')
                .setDescription('The duration of the mute.')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(28))
        .addStringOption(option =>
            option.setName('unit')
                .setDescription('The unit of time (e.g., minutes, hours, days).')
                .setRequired(true)
                .addChoices(
                    { name: 'Minutes', value: 'minutes' },
                    { name: 'Hours', value: 'hours' },
                    { name: 'Days', value: 'days' }))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the mute.')
                .setRequired(false)),
    category: 'Moderation',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // Permission check
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.editReply({ content: 'You do not have permission to moderate members.' });
        }

        const target = interaction.options.getUser('target');
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (!member) {
            return interaction.editReply({ content: 'That user is not a member of this server.' });
        }

        const time = interaction.options.getInteger('time');
        const unit = interaction.options.getString('unit');
        const reason = interaction.options.getString('reason') || 'No reason provided.';

        let durationInMs;
        switch (unit) {
            case 'minutes': durationInMs = time * 60 * 1000; break;
            case 'hours': durationInMs = time * 60 * 60 * 1000; break;
            case 'days': durationInMs = time * 24 * 60 * 60 * 1000; break;
            default: durationInMs = time * 60 * 1000; break;
        }

        const maxDuration = 28 * 24 * 60 * 60 * 1000;
        if (durationInMs > maxDuration) {
            return interaction.editReply({ content: 'The maximum mute duration is 28 days.' });
        }

        try {
            await member.timeout(durationInMs, reason);

            const replyContent = `Successfully muted **${member.user.tag}** for ${time} ${unit}.`;

            await interaction.editReply({
                content: replyContent,
                ephemeral: false
            });

        } catch (err) {
            console.error('Mute error:', err);
            await interaction.editReply({ content: 'An unexpected error occurred. Please check my permissions and try again.' });
        }
    }
};

