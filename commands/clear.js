const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Delete a specific number of recent messages from this channel.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (max 100).')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addUserOption(option =>
            option.setName('filter_by_user')
                .setDescription('Deletes messages only from this specific user.')
                .setRequired(false)
        )
        .addRoleOption(option =>
            option.setName('filter_by_role')
                .setDescription('Deletes messages from all users with this role.')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('filter_by_bots')
                .setDescription('Deletes all messages sent by bots.')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    category: 'Moderation',

    async execute(interaction) {
        const channel = interaction.channel;
        const amount = interaction.options.getInteger('amount');
        const user = interaction.options.getUser('filter_by_user');
        const role = interaction.options.getRole('filter_by_role');
        const byBots = interaction.options.getBoolean('filter_by_bots');

        // Check for bot permissions first, as this is a common failure point
        if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: '❌ I need the `Manage Messages` permission to do that.', ephemeral: true });
        }

        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
            return interaction.reply({ content: '❌ This command can only be used in text or announcement channels.', ephemeral: true });
        }

        const activeFilters = [user, role, byBots].filter(Boolean);
        if (activeFilters.length > 1) {
            return interaction.reply({
                content: '❌ You can only use one filter at a time (user, role, or bots).',
                ephemeral: true
            });
        }

        try {
            const messages = await channel.messages.fetch({ limit: amount });
            let filteredMessages = messages;
            let filterDescription = `from this channel`;

            if (user) {
                filteredMessages = messages.filter(msg => msg.author.id === user.id);
                filterDescription = `from **${user.tag}**`;
            } else if (role) {
                filteredMessages = messages.filter(msg => msg.member && msg.member.roles.cache.has(role.id));
                filterDescription = `from users with the role **${role.name}**`;
            } else if (byBots) {
                filteredMessages = messages.filter(msg => msg.author.bot);
                filterDescription = `from bots`;
            }

            // The `true` flag in bulkDelete tells it to ignore messages older than 14 days
            await channel.bulkDelete(filteredMessages, true);

            await interaction.reply({
                content: `✅ Deleted **${filteredMessages.size}** messages ${filterDescription}.`,
                ephemeral: true
            });

        } catch (err) {
            console.error(err);
            await interaction.reply({
                content: '❌ Failed to delete messages. Some may be too old (over 14 days), or I may lack permissions for some messages.',
                ephemeral: true
            });
        }
    }
};

