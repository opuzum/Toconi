const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require("discord.js");
const profileSchema = require("../models/profileSchema.js");
const Poll = require('../models/Poll.js');
const { Ticket, TicketPanel } = require('../models/Tickets.js');
const Application = require('../models/Application.js');
const ApplicationPanel = require('../models/ApplicationPanel.js');
const mongoose = require('mongoose');
const Server = require('../models/serverSchema.js');
const { updateApplicationPanels } = require('../utils/applicationUtils.js');

const COLORS_MAP = {
    'red': '#FF0000', 'green': '#00FF00', 'blue': '#0000FF', 'yellow': '#FFFF00',
    'cyan': '#00FFFF', 'magenta': '#FF00FF', 'white': '#FFFFFF', 'black': '#000000',
    'grey': '#808080', 'orange': '#FFA500', 'purple': '#800080', 'pink': '#FFC0CB',
    'brown': '#A52A2A', 'dark red': '#8B0000', 'crimson': '#DC143C', 'firebrick': '#B22222',
    'indian red': '#CD5C5C', 'dark green': '#006400', 'lime green': '#32CD32', 'forest green': '#228B22',
    'olive': '#808000', 'sea green': '#2E8B57', 'dark blue': '#00008B', 'royal blue': '#4169E1',
    'sky blue': '#87CEEB', 'deep sky blue': '#00BFFF', 'navy': '#000080', 'gold': '#FFD700',
    'dark orange': '#FF8C00', 'coral': '#FF7F50', 'salmon': '#FA8072', 'indigo': '#4B0082',
    'violet': '#EE82EE', 'orchid': '#DA70D6', 'hot pink': '#FF69B4', 'dark grey': '#A9A9A9',
    'light grey': '#D3D3D3', 'slate grey': '#708090', 'dark brown': '#654321', 'chocolate': '#D2691E',
};

async function handleApplicationSelectMenu(interaction) {
    const appId = interaction.values[0];
    const application = await Application.findById(appId);
    if (!application) {
        return interaction.reply({ content: 'Application not found.', flags: [MessageFlags.Ephemeral] });
    }
    const modal = new ModalBuilder()
        .setCustomId(`submitApplicationModal-${appId}`)
        .setTitle(`Submit Application for ${application.name}`);
    let questionIndex = 0;
    for (const questionObj of application.questions) {
        const questionText = questionObj.text;
        const isRequired = !questionText.toLowerCase().includes('(optional)');
        const label = questionText.replace(/\s*\(optional\)\s*/i, '').trim();
        if (label.length > 100) {
            return interaction.reply({ content: 'Question label is too long.', flags: [MessageFlags.Ephemeral] });
        }
        const questionInput = new TextInputBuilder()
            .setCustomId(`q-${questionIndex}`)
            .setLabel(label)
            .setStyle(label.length > 50 ? TextInputStyle.Paragraph : TextInputStyle.Short)
            .setRequired(isRequired);
        modal.addComponents(new ActionRowBuilder().addComponents(questionInput));
        questionIndex++;
    }
    await interaction.showModal(modal);
}

async function handleStartApplicationButton(interaction) {
    const appId = interaction.customId.split('-')[1];
    const application = await Application.findById(appId);
    if (!application) {
        return interaction.reply({ content: 'Application not found.', flags: [MessageFlags.Ephemeral] });
    }
    const modal = new ModalBuilder()
        .setCustomId(`submitApplicationModal-${appId}`)
        .setTitle(`Submit Application for ${application.name}`);
    let questionIndex = 0;
    for (const questionObj of application.questions) {
        const questionText = questionObj.text;
        const isRequired = !questionText.toLowerCase().includes('(optional)');
        const label = questionText.replace(/\s*\(optional\)\s*/i, '').trim();
        if (label.length > 100) {
            return interaction.reply({ content: 'Question label is too long.', flags: [MessageFlags.Ephemeral] });
        }
        const questionInput = new TextInputBuilder()
            .setCustomId(`q-${questionIndex}`)
            .setLabel(label)
            .setStyle(label.length > 50 ? TextInputStyle.Paragraph : TextInputStyle.Short)
            .setRequired(isRequired);
        modal.addComponents(new ActionRowBuilder().addComponents(questionInput));
        questionIndex++;
    }
    await interaction.showModal(modal);
}

async function handleModeratorApplicationSubmit(interaction, client) {
    try {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const reason = interaction.fields.getTextInputValue('reason');
        const experience = interaction.fields.getTextInputValue('experience');
        const applicationChannel = await client.channels.fetch('YOUR_APPLICATION_CHANNEL_ID');
        if (!applicationChannel) {
            console.error('Application channel not found. Please set a valid channel ID.');
            return interaction.editReply({ content: 'Application channel not found. Please contact an administrator.', flags: [MessageFlags.Ephemeral] });
        }
        const applicationEmbed = new EmbedBuilder()
            .setTitle('New Moderator Application')
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setColor('Purple')
            .addFields(
                { name: 'Why do you want to be a moderator?', value: reason },
                { name: 'Do you have any prior experience?', value: experience }
            )
            .setTimestamp();
        await applicationChannel.send({ embeds: [applicationEmbed] });
        await interaction.editReply({ content: 'Your application has been submitted successfully!', flags: [MessageFlags.Ephemeral] });
    } catch (error) {
        console.error('Error handling moderator application submission:', error);
        await interaction.editReply({ content: 'An error occurred while submitting your application.', flags: [MessageFlags.Ephemeral] });
    }
}

async function handleCreateApplicationModal(interaction, client) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const [_, logsChannelId, addButtonsStr] = interaction.customId.split('-');
    const addButtons = addButtonsStr === 'true';
    const appName = interaction.fields.getTextInputValue('appName');
    const questionsText = interaction.fields.getTextInputValue('questions');
    const questionsArray = questionsText.split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0);
    if (questionsArray.length > 5) {
        return interaction.editReply({ content: 'You can only have up to 5 questions.', flags: [MessageFlags.Ephemeral] });
    }
    if (questionsArray.length === 0) {
        return interaction.editReply({ content: 'You must provide at least one question.', flags: [MessageFlags.Ephemeral] });
    }
    const applicationQuestions = questionsArray.map(q => ({ text: q }));
    try {
        const newApplication = new Application({
            guildId: interaction.guild.id,
            name: appName,
            logsChannelId: logsChannelId,
            questions: applicationQuestions,
            addButtons: addButtons,
        });
        await newApplication.save();
        const panels = await ApplicationPanel.find({ guildId: interaction.guild.id });
        if (panels.length > 0) {
            const applications = await Application.find({ guildId: interaction.guild.id });
            await updateApplicationPanels(client, panels, applications);
        }
        return interaction.editReply({ content: `Application '${appName}' created successfully. Submissions will be sent to <#${logsChannelId}>.`, flags: [MessageFlags.Ephemeral] });
    } catch (error) {
        console.error('Error creating new application:', error);
        return interaction.editReply({ content: 'An unexpected error occurred while creating the application.', flags: [MessageFlags.Ephemeral] });
    }
}

