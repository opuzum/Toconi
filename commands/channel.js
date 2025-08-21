const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Manage channel settings')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(sub => sub.setName('lock').setDescription('Prevent members from sending messages'))
        .addSubcommand(sub => sub.setName('unlock').setDescription('Allow members to send messages'))
        .addSubcommand(sub => sub.setName('hide').setDescription('Hide this channel from everyone'))
        .addSubcommand(sub => sub.setName('show').setDescription('Show this channel to everyone'))
        .addSubcommand(sub => sub.setName('delete').setDescription('Delete this channel'))
        .addSubcommand(sub =>
            sub.setName('rename')
                .setDescription('Rename this channel')
                .addStringOption(opt =>
                    opt.setName('name')
                        .setDescription('New channel name')
                        .setRequired(true)
                )
        ),
    category: 'Utility',

    async execute(interaction) {
        const { member, channel, guild, options } = interaction;
        const subcommand = options.getSubcommand();

        const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
        const isOwner = member.id === guild.ownerId;

        if (!isAdmin && !isOwner) {
            return interaction.reply({ content: '🚫 You need Administrator permission or be the server owner to use this.', ephemeral: true });
        }

        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: '❌ This command works only in text channels.', ephemeral: true });
        }

        try {
            switch (subcommand) {
                case 'lock':
                    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
                    return interaction.reply({ content: '🔒 Channel locked. Members can’t send messages.' });

                case 'unlock':
                    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true });
                    return interaction.reply({ content: '🔓 Channel unlocked. Members can now send messages.' });

                case 'hide':
                    await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
                    return interaction.reply({ content: '🙈 Channel hidden from everyone.' });

                case 'show':
                    await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true });
                    return interaction.reply({ content: '👀 Channel visible to everyone.' });

                case 'delete':
                    await interaction.reply({ content: '🗑️ Channel will now be deleted.', ephemeral: true });
                    return channel.delete();

                case 'rename':
                    const newName = options.getString('name');
                    await channel.setName(newName);
                    return interaction.reply({ content: `✏️ Channel renamed to **${newName}**.` });

                default:
                    return interaction.reply({ content: '❓ Unknown subcommand.', ephemeral: true });
            }
        } catch (err) {
            console.error(`❌ Error handling '${subcommand}':`, err);
            return interaction.reply({ content: `❌ Failed to perform '${subcommand}'. Please check bot permissions.`, ephemeral: true });
        }
    }
};
