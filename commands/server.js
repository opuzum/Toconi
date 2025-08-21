const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Get information or an invite link for this server')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Display detailed information about this server')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('invite')
                .setDescription('Provides an invite link to join this server.')
        ),

    async execute(interaction) {
        const guild = interaction.guild;

        if (!guild) {
            return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'info': {
                const owner = await guild.fetchOwner();

                const embed = new EmbedBuilder()
                    .setColor(0x00AEFF)
                    .setTitle(`Server Info: ${guild.name}`)
                    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
                    .addFields(
                        { name: 'Server ID', value: `\`${guild.id}\``, inline: true },
                        { name: 'Owner', value: `${owner.user.tag} (\`${owner.id}\`)`, inline: true },
                        { name: 'Members', value: `${guild.memberCount}`, inline: true },
                        { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0} (Level ${guild.premiumTier})`, inline: true },
                        { name: 'Created On', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
                        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
                        { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true }
                    )
                    .setFooter({ text: `Requested by ${interaction.user.tag}` });

                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'invite': {
                try {
                    const firstTextChannel = guild.channels.cache.find(
                        channel => channel.type === ChannelType.GuildText && channel.viewable
                    );

                    if (!firstTextChannel) {
                        return interaction.reply({ content: 'Could not find a visible text channel to create an invite.', ephemeral: true });
                    }

                    const botMember = await guild.members.fetch(interaction.client.user.id);
                    if (!botMember.permissionsIn(firstTextChannel).has(PermissionFlagsBits.CreateInstantInvite)) {
                        return interaction.reply({
                            content: 'I do not have the permission to create instant invites in any channel.',
                            ephemeral: true
                        });
                    }

                    const invite = await firstTextChannel.createInvite({
                        maxUses: 0,
                        maxAge: 0,
                        unique: true,
                        reason: 'Requested via /server invite command'
                    });

                    await interaction.reply({
                        content: `Here is an invite link for **${guild.name}**: ${invite.url}`,
                        ephemeral: false
                    });

                } catch (error) {
                    console.error('Error creating invite:', error);
                    if (error.code === 50013) {
                        await interaction.reply({
                            content: 'I do not have the necessary permissions to create an invite link.',
                            ephemeral: true
                        });
                    } else {
                        await interaction.reply({
                            content: `An unexpected error occurred while creating the invite: ${error.message}`,
                            ephemeral: true
                        });
                    }
                }
                break;
            }

            default:
                await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
                break;
        }
    }
};