async function handleEditApplicationModal(interaction, client) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const [_, appId] = interaction.customId.split('-');
    const application = await Application.findById(appId);
    if (!application) {
        return interaction.editReply({ content: 'Application not found.', flags: [MessageFlags.Ephemeral] });
    }
    const appName = interaction.fields.getTextInputValue('appName');
    const logsChannelId = interaction.fields.getTextInputValue('logsChannelId');
    const questionsText = interaction.fields.getTextInputValue('questions');
    const addButtonsStr = interaction.fields.getTextInputValue('addButtons').toLowerCase();
    const addButtons = addButtonsStr === 'true';
    const questionsArray = questionsText.split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0);
    if (questionsArray.length > 5) {
        return interaction.editReply({ content: 'You can only have up to 5 questions.', flags: [MessageFlags.Ephemeral] });
    }
    if (questionsArray.length === 0) {
        return interaction.editReply({ content: 'You must provide at least one question.', flags: [MessageFlags.Ephemeral] });
    }
    const applicationQuestions = questionsArray.map(q => ({ text: q }));
    try {
        application.name = appName;
        application.logsChannelId = logsChannelId;
        application.questions = applicationQuestions;
        application.addButtons = addButtons;
        await application.save();
        const panels = await ApplicationPanel.find({ guildId: interaction.guild.id });
        if (panels.length > 0) {
            const applications = await Application.find({ guildId: interaction.guild.id });
            await updateApplicationPanels(client, panels, applications);
        }
        return interaction.editReply({ content: `Application '${appName}' has been updated successfully.`, flags: [MessageFlags.Ephemeral] });
    } catch (error) {
        console.error('Error editing application:', error);
        return interaction.editReply({ content: 'An unexpected error occurred while editing the application.', flags: [MessageFlags.Ephemeral] });
    }
}

async function handleCustomApplicationEmbedModal(interaction, client) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const [_, appId, channelId] = interaction.customId.split('-');
    const application = await Application.findById(appId);
    if (!application) {
        return interaction.editReply({ content: 'Application not found.', flags: [MessageFlags.Ephemeral] });
    }
    const targetChannel = await client.channels.fetch(channelId);
    if (!targetChannel) {
        return interaction.editReply({ content: 'The specified channel was not found.', flags: [MessageFlags.Ephemeral] });
    }
    if (!interaction.guild.members.me.permissionsIn(targetChannel).has(PermissionsBitField.Flags.SendMessages)) {
        return interaction.editReply({ content: 'I do not have permission to send messages in that channel.', flags: [MessageFlags.Ephemeral] });
    }
    const embedTitle = interaction.fields.getTextInputValue('embedTitle');
    const embedDescription = interaction.fields.getTextInputValue('embedDescription');
    const embedColorInput = interaction.fields.getTextInputValue('embedColor');
    const buttonText = interaction.fields.getTextInputValue('buttonText');
    const buttonEmoji = interaction.fields.getTextInputValue('buttonEmoji');
    let color = COLORS_MAP[embedColorInput.toLowerCase()] || embedColorInput;
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
        color = 'Blue';
        interaction.followUp({ content: `The color "${embedColorInput}" is not a valid color name or hex code. The embed color has been defaulted to blue.`, flags: [MessageFlags.Ephemeral] });
    }
    const embed = new EmbedBuilder()
        .setTitle(embedTitle)
        .setDescription(embedDescription)
        .setColor(color);
    const button = new ButtonBuilder()
        .setCustomId(`startApplication-${application._id}`)
        .setLabel(buttonText)
        .setStyle(ButtonStyle.Success);
    if (buttonEmoji) {
        button.setEmoji(buttonEmoji);
    }
    const actionRow = new ActionRowBuilder().addComponents(button);
    try {
        await targetChannel.send({ embeds: [embed], components: [actionRow] });
        await interaction.editReply({ content: `✅ Custom application panel for "${application.name}" has been sent to ${targetChannel}!`, flags: [MessageFlags.Ephemeral] });
    } catch (error) {
        console.error('Error sending custom application panel:', error);
        await interaction.editReply({ content: '❌ An error occurred while sending the application panel. Please check my permissions in that channel.', flags: [MessageFlags.Ephemeral] });
    }
}

async function handleSubmitApplicationModal(interaction, client) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const [_, appId] = interaction.customId.split('-');
    const application = await Application.findById(appId);
    if (!application) {
        return interaction.editReply({ content: 'Application not found.', flags: [MessageFlags.Ephemeral] });
    }
    if (!application.logsChannelId) {
        return interaction.editReply({ content: 'This application is misconfigured. Please contact an administrator.', flags: [MessageFlags.Ephemeral] });
    }
    const logsChannel = await client.channels.fetch(application.logsChannelId);
    if (!logsChannel) {
        return interaction.editReply({ content: 'The logs channel for this application could not be found. Please contact an administrator.', flags: [MessageFlags.Ephemeral] });
    }
    const applicationEmbed = new EmbedBuilder()
        .setTitle(`New Submission: ${application.name}`)
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setColor('Blurple')
        .setTimestamp()
        .setFooter({ text: `User ID: ${interaction.user.id}` });
    for (let i = 0; i < application.questions.length; i++) {
        const questionLabel = application.questions[i].text.replace(/\s*\(optional\)\s*/i, '').trim();
        const answer = interaction.fields.getTextInputValue(`q-${i}`);
        applicationEmbed.addFields({ name: questionLabel, value: answer || 'N/A' });
    }
    try {
        let components = [];
        if (application.addButtons) {
            const approveButton = new ButtonBuilder()
                .setCustomId(`approveApplication-${interaction.user.id}`)
                .setLabel('Approve')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅');
            const denyButton = new ButtonBuilder()
                .setCustomId(`denyApplication-${interaction.user.id}`)
                .setLabel('Deny')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌');
            components.push(new ActionRowBuilder().addComponents(approveButton, denyButton));
        }
        await logsChannel.send({ embeds: [applicationEmbed], components: components });
        await interaction.editReply({ content: 'Your application has been submitted successfully!', flags: [MessageFlags.Ephemeral] });
    } catch (error) {
        console.error('Error sending application submission to logs channel:', error);
        await interaction.editReply({ content: 'An unexpected error occurred while submitting your application.', flags: [MessageFlags.Ephemeral] });
    }
}

