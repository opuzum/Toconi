const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Reference the UserWarnings model instead of defining it.
const UserWarnings = mongoose.model('UserWarnings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Manage user warnings')
        // Subcommand to view warnings
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View all warnings for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check warnings for')
                        .setRequired(true)
                )
        )
        // Subcommand to add a warning
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Warn a user with a reason')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to warn')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for the warning')
                        .setRequired(false)
                )
        )
        // Subcommand to remove a specific warning
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a specific warning from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove warning from')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('warning_number')
                        .setDescription('Warning number to remove (e.g., 1)')
                        .setRequired(true)
                )
        )
        // Subcommand to clear all warnings
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all warnings for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User whose warnings you want to clear')
                        .setRequired(true)
                )
        ),
    category: 'Moderation',

    async execute(interaction) {
        const executor = interaction.member;
        const guildId = interaction.guild.id;

        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('user');
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: 'That user is not a member of this server.', ephemeral: true });
        }

        const isAdmin = executor.permissions.has(PermissionsBitField.Flags.Administrator);
        const isOwner = executor.id === interaction.guild.ownerId;

        // Fetch user data from the database
        let userData = await UserWarnings.findOne({ guildId: guildId, userId: targetUser.id });

        if (subcommand !== 'add') {
            if (!isAdmin && !isOwner) {
                return interaction.reply({ content: 'You do not have permission for this action.', ephemeral: true });
            }
            if (!isOwner && targetMember.roles.highest.position >= executor.roles.highest.position) {
                return interaction.reply({ content: 'You cannot manage warnings for a user with a higher or equal role.', ephemeral: true });
            }
        }

        switch (subcommand) {
            case 'view': {
                const isSelf = targetUser.id === executor.id;

                if (!isSelf && !isAdmin) {
                    return interaction.reply({ content: 'You do not have permission to view other users\' warnings.', ephemeral: true });
                }

                if (!userData || userData.warnings.length === 0) {
                    const noWarningsText = isSelf ? 'You have no warnings.' : `User **${targetUser.tag}** has no warnings.`;
                    return interaction.reply({ content: noWarningsText, ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor(0xFFCC00)
                    .setTitle(`Warnings for ${targetUser.tag}`)
                    .setFooter({ text: `Total warnings: ${userData.warnings.length}` });

                userData.warnings.forEach(warn => {
                    embed.addFields({
                        name: `Warning #${warn.warnNumber}`,
                        value: `**Reason:** ${warn.reason}\n**Timestamp:** <t:${Math.floor(new Date(warn.timestamp).getTime() / 1000)}:F>\n**Admin:** <@${warn.adminId}>`,
                        inline: false
                    });
                });

                await interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            }

            case 'add': {
                await interaction.deferReply({ ephemeral: true });

                const reason = interaction.options.getString('reason') || 'No reason provided.';
                const adminId = interaction.user.id;

                if (!isAdmin) {
                    return interaction.editReply({ content: 'You must be an administrator to add a warning.' });
                }

                if (targetMember.user.bot) {
                    return interaction.editReply({ content: 'You cannot warn a bot.' });
                }

                if (targetMember.id === executor.id) {
                    return interaction.editReply({ content: 'You cannot warn yourself.' });
                }

                if (targetMember.roles.highest.position >= executor.roles.highest.position && !isOwner) {
                    return interaction.editReply({ content: 'You cannot warn a user with a higher or equal role.' });
                }

                const newWarning = {
                    reason,
                    timestamp: new Date(),
                    adminId,
                    warnNumber: userData ? userData.warnings.length + 1 : 1
                };

                userData = await UserWarnings.findOneAndUpdate(
                    { guildId: guildId, userId: targetUser.id },
                    { $push: { warnings: newWarning } },
                    { new: true, upsert: true }
                );

                const totalWarnings = userData.warnings.length;

                if (totalWarnings >= 5) {
                    try {
                        const timeoutMs = 7 * 24 * 60 * 60 * 1000;
                        await targetMember.timeout(timeoutMs, `Automatic timeout for reaching 5 warnings.`);
                        await UserWarnings.deleteOne({ guildId: guildId, userId: targetUser.id });

                        await interaction.editReply({
                            content: `User **${targetUser.tag}** has received their ${totalWarnings}th warning and has been timed out for 7 days. All their warnings have been cleared.`,
                            ephemeral: false
                        });
                        return;
                    } catch (error) {
                        console.error('Timeout error:', error);
                        await interaction.editReply({ content: 'Failed to timeout the user. Please check bot permissions.' });
                        return;
                    }
                }

                const embed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('User Warning')
                    .addFields(
                        { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Warning Number', value: `${totalWarnings}`, inline: true },
                        { name: 'Total Warnings', value: `${totalWarnings}`, inline: true },
                        { name: 'Admin', value: `<@${adminId}>`, inline: true },
                        { name: 'Time', value: `<t:${Math.floor(new Date().getTime() / 1000)}:F>`, inline: true }
                    );

                await interaction.editReply({ embeds: [embed], ephemeral: false });
                break;
            }

            case 'remove': {
                await interaction.deferReply({ ephemeral: true });
                const warningNumber = interaction.options.getInteger('warning_number');

                if (!userData || userData.warnings.length === 0) {
                    return interaction.editReply({ content: `User **${targetUser.tag}** has no warnings to remove.` });
                }

                const index = userData.warnings.findIndex(w => w.warnNumber === warningNumber);
                if (index === -1) {
                    return interaction.editReply({ content: `Warning number ${warningNumber} not found for user **${targetUser.tag}**.` });
                }

                await UserWarnings.updateOne(
                    { guildId: guildId, userId: targetUser.id },
                    { $pull: { warnings: { warnNumber: warningNumber } } }
                );

                userData = await UserWarnings.findOne({ guildId: guildId, userId: targetUser.id });
                if (userData) {
                    userData.warnings.forEach((warn, i) => warn.warnNumber = i + 1);
                    await userData.save();
                }

                if (userData && userData.warnings.length === 0) {
                     await UserWarnings.deleteOne({ guildId: guildId, userId: targetUser.id });
                }

                await interaction.editReply({ content: `Successfully removed warning #${warningNumber} for user **${targetUser.tag}**.` });
                break;
            }

            case 'clear': {
                if (!userData || userData.warnings.length === 0) {
                    return interaction.reply({ content: `User **${targetUser.tag}** has no warnings to clear.`, ephemeral: true });
                }

                await UserWarnings.deleteOne({ guildId: guildId, userId: targetUser.id });

                await interaction.reply({ content: `All warnings for user **${targetUser.tag}** have been cleared.`, ephemeral: true });
                break;
            }

            default:
                await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
                break;
        }
    }
};

