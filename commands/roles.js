
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Manage roles for users in this server.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
        // Subcommand to add a role
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Give a role to a user')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('User to give the role to')
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to assign')
                        .setRequired(true)
                )
        )
        // Subcommand to remove a role
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role from a user')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('User to remove the role from')
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to remove')
                        .setRequired(true)
                )
        ),
    category: 'Moderation',

    async execute(interaction) {
        const guild = interaction.guild;
        const memberInvoker = interaction.member;
        const targetUser = interaction.options.getUser('target');
        const subcommand = interaction.options.getSubcommand();

        const memberTarget = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!memberTarget) {
            return interaction.reply({ content: 'That user is not a member of this server.', ephemeral: true });
        }

        const roleToModify = interaction.options.getRole('role');

        const isOwner = guild.ownerId === interaction.user.id;
        const hasManageRoles = memberInvoker.permissions.has(PermissionsBitField.Flags.ManageRoles);

        if (!isOwner && !hasManageRoles) {
            return interaction.reply({
                content: 'You do not have the required permissions to manage roles.',
                ephemeral: true,
            });
        }

        if (!isOwner && memberInvoker.roles.highest.position <= roleToModify.position) {
            return interaction.reply({
                content: `You cannot ${subcommand} a role that is higher or equal to your highest role.`,
                ephemeral: true,
            });
        }

        const botMember = guild.members.me;
        if (botMember.roles.highest.position <= roleToModify.position) {
            return interaction.reply({
                content: `I cannot ${subcommand} that role because it is higher or equal to my highest role.`,
                ephemeral: true,
            });
        }

        if (memberTarget.id === guild.ownerId) {
            return interaction.reply({
                content: 'You cannot manage roles for the server owner.',
                ephemeral: true,
            });
        }

        if (!isOwner && memberTarget.roles.highest.position >= memberInvoker.roles.highest.position) {
            return interaction.reply({
                content: 'You cannot manage roles for a user with a higher or equal role.',
                ephemeral: true,
            });
        }

        try {
            if (subcommand === 'add') {
                if (memberTarget.roles.cache.has(roleToModify.id)) {
                    return interaction.reply({
                        content: `User **${targetUser.tag}** already has the role **${roleToModify.name}**.`,
                        ephemeral: true,
                    });
                }
                await memberTarget.roles.add(roleToModify);
                return interaction.reply({
                    content: `Successfully gave the **${roleToModify.name}** role to **${targetUser.tag}**.`,
                    ephemeral: false,
                });
            } else if (subcommand === 'remove') {
                if (!memberTarget.roles.cache.has(roleToModify.id)) {
                    return interaction.reply({
                        content: `User **${targetUser.tag}** does not have the **${roleToModify.name}** role.`,
                        ephemeral: true,
                    });
                }
                await memberTarget.roles.remove(roleToModify);
                return interaction.reply({
                    content: `Successfully removed the **${roleToModify.name}** role from **${targetUser.tag}**.`,
                    ephemeral: false,
                });
            }
        } catch (error) {
            console.error(`Error during role ${subcommand}:`, error);
            return interaction.reply({
                content: `An error occurred while trying to ${subcommand} the role. Please check my permissions.`,
                ephemeral: true,
            });
        }
    },
};