async function handleApproveButton(interaction, client) {
    const userId = interaction.customId.split('-')[1];
    const user = await client.users.fetch(userId);
    if (!user) {
        return interaction.reply({ content: 'User not found.', flags: [MessageFlags.Ephemeral] });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: 'You do not have permission to approve applications.', flags: [MessageFlags.Ephemeral] });
    }
    try {
        const originalEmbed = interaction.message.embeds[0];
        const updatedEmbed = new EmbedBuilder(originalEmbed.toJSON())
            .setColor('Green')
            .addFields({ name: 'Status', value: `Approved by <@${interaction.user.id}>` });
        const disabledButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('approved').setLabel('Approved').setStyle(ButtonStyle.Success).setDisabled(true),
            new ButtonBuilder().setCustomId('denied').setLabel('Denied').setStyle(ButtonStyle.Danger).setDisabled(true)
        );
        await interaction.update({ embeds: [updatedEmbed], components: [disabledButtons] });
        await interaction.followUp({ content: `Application for <@${userId}> approved by <@${interaction.user.id}>.`, allowedMentions: { repliedUser: false } });
        await user.send(`Your application for **${originalEmbed.title.replace('New Submission: ', '')}** in **${interaction.guild.name}** has been approved!`);
    } catch (error) {
        console.error('Error handling approve button:', error);
        return interaction.followUp({ content: 'An unexpected error occurred while processing the request.', flags: [MessageFlags.Ephemeral] });
    }
}

async function handleDenyButton(interaction, client) {
    const userId = interaction.customId.split('-')[1];
    const user = await client.users.fetch(userId);
    if (!user) {
        return interaction.reply({ content: 'User not found.', flags: [MessageFlags.Ephemeral] });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: 'You do not have permission to deny applications.', flags: [MessageFlags.Ephemeral] });
    }
    try {
        const originalEmbed = interaction.message.embeds[0];
        const updatedEmbed = new EmbedBuilder(originalEmbed.toJSON())
            .setColor('Red')
            .addFields({ name: 'Status', value: `Denied by <@${interaction.user.id}>` });
        const disabledButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('approved').setLabel('Approved').setStyle(ButtonStyle.Success).setDisabled(true),
            new ButtonBuilder().setCustomId('denied').setLabel('Denied').setStyle(ButtonStyle.Danger).setDisabled(true)
        );
        await interaction.update({ embeds: [updatedEmbed], components: [disabledButtons] });
        await interaction.followUp({ content: `Application for <@${userId}> denied by <@${interaction.user.id}>.`, allowedMentions: { repliedUser: false } });
        await user.send(`Your application for **${originalEmbed.title.replace('New Submission: ', '')}** in **${interaction.guild.name}** has been denied.`);
    } catch (error) {
        console.error('Error handling deny button:', error);
        return interaction.followUp({ content: 'An unexpected error occurred while processing the request.', flags: [MessageFlags.Ephemeral] });
    }
}

function getPollResults(options) {
    let maxVotes = 0;
    let winners = [];

    options.forEach(option => {
        if (option.votes > maxVotes) {
            maxVotes = option.votes;
            winners = [option.text];
        } else if (option.votes === maxVotes && maxVotes > 0) {
            winners.push(option.text);
        }
    });

    if (maxVotes === 0) {
        return 'The poll ended with no votes.';
    }

    if (winners.length > 1) {
        return `It's a tie! The winning options are: ${winners.join(', ')} with ${maxVotes} votes each.`;
    } else {
        return `The winner is: **${winners[0]}** with ${maxVotes} votes!`;
    }
}

async function handlePollVote(interaction) {
    const pollData = await Poll.findOne({ messageId: interaction.message.id });
    if (!pollData) {
        return interaction.reply({ content: 'This poll has expired or was removed.', flags: [MessageFlags.Ephemeral] });
    }

    if (new Date() > pollData.endTime) {
        const finalResults = getPollResults(pollData.options);
        const disabledButtons = pollData.options.map((option, index) =>
            new ButtonBuilder()
                .setCustomId(`poll_vote_${index}`)
                .setLabel(`${option.text}: ${option.votes} votes`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true)
        );
        const updatedComponents = [new ActionRowBuilder().addComponents(disabledButtons)];

        const newEmbed = new EmbedBuilder(interaction.message.embeds[0].toJSON());
        newEmbed.setDescription(`**Poll has ended!**\n${finalResults}`);

        await interaction.update({ embeds: [newEmbed], components: updatedComponents });
        return interaction.followUp({ content: 'This poll has already ended. You can no longer vote.', flags: [MessageFlags.Ephemeral] });
    }

    const newOptionIndex = parseInt(interaction.customId.split('_')[2]);
    const userId = interaction.user.id;
    const existingVote = pollData.voters.find(voter => voter.userId === userId);
    if (existingVote) {
        const prevOptionIndex = existingVote.optionIndex;
        if (prevOptionIndex !== newOptionIndex) {
            pollData.options[prevOptionIndex].votes--;
            pollData.options[newOptionIndex].votes++;
            existingVote.optionIndex = newOptionIndex;
        }
    } else {
        pollData.options[newOptionIndex].votes++;
        pollData.voters.push({ userId, optionIndex: newOptionIndex });
    }

    const buttons = pollData.options.map((option, index) =>
        new ButtonBuilder()
            .setCustomId(`poll_vote_${index}`)
            .setLabel(`${option.text}: ${option.votes} votes`)
            .setStyle(ButtonStyle.Primary)
    );
    const updatedComponents = [new ActionRowBuilder().addComponents(buttons)];

    const newEmbed = new EmbedBuilder(interaction.message.embeds[0].toJSON());
    let descriptionText = `Poll ends <t:${Math.floor(pollData.endTime.getTime() / 1000)}:R>\n\n`;
    pollData.options.forEach(option => {
        descriptionText += `**${option.text}:** ${option.votes} votes\n`;
    });
    newEmbed.setDescription(descriptionText);

    await interaction.update({ embeds: [newEmbed], components: updatedComponents });
    await pollData.save();
}

