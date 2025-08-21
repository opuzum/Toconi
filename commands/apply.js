const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const Application = require('../models/Application.js');
const ApplicationPanel = require('../models/ApplicationPanel.js');
const { updateApplicationPanels } = require('../utils/applicationUtils.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply')
        .setDescription('Manage application forms.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Creates a new application form.')
                .addChannelOption(option =>
                    option.setName('logs_channel')
                        .setDescription('The channel where application submissions will be sent.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('add_buttons')
                        .setDescription('Add Approve and Deny buttons to submissions.')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edits an existing application form.')
                .addStringOption(option =>
                    option.setName('app_name')
                        .setDescription('The name of the application to edit.')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommandGroup(subcommandGroup =>
            subcommandGroup
                .setName('send')
                .setDescription('Send an application panel to a channel.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('menu')
                        .setDescription('Send a panel with a menu of all application forms to a channel.')
                        .addChannelOption(option =>
                            option.setName('target_channel')
                                .setDescription('The channel to send the application panel to.')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('single')
                        .setDescription('Send a single application button to a channel.')
                        .addStringOption(option =>
                            option.setName('app_name')
                                .setDescription('The name of the application to send.')
                                .setRequired(true)
                                .setAutocomplete(true))
                        .addChannelOption(option =>
                            option.setName('target_channel')
                                .setDescription('The channel to send the application button to.')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true))))
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Shows all applications created for this server.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete an existing application form.')
                .addStringOption(option =>
                    option.setName('app_name')
                        .setDescription('The name of the application form to delete.')
                        .setRequired(true)
                        .setAutocomplete(true))),
    category: 'Utility',
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const applications = await Application.find({ guildId: interaction.guild.id });
        const choices = applications.map(app => app.name);
        const filtered = choices.filter(choice => choice.startsWith(focusedValue));
        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice })),
        );
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const subcommandGroup = interaction.options.getSubcommandGroup(false);

        // Using a switch statement for better readability
        switch (subcommand) {
            case 'create': {
                const logsChannel = interaction.options.getChannel('logs_channel');
                const addButtons = interaction.options.getBoolean('add_buttons') ?? false;

                // Send a reply immediately if the bot lacks permissions
                if (!interaction.guild.members.me.permissionsIn(logsChannel).has(PermissionFlagsBits.SendMessages)) {
                    return interaction.reply({ content: '❌ I do not have permission to send messages in the specified logs channel. Please grant me the necessary permissions.', ephemeral: true });
                }

                // Show the modal as the first response
                const modal = new ModalBuilder()
                    .setCustomId(`createApplicationModal-${logsChannel.id}-${addButtons}`)
                    .setTitle('Create New Application Form');
                const appNameInput = new TextInputBuilder()
                    .setCustomId('appName')
                    .setLabel('Application Name')
                    .setPlaceholder('e.g., "Moderator Application"')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(100);
                const questionsInput = new TextInputBuilder()
                    .setCustomId('questions')
                    .setLabel('Application Questions (one per line, max 5)')
                    .setPlaceholder('E.g., What is your experience?\nWhy do you want to join?')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(appNameInput),
                    new ActionRowBuilder().addComponents(questionsInput)
                );
                
                await interaction.showModal(modal);
                break;
            }
            case 'edit': {
                const appName = interaction.options.getString('app_name');
                const application = await Application.findOne({ guildId: interaction.guild.id, name: appName });

                // Send a reply immediately if the application is not found
                if (!application) {
                    return interaction.reply({ content: `❌ An application named "${appName}" was not found.`, ephemeral: true });
                }

                // Show the modal as the first response
                const modal = new ModalBuilder()
                    .setCustomId(`editApplicationModal-${application._id.toString()}`)
                    .setTitle(`Editing: ${application.name}`);
                const appNameInput = new TextInputBuilder()
                    .setCustomId('appName')
                    .setLabel('Application Name')
                    .setPlaceholder('e.g., "Moderator Application"')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(100)
                    .setValue(application.name);
                const logsChannelInput = new TextInputBuilder()
                    .setCustomId('logsChannelId')
                    .setLabel('Logs Channel ID')
                    .setPlaceholder('e.g., "123456789012345678"')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue(application.logsChannelId);
                const questionsInput = new TextInputBuilder()
                    .setCustomId('questions')
                    .setLabel('Application Questions (one per line, max 5)')
                    .setPlaceholder('E.g., What is your experience?\nWhy do you want to join?')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setValue(application.questions.map(q => q.text).join('\n'));
                const addButtonsInput = new TextInputBuilder()
                    .setCustomId('addButtons')
                    .setLabel('Add Approve/Deny Buttons? (true/false)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue(application.addButtons.toString());

                modal.addComponents(
                    new ActionRowBuilder().addComponents(appNameInput),
                    new ActionRowBuilder().addComponents(logsChannelInput),
                    new ActionRowBuilder().addComponents(questionsInput),
                    new ActionRowBuilder().addComponents(addButtonsInput)
                );
                
                await interaction.showModal(modal);
                break;
            }
            case 'show': {
                await interaction.deferReply({ ephemeral: true });
                const applications = await Application.find({ guildId: interaction.guild.id });

                if (applications.length === 0) {
                    return interaction.followUp({ content: '❌ There are no applications created for this server yet. Use `/apply create` to get started.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle('Server Applications')
                    .setDescription('A list of all created application forms.')
                    .setColor('Blue')
                    .setTimestamp();
                
                for (const app of applications) {
                    const questionsList = app.questions.map((q, i) => `${i + 1}. ${q.text}`).join('\n');
                    embed.addFields({
                        name: `__${app.name}__`,
                        value: `**ID:** \`${app._id.toString()}\`\n**Logs Channel:** <#${app.logsChannelId}>\n**Has Buttons:** \`${app.addButtons}\`\n**Questions:**\n${questionsList}`,
                        inline: false,
                    });
                }
                
                await interaction.followUp({ embeds: [embed], ephemeral: true });
                break;
            }
            case 'delete': {
                await interaction.deferReply({ ephemeral: true });
                const appName = interaction.options.getString('app_name');
                const application = await Application.findOne({ guildId: interaction.guild.id, name: appName });

                if (!application) {
                    return interaction.followUp({ content: `❌ An application named "${appName}" was not found.`, ephemeral: true });
                }

                try {
                    await Application.deleteOne({ _id: application._id });
                    const panels = await ApplicationPanel.find({ guildId: interaction.guild.id });
                    if (panels.length > 0) {
                        const applications = await Application.find({ guildId: interaction.guild.id });
                        await updateApplicationPanels(interaction.client, panels, applications);
                    }
                    await interaction.followUp({ content: `✅ Application "${appName}" has been successfully deleted. Existing panels have been updated.`, ephemeral: true });
                } catch (error) {
                    console.error('Error deleting application and updating panels:', error);
                    await interaction.followUp({ content: '❌ An error occurred while deleting the application. Please try again.', ephemeral: true });
                }
                break;
            }
        }

        if (subcommandGroup === 'send') {
            const targetChannel = interaction.options.getChannel('target_channel');
            
            // Check for permissions before any reply is sent
            if (!interaction.guild.members.me.permissionsIn(targetChannel).has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({ content: '❌ I do not have permission to send messages in that channel.', ephemeral: true });
            }

            if (subcommand === 'menu') {
                // This subcommand sends a direct message, so defer is used.
                await interaction.deferReply({ ephemeral: true });
                const applications = await Application.find({ guildId: interaction.guild.id });

                if (applications.length === 0) {
                    return interaction.followUp({ content: '❌ There are no applications created for this server yet. Use `/apply create` to get started.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`Applications for ${interaction.guild.name}`)
                    .setDescription('Select an application from the menu below to start filling it out.')
                    .setColor('Blue');

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`selectApplicationMenu`)
                    .setPlaceholder('Select an application...')
                    .setMinValues(1)
                    .setMaxValues(1);
                
                for (const app of applications) {
                    selectMenu.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(app.name)
                            .setValue(app._id.toString())
                    );
                }

                const actionRow = new ActionRowBuilder().addComponents(selectMenu);
                
                try {
                    const panelMessage = await targetChannel.send({ embeds: [embed], components: [actionRow] });
                    await ApplicationPanel.findOneAndUpdate(
                        { guildId: interaction.guild.id, channelId: targetChannel.id },
                        { messageId: panelMessage.id },
                        { upsert: true, new: true }
                    );
                    await interaction.followUp({ content: `✅ Application menu panel has been sent to ${targetChannel}!`, ephemeral: true });
                } catch (error) {
                    console.error('Error sending application menu panel:', error);
                    await interaction.followUp({ content: '❌ An error occurred while sending the application menu panel. Please check my permissions in that channel.', ephemeral: true });
                }
            } else if (subcommand === 'single') {
                // No defer needed, as showModal is the first reply
                const appName = interaction.options.getString('app_name');
                const application = await Application.findOne({ guildId: interaction.guild.id, name: appName });
                const targetChannel = interaction.options.getChannel('target_channel');

                if (!application) {
                    return interaction.reply({ content: `❌ An application named "${appName}" was not found.`, ephemeral: true });
                }

                const modal = new ModalBuilder()
                    .setCustomId(`customApplicationEmbedModal-${application._id}-${targetChannel.id}`)
                    .setTitle(`Customize Application Panel for ${application.name}`);

                const embedTitleInput = new TextInputBuilder()
                    .setCustomId('embedTitle')
                    .setLabel('Embed Title')
                    .setPlaceholder(`e.g., "${application.name} Application"`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue(application.name);

                const embedDescriptionInput = new TextInputBuilder()
                    .setCustomId('embedDescription')
                    .setLabel('Embed Description')
                    .setPlaceholder('e.g., "Click the button below to start your application."')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setValue('Click the button below to start your application.');

                const embedColorInput = new TextInputBuilder()
                    .setCustomId('embedColor')
                    .setLabel('Embed Color (Name or Hex)')
                    .setPlaceholder('e.g., "blue" or "#0000FF"')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue('blue');

                const buttonTextInput = new TextInputBuilder()
                    .setCustomId('buttonText')
                    .setLabel('Button Text')
                    .setPlaceholder('e.g., "Apply Now"')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue(`Start ${application.name}`);

                const buttonEmojiInput = new TextInputBuilder()
                    .setCustomId('buttonEmoji')
                    .setLabel('Button Emoji (optional)')
                    .setPlaceholder('e.g., 📝')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(10);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(embedTitleInput),
                    new ActionRowBuilder().addComponents(embedDescriptionInput),
                    new ActionRowBuilder().addComponents(embedColorInput),
                    new ActionRowBuilder().addComponents(buttonTextInput),
                    new ActionRowBuilder().addComponents(buttonEmojiInput)
                );
                
                await interaction.showModal(modal);
            }
        }
    },
};