async function handleCreateTicketButton(interaction, client) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const panelData = await TicketPanel.findOne({ panelMessageId: interaction.message.id });
    if (!panelData) {
        return interaction.followUp({ content: 'This ticket panel is misconfigured. Please contact an administrator.', flags: [MessageFlags.Ephemeral] });
    }
    const existingTicket = await Ticket.findOne({ ticketCreatorId: interaction.user.id, guildId: interaction.guild.id, status: 'open' });
    if (existingTicket) {
        return interaction.followUp({ content: `You already have an open ticket in <#${existingTicket.channelId}>.`, flags: [MessageFlags.Ephemeral] });
    }
    const guild = interaction.guild;
    const user = interaction.user;
    try {
        panelData.ticketCount++;
        await panelData.save();
        const ticketNumber = panelData.ticketCount;
        const ticketChannel = await guild.channels.create({
            name: `ticket-${ticketNumber}`,
            type: ChannelType.GuildText,
            parent: panelData.ticketChannelCategoryId,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                ...panelData.supportRoleIds.map(roleId => ({
                    id: roleId,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                })),
                {
                    id: client.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });
        const ticketEmbedTitle = panelData.ticketEmbed?.title || `Ticket #${ticketNumber} for ${user.tag}`;
        const ticketEmbedDescription = panelData.ticketEmbed?.description || 'A staff member will be with you shortly.';
        const ticketEmbed = new EmbedBuilder()
            .setTitle(ticketEmbedTitle)
            .setDescription(ticketEmbedDescription)
            .setColor('Green')
            .setTimestamp();
        const closeButton = new ButtonBuilder()
            .setCustomId(`closeTicketButton-${ticketChannel.id}`)
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒');
        const claimButton = new ButtonBuilder()
            .setCustomId(`claimTicketButton-${ticketChannel.id}`)
            .setLabel('Claim Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🙋‍♂️');
        const actionRow = new ActionRowBuilder().addComponents(claimButton, closeButton);
        await ticketChannel.send({ embeds: [ticketEmbed], components: [actionRow] });
        const supportRoleMentions = panelData.supportRoleIds.map(id => `<@&${id}>`).join(', ');
        await ticketChannel.send({ content: `<@${user.id}>, ${supportRoleMentions}` });
        await Ticket.create({
            panelMessageId: panelData.panelMessageId,
            guildId: guild.id,
            channelId: ticketChannel.id,
            ticketCreatorId: user.id,
            members: [user.id],
            supportRoles: panelData.supportRoleIds,
            ticketNumber: ticketNumber,
        });
        return interaction.followUp({ content: `Your ticket has been created: <#${ticketChannel.id}>`, flags: [MessageFlags.Ephemeral] });
    } catch (error) {
        console.error('Error creating ticket:', error);
        return interaction.followUp({ content: 'An error occurred while creating your ticket. Please try again later.', flags: [MessageFlags.Ephemeral] });
    }
}

async function handleClaimTicketButton(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const channelId = interaction.customId.split('-')[1];
    const ticket = await Ticket.findOne({ channelId: channelId });
    if (!ticket) {
        return interaction.followUp({ content: 'Ticket not found in the database. It might have already been deleted.', flags: [MessageFlags.Ephemeral] });
    }
    const hasSupportRole = interaction.member.roles.cache.some(role => ticket.supportRoles.includes(role.id));
    if (!hasSupportRole) {
        return interaction.followUp({ content: 'You do not have permission to claim this ticket.', flags: [MessageFlags.Ephemeral] });
    }
    if (ticket.claimedBy) {
        return interaction.followUp({ content: `This ticket is already claimed by <@${ticket.claimedBy}>.`, flags: [MessageFlags.Ephemeral] });
    }
    ticket.claimedBy = interaction.user.id;
    await ticket.save();
    const channel = interaction.channel;
    const newEmbed = new EmbedBuilder(interaction.message.embeds[0].toJSON())
        .setDescription(`This ticket has been claimed by <@${interaction.user.id}>.`)
        .setColor('Yellow')
        .addFields({ name: 'Claimed By', value: `<@${interaction.user.id}>` });
    const closeButton = new ButtonBuilder()
        .setCustomId(`closeTicketButton-${channelId}`)
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');
    const unclaimButton = new ButtonBuilder()
        .setCustomId(`unclaimTicketButton-${channelId}`)
        .setLabel('Unclaim Ticket')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('↩️');
    const updatedRow = new ActionRowBuilder().addComponents(unclaimButton, closeButton);
    await interaction.message.edit({ embeds: [newEmbed], components: [updatedRow] });
    await channel.send({ content: `<@${interaction.user.id}> has claimed this ticket.` });
    await interaction.editReply({ content: 'You have successfully claimed this ticket.', flags: [MessageFlags.Ephemeral] });
}

async function handleUnclaimTicketButton(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const channelId = interaction.customId.split('-')[1];
    const ticket = await Ticket.findOne({ channelId: channelId });
    if (!ticket) {
        return interaction.followUp({ content: 'Ticket not found in the database. It might have already been deleted.', flags: [MessageFlags.Ephemeral] });
    }
    if (ticket.claimedBy !== interaction.user.id) {
        return interaction.followUp({ content: 'You cannot unclaim a ticket you did not claim.', flags: [MessageFlags.Ephemeral] });
    }
    ticket.claimedBy = null;
    await ticket.save();
    const channel = interaction.channel;
    const newEmbed = new EmbedBuilder(interaction.message.embeds[0].toJSON())
        .setDescription('This ticket is currently unclaimed. A staff member will be with you shortly.')
        .setColor('Grey')
        .spliceFields(1, 1);
    const closeButton = new ButtonBuilder()
        .setCustomId(`closeTicketButton-${channelId}`)
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');
    const claimButton = new ButtonBuilder()
        .setCustomId(`claimTicketButton-${channelId}`)
        .setLabel('Claim Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🙋‍♂️');
    const updatedRow = new ActionRowBuilder().addComponents(claimButton, closeButton);
    await interaction.message.edit({ embeds: [newEmbed], components: [updatedRow] });
    await channel.send({ content: `<@${interaction.user.id}> has unclaimed this ticket.` });
    await interaction.editReply({ content: 'You have successfully unclaimed this ticket.', flags: [MessageFlags.Ephemeral] });
}

async function handleCloseTicketButton(interaction) {
    await interaction.deferUpdate();
    const channelId = interaction.customId.split('-')[1];
    try {
        const ticket = await Ticket.findOne({ channelId: channelId });
        if (!ticket) {
            return interaction.followUp({ content: 'Ticket not found in the database. It might have already been deleted.', flags: [MessageFlags.Ephemeral] });
        }
        const hasSupportRole = interaction.member.roles.cache.some(role => ticket.supportRoles.includes(role.id));
        if (!hasSupportRole && interaction.user.id !== ticket.ticketCreatorId) {
            return interaction.followUp({ content: 'You do not have permission to close this ticket.', flags: [MessageFlags.Ephemeral] });
        }
        ticket.status = 'closed';
        await ticket.save();
        const channel = interaction.channel;
        await channel.setName(`closed-${ticket.ticketNumber}`);
        const closedEmbed = new EmbedBuilder()
            .setTitle(`Ticket #${ticket.ticketNumber} Closed`)
            .setDescription(`This ticket was closed by <@${interaction.user.id}>.`)
            .setColor('Red')
            .setTimestamp();
        const deleteButton = new ButtonBuilder()
            .setCustomId(`deleteTicketButton-${channelId}`)
            .setLabel('Delete Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️');
        const transcriptButton = new ButtonBuilder()
            .setCustomId(`transcriptTicketButton-${channelId}`)
            .setLabel('Transcript')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📄');
        const reopenButton = new ButtonBuilder()
            .setCustomId(`reopenTicketButton-${channelId}`)
            .setLabel('Reopen Ticket')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔓');
        const actionRow = new ActionRowBuilder().addComponents(deleteButton, transcriptButton, reopenButton);
        await interaction.editReply({ embeds: [closedEmbed], components: [actionRow] });
    } catch (error) {
        console.error('Error in closeTicketButton handler:', error);
        return interaction.followUp({ content: 'An error occurred while trying to close the ticket.', flags: [MessageFlags.Ephemeral] });
    }
}

async function handleColorSelectMenu(interaction) {
    await interaction.deferUpdate();
    const member = interaction.member;
    const guild = interaction.guild;
    const selectedColorName = interaction.values[0];
    const selectedColorHex = COLORS_MAP[selectedColorName];
    if (!member || !guild) {
        return interaction.followUp({ content: 'Could not find guild or member context.', flags: [MessageFlags.Ephemeral] });
    }
    try {
        for (const colorKey of Object.keys(COLORS_MAP)) {
            const role = guild.roles.cache.find(r => r.name.toLowerCase() === colorKey);
            if (role && member.roles.cache.has(role.id)) {
                await member.roles.remove(role, 'User changed color role');
            }
        }
        const targetRole = guild.roles.cache.find(r => r.name.toLowerCase() === selectedColorName);
        if (!targetRole) {
            return interaction.followUp({ content: `The role for "${selectedColorName}" could not be found.`, flags: [MessageFlags.Ephemeral] });
        }
        if (guild.members.me.roles.highest.position <= targetRole.position) {
            return interaction.followUp({ content: `I cannot assign the role "${targetRole.name}" because it is equal to or higher than my highest role.`, flags: [MessageFlags.Ephemeral] });
        }
        if (!member.roles.cache.has(targetRole.id)) {
            await member.roles.add(targetRole, 'User selected new color role');
        }
        const embed = new EmbedBuilder()
            .setTitle('Color Role Updated')
            .setDescription(`Your color has been set to **${targetRole.name}**.`)
            .setColor(selectedColorHex || 'Grey');
        await interaction.followUp({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    } catch (error) {
        console.error(`Error updating color for ${member.user.tag}:`, error);
        await interaction.followUp({ content: 'An unexpected error occurred while updating your color role.', flags: [MessageFlags.Ephemeral] });
    }
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            let profileData;
            try {
                profileData = await profileSchema.findOne({ userId: interaction.user.id });
                if (!profileData) {
                    profileData = await profileSchema.create({
                        userId: interaction.user.id,
                        serverId: interaction.guild.id,
                        balance: 0
                    });
                }
            } catch (err) {
                console.error("DB error in interactionCreate (profileSchema):", err);
                const errorMessage = 'An error occurred with your user profile. Please try again.';
                return interaction.replied || interaction.deferred
                    ? interaction.followUp({ content: errorMessage, flags: [MessageFlags.Ephemeral] })
                    : interaction.reply({ content: errorMessage, flags: [MessageFlags.Ephemeral] });
            }
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                const errorMessage = 'That command was not found.';
                return interaction.replied || interaction.deferred
                    ? interaction.followUp({ content: errorMessage, flags: [MessageFlags.Ephemeral] })
                    : interaction.reply({ content: errorMessage, flags: [MessageFlags.Ephemeral] });
            }
            try {
                await command.execute(interaction, profileData, client);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}:`, error);
                const errorMessage = 'There was an error while executing this command.';
                if (interaction.replied || interaction.deferred) {
                    return interaction.followUp({ content: errorMessage, flags: [MessageFlags.Ephemeral] });
                } else {
                    return interaction.reply({ content: errorMessage, flags: [MessageFlags.Ephemeral] });
                }
            }
        } else if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error(error);
            }
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('createApplicationModal-')) {
                await handleCreateApplicationModal(interaction, client);
            } else if (interaction.customId.startsWith('editApplicationModal-')) {
                await handleEditApplicationModal(interaction, client);
            } else if (interaction.customId.startsWith('customApplicationEmbedModal-')) {
                await handleCustomApplicationEmbedModal(interaction, client);
            } else if (interaction.customId.startsWith('submitApplicationModal-')) {
                await handleSubmitApplicationModal(interaction, client);
            } else if (interaction.customId === 'createPollModal') {
                try {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    const question = interaction.fields.getTextInputValue('pollQuestion');
                    const optionsText = interaction.fields.getTextInputValue('pollOptions');
                    const durationValue = parseInt(interaction.fields.getTextInputValue('durationValue'));
                    const durationUnit = interaction.fields.getTextInputValue('durationUnit').toLowerCase();
                    if (isNaN(durationValue) || durationValue <= 0) {
                        return interaction.editReply({ content: 'Please provide a valid duration number.', flags: [MessageFlags.Ephemeral] });
                    }
                    const options = optionsText.split('\n').map(opt => opt.trim()).filter(opt => opt.length > 0);
                    if (options.length < 2) {
                        return interaction.editReply({ content: '❌ A poll must have at least two options. Please use newlines to separate them.', flags: [MessageFlags.Ephemeral] });
                    }
                    let endTime;
                    const now = new Date();
                    switch (durationUnit) {
                        case 'm':
                        case 'minutes':
                            endTime = new Date(now.getTime() + durationValue * 60 * 1000);
                            break;
                        case 'h':
                        case 'hours':
                            endTime = new Date(now.getTime() + durationValue * 60 * 60 * 1000);
                            break;
                        case 'd':
                        case 'days':
                            endTime = new Date(now.getTime() + durationValue * 24 * 60 * 60 * 1000);
                            break;
                        default:
                            return interaction.editReply({ content: 'Invalid duration unit. Use m for minutes, h for hours, or d for days.', flags: [MessageFlags.Ephemeral] });
                    }
                    const buttons = options.map((option, index) =>
                        new ButtonBuilder()
                            .setCustomId(`poll_vote_${index}`)
                            .setLabel(`${option}: 0 votes`)
                            .setStyle(ButtonStyle.Primary)
                    );
                    const components = [new ActionRowBuilder().addComponents(buttons)];
                    const embed = new EmbedBuilder()
                        .setTitle(question)
                        .setDescription(`Poll ends <t:${Math.floor(endTime.getTime() / 1000)}:R>`)
                        .setColor('Blurple')
                        .setFooter({ text: 'Vote by clicking a button below!' });
                    const pollMessage = await interaction.channel.send({
                        embeds: [embed],
                        components,
                    });
                    await Poll.create({
                        messageId: pollMessage.id,
                        guildId: interaction.guildId,
                        channelId: interaction.channelId,
                        question: question,
                        endTime: endTime,
                        options: options.map(option => ({ text: option, votes: 0 })),
                        voters: [],
                    });
                    await interaction.editReply({ content: 'Poll created successfully!', flags: [MessageFlags.Ephemeral] });
                } catch (error) {
                    console.error('Error handling createPollModal:', error);
                    if (interaction.replied || interaction.deferred) {
                        return interaction.followUp({ content: 'An unexpected error occurred while creating the poll. Please check the logs.', flags: [MessageFlags.Ephemeral] });
                    } else {
                        return interaction.reply({ content: 'An unexpected error occurred while creating the poll. Please check the logs.', flags: [MessageFlags.Ephemeral] });
                    }
                }
            } else if (interaction.customId === 'moderatorApplicationModal') {
                await handleModeratorApplicationSubmit(interaction, client);
            } else if (interaction.customId.startsWith('customTicketModal-')) {
                try {
                    await interaction.deferUpdate();
                    let panelData = await TicketPanel.findOne({ guildId: interaction.guild.id });
                    if (!panelData) {
                        return interaction.followUp({ content: 'Ticket system is not set up. Please run `/ticket setup` first.', flags: [MessageFlags.Ephemeral] });
                    }
                    const embedTitle = interaction.fields.getTextInputValue('embedTitle');
                    const embedDescription = interaction.fields.getTextInputValue('embedDescription');
                    const buttonText = interaction.fields.getTextInputValue('buttonText');
                    const buttonEmoji = interaction.fields.getTextInputValue('buttonEmoji');
                    const ticketEmbedDescription = interaction.fields.getTextInputValue('ticketEmbedDescription');
                    const newPanelEmbed = new EmbedBuilder()
                        .setTitle(embedTitle)
                        .setDescription(embedDescription)
                        .setColor('Blue');
                    const createTicketButton = new ButtonBuilder()
                        .setCustomId('createTicketButton')
                        .setLabel(buttonText)
                        .setStyle(ButtonStyle.Success);
                    if (buttonEmoji) {
                        createTicketButton.setEmoji(buttonEmoji);
                    }
                    const actionRow = new ActionRowBuilder().addComponents(createTicketButton);
                    const panelMessage = await interaction.channel.send({ embeds: [newPanelEmbed], components: [actionRow] });
                    panelData.panelMessageId = panelMessage.id;
                    panelData.channelId = interaction.channel.id;
                    panelData.title = embedTitle;
                    panelData.description = embedDescription;
                    panelData.buttonLabel = buttonText;
                    panelData.buttonEmoji = buttonEmoji;
                    panelData.ticketEmbed = {
                        title: embedTitle,
                        description: ticketEmbedDescription
                    };
                    await panelData.save();
                    return interaction.followUp({ content: 'Custom ticket panel created successfully!', flags: [MessageFlags.Ephemeral] });
                } catch (error) {
                    console.error('Error in customTicketModal handler:', error);
                    return interaction.followUp({ content: 'An unexpected error occurred.', flags: [MessageFlags.Ephemeral] });
                }
            }
        } else if (interaction.isButton()) {
            if (interaction.customId.startsWith('approveApplication-')) {
                await handleApproveButton(interaction, client);
            } else if (interaction.customId.startsWith('denyApplication-')) {
                await handleDenyButton(interaction, client);
            } else if (interaction.customId.startsWith('startApplication-')) {
                await handleStartApplicationButton(interaction);
            } else if (interaction.customId.startsWith('poll_vote_')) {
                await handlePollVote(interaction);
            } else if (interaction.customId === 'createTicketButton') {
                await handleCreateTicketButton(interaction, client);
            } else if (interaction.customId === 'defaultTicketPanel') {
                await interaction.deferUpdate();
                const channel = interaction.channel;
                let panelData = await TicketPanel.findOne({ guildId: interaction.guild.id });
                if (!panelData) {
                    return interaction.followUp({ content: 'Ticket system is not set up. Please run `/ticket setup` first.', flags: [MessageFlags.Ephemeral] });
                }
                const defaultEmbed = new EmbedBuilder()
                    .setTitle('Create a Support Ticket')
                    .setDescription('Click the button below to create a new ticket. A staff member will assist you as soon as possible.')
                    .setColor('Blue');
                const createTicketButton = new ButtonBuilder()
                    .setCustomId('createTicketButton')
                    .setLabel('Create Ticket')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎫');
                const actionRow = new ActionRowBuilder().addComponents(createTicketButton);
                const panelMessage = await channel.send({ embeds: [defaultEmbed], components: [actionRow] });
                panelData.panelMessageId = panelMessage.id;
                panelData.channelId = interaction.channel.id;
                panelData.title = defaultEmbed.data.title;
                panelData.description = defaultEmbed.data.description;
                panelData.buttonLabel = createTicketButton.data.label;
                panelData.buttonEmoji = createTicketButton.data.emoji.name;
                await panelData.save();
                await interaction.deleteReply();
            } else if (interaction.customId === 'customTicketPanel') {
                const tempPanelId = new mongoose.Types.ObjectId().toString();
                const modal = new ModalBuilder()
                    .setCustomId(`customTicketModal-${tempPanelId}`)
                    .setTitle('Customize Ticket Panel');
                const titleInput = new TextInputBuilder()
                    .setCustomId('embedTitle')
                    .setLabel('Panel Embed Title')
                    .setPlaceholder('e.g., "Need Support?"')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(256);
                const descriptionInput = new TextInputBuilder()
                    .setCustomId('embedDescription')
                    .setLabel('Panel Embed Description')
                    .setPlaceholder('e.g., "Click the button below to open a ticket."')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);
                const buttonTextInput = new TextInputBuilder()
                    .setCustomId('buttonText')
                    .setLabel('Button Label')
                    .setPlaceholder('e.g., "Create Ticket"')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(80);
                const buttonEmojiInput = new TextInputBuilder()
                    .setCustomId('buttonEmoji')
                    .setLabel('Button Emoji (optional)')
                    .setPlaceholder('e.g., 🎫')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(10);
                const ticketEmbedDescriptionInput = new TextInputBuilder()
                    .setCustomId('ticketEmbedDescription')
                    .setLabel('Ticket Channel Embed Description')
                    .setPlaceholder('e.g., "A staff member will be with you shortly."')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);
                modal.addComponents(
                    new ActionRowBuilder().addComponents(titleInput),
                    new ActionRowBuilder().addComponents(descriptionInput),
                    new ActionRowBuilder().addComponents(buttonTextInput),
                    new ActionRowBuilder().addComponents(buttonEmojiInput),
                    new ActionRowBuilder().addComponents(ticketEmbedDescriptionInput)
                );
                await interaction.showModal(modal);
            } else if (interaction.customId.startsWith('claimTicketButton-')) {
                await handleClaimTicketButton(interaction);
            } else if (interaction.customId.startsWith('unclaimTicketButton-')) {
                await handleUnclaimTicketButton(interaction);
            } else if (interaction.customId.startsWith('closeTicketButton-')) {
                await handleCloseTicketButton(interaction);
            } else if (interaction.customId.startsWith('deleteTicketButton-')) {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                const channelId = interaction.customId.split('-')[1];
                const ticket = await Ticket.findOne({ channelId: channelId });
                if (!ticket || ticket.status !== 'closed') {
                    return interaction.followUp({ content: 'This ticket cannot be deleted as it is not closed.', flags: [MessageFlags.Ephemeral] });
                }
                const hasSupportRole = interaction.member.roles.cache.some(role => ticket.supportRoles.includes(role.id));
                if (!hasSupportRole) {
                    return interaction.followUp({ content: 'You do not have permission to delete this ticket.', flags: [MessageFlags.Ephemeral] });
                }
                await interaction.editReply({ content: 'This channel will be deleted in 5 seconds...', flags: [MessageFlags.Ephemeral] });
                await ticket.deleteOne();
                setTimeout(async () => {
                    await interaction.channel.delete();
                }, 5000);
            } else if (interaction.customId.startsWith('transcriptTicketButton-')) {
                const channelId = interaction.customId.split('-')[1];
                const ticket = await Ticket.findOne({ channelId: channelId });
                if (!ticket) {
                    return interaction.reply({ content: 'Ticket not found in the database. It might have already been deleted.', flags: [MessageFlags.Ephemeral] });
                }
                const hasSupportRole = interaction.member.roles.cache.some(role => ticket.supportRoles.includes(role.id));
                if (!hasSupportRole) {
                    return interaction.reply({ content: 'You do not have permission to create a transcript for this ticket.', flags: [MessageFlags.Ephemeral] });
                }
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                try {
                    const channel = interaction.channel;
                    const messages = await channel.messages.fetch({ limit: 100, cache: false });
                    let htmlContent = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                        <meta charset="utf-8">
                        <title>Transcript for Ticket #${ticket.ticketNumber}</title>
                        <style>
                        body { font-family: Arial, sans-serif; background-color: #36393f; color: #dcddde; margin: 0; padding: 20px; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #7289da; padding-bottom: 10px; }
                        .header h1 { color: #7289da; }
                        .message-container { display: flex; align-items: flex-start; margin-bottom: 15px; }
                        .avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 15px; }
                        .message-content { background-color: #40444b; padding: 10px; border-radius: 5px; max-width: 80%; }
                        .message-author { font-weight: bold; color: #ffffff; }
                        .message-timestamp { color: #b9bbbe; font-size: 0.8em; margin-left: 10px; }
                        .message-text { margin-top: 5px; color: #dcddde; }
                        .footer { text-align: center; margin-top: 20px; font-style: italic; color: #7289da; }
                        </style>
                        </head>
                        <body>
                        <div class="header">
                        <h1>Transcript for Ticket #${ticket.ticketNumber}</h1>
                        <p>Channel: #${channel.name}</p>
                        <p>Created by: ${interaction.guild.members.cache.get(ticket.ticketCreatorId)?.user.tag || 'Unknown User'}</p>
                        <p>Closed by: ${interaction.user.tag}</p>
                        <p>Date: ${new Date().toLocaleString()}</p>
                        </div>
                    `;
                    messages.reverse().forEach(message => {
                        const authorTag = message.author.tag || 'Unknown User';
                        const avatarUrl = message.author.displayAvatarURL({ extension: 'png', size: 128 });
                        const timestamp = new Date(message.createdTimestamp).toLocaleString();
                        const content = message.content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        htmlContent += `
                            <div class="message-container">
                            <img class="avatar" src="${avatarUrl}" alt="${authorTag}'s avatar">
                            <div class="message-content">
                            <span class="message-author">${authorTag}</span>
                            <span class="message-timestamp">${timestamp}</span>
                            <div class="message-text">${content}</div>
                            </div>
                            </div>
                        `;
                    });
                    htmlContent += `
                        <div class="footer">End of Transcript</div>
                        </body>
                        </html>
                    `;
                    const transcriptBuffer = Buffer.from(htmlContent, 'utf-8');
                    const attachment = new AttachmentBuilder(transcriptBuffer, { name: `transcript-ticket-${ticket.ticketNumber}.html` });
                    await interaction.editReply({ content: 'Transcript generated successfully!', files: [attachment], flags: [MessageFlags.Ephemeral] });
                } catch (error) {
                    console.error('Error generating transcript:', error);
                    await interaction.editReply({ content: 'An unexpected error occurred while generating the transcript.', flags: [MessageFlags.Ephemeral] });
                }
            } else if (interaction.customId.startsWith('reopenTicketButton-')) {
                await interaction.deferUpdate();
                const channelId = interaction.customId.split('-')[1];
                const ticket = await Ticket.findOne({ channelId: channelId });
                if (!ticket || ticket.status !== 'closed') {
                    return interaction.followUp({ content: 'This ticket cannot be reopened as it is not closed.', flags: [MessageFlags.Ephemeral] });
                }
                const hasSupportRole = interaction.member.roles.cache.some(role => ticket.supportRoles.includes(role.id));
                if (!hasSupportRole) {
                    return interaction.followUp({ content: 'You do not have permission to reopen this ticket.', flags: [MessageFlags.Ephemeral] });
                }
                ticket.status = 'open';
                ticket.claimedBy = null;
                await ticket.save();
                const channel = interaction.channel;
                await channel.setName(`ticket-${ticket.ticketNumber}`);
                const reopenedEmbed = new EmbedBuilder()
                    .setTitle(`Ticket #${ticket.ticketNumber} Reopened`)
                    .setDescription(`This ticket was reopened by <@${interaction.user.id}>.`)
                    .setColor('Green')
                    .setTimestamp();
                const closeButton = new ButtonBuilder()
                    .setCustomId(`closeTicketButton-${channelId}`)
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒');
                const claimButton = new ButtonBuilder()
                    .setCustomId(`claimTicketButton-${channelId}`)
                    .setLabel('Claim Ticket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🙋‍♂️');
                const actionRow = new ActionRowBuilder().addComponents(claimButton, closeButton);
                await interaction.editReply({ embeds: [reopenedEmbed], components: [actionRow] });
            } else if (interaction.customId === 'confirmResetButton') {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.reply({ content: 'You do not have permission to use this button.', flags: [MessageFlags.Ephemeral] });
                }
                await interaction.deferUpdate();
                try {
                    const guildId = interaction.guild.id;
                    await TicketPanel.deleteMany({ guildId: guildId });
                    await Ticket.deleteMany({ guildId: guildId });
                    await interaction.followUp({ content: 'Ticket system has been completely reset.', flags: [MessageFlags.Ephemeral] });
                } catch (error) {
                    console.error('Error resetting ticket system:', error);
                    await interaction.followUp({ content: 'An unexpected error occurred while resetting the ticket system.', flags: [MessageFlags.Ephemeral] });
                }
            } else if (interaction.customId === 'cancelResetButton') {
                await interaction.reply({ content: 'Ticket system reset cancelled.', flags: [MessageFlags.Ephemeral] });
            } else {
                const [prefix, actionOrSubcommand, ...rest] = interaction.customId.split('-');
                const messageId = rest.join('-');
                if (prefix === 'giveaway') {
                    const giveawayCommand = client.commands.get('giveaway');
                    if (giveawayCommand?.handleButton) {
                        if (!actionOrSubcommand || !messageId) {
                            console.warn(`[Giveaway Button] Malformed customId: ${interaction.customId}`);
                            return interaction.reply({ content: 'An error occurred with this giveaway button.', flags: [MessageFlags.Ephemeral] });
                        }
                        try {
                            await giveawayCommand.handleButton(interaction, actionOrSubcommand, messageId);
                        } catch (error) {
                            console.error(`Error handling giveaway button for ${actionOrSubcommand} on ${messageId}:`, error);
                            return interaction.replied || interaction.deferred
                                ? interaction.followUp({ content: 'An error occurred with this giveaway.', flags: [MessageFlags.Ephemeral] })
                                : interaction.reply({ content: 'An error occurred with this giveaway.', flags: [MessageFlags.Ephemeral] });
                        }
                    } else {
                        console.warn(`[Giveaway Button] Giveaway system is currently unavailable.`);
                        return interaction.reply({ content: 'The giveaway system is currently unavailable.', flags: [MessageFlags.Ephemeral] });
                    }
                } else {
                    const [commandName] = interaction.customId.split('_');
                    const command = client.commands.get(commandName);
                    if (command?.handleButton) {
                        try {
                            await command.handleButton(interaction, client);
                        } catch (error) {
                            console.error(`Error handling button for ${commandName}:`, error);
                            return interaction.replied || interaction.deferred
                                ? interaction.followUp({ content: 'An unexpected error occurred.', flags: [MessageFlags.Ephemeral] })
                                : interaction.reply({ content: 'An unexpected error occurred.', flags: [MessageFlags.Ephemeral] });
                        }
                    } else {
                        console.warn(`No handler found for button customId: ${interaction.customId}`);
                        return interaction.reply({ content: 'This button does not have a handler.', flags: [MessageFlags.Ephemeral] });
                    }
                }
            }
        } else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'color_selector') {
                await handleColorSelectMenu(interaction);
            } else if (interaction.customId === 'selectApplicationMenu') {
                await handleApplicationSelectMenu(interaction);
            } else {
                const [commandName] = interaction.customId.split('_');
                const command = client.commands.get(commandName);
                if (!command?.handleSelectMenu) {
                    console.warn(`No handler for select menu customId: ${interaction.customId}`);
                    return interaction.reply({ content: 'This selection menu does not have a handler.', flags: [MessageFlags.Ephemeral] });
                }
                try {
                    await command.handleSelectMenu(interaction, client);
                } catch (error) {
                    console.error(`Error handling select menu for ${commandName}:`, error);
                    return interaction.replied || interaction.deferred
                        ? interaction.followUp({ content: 'An unexpected error occurred.', flags: [MessageFlags.Ephemeral] })
                        : interaction.reply({ content: 'An unexpected error occurred.', flags: [MessageFlags.Ephemeral] });
                }
            }
        }
    }
};
