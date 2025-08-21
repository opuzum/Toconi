const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Giveaway = require('../models/Giveaway.js'); // Adjust path if your model is elsewhere

const activeGiveaways = new Map(); // Stores active giveaway intervals

function parseDuration(value, unit) {
    const unitInMs = {
        'second': 1000,
        'seconds': 1000,
        'minute': 1000 * 60,
        'minutes': 1000 * 60,
        'hour': 1000 * 60 * 60,
        'hours': 1000 * 60 * 60,
        'day': 1000 * 60 * 60 * 24,
        'days': 1000 * 60 * 60 * 24,
        'week': 1000 * 60 * 60 * 24 * 7,
        'weeks': 1000 * 60 * 60 * 24 * 7,
        'month': 1000 * 60 * 60 * 24 * 30, // Approximate month
        'months': 1000 * 60 * 60 * 24 * 30, // Approximate month
    };
    if (value <= 0 || !unitInMs[unit]) return null;
    return value * unitInMs[unit];
}

function getEnterGiveawayButton(messageId, hasEnded = false, isPaused = false) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`giveaway-enter-${messageId}`)
                .setLabel('Enter Giveaway 🎉')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(hasEnded || isPaused)
        );
}

function getCancelConfirmationButtons(giveawayId, disabled = false) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`giveaway-confirm_cancel-${giveawayId}`)
                .setLabel('Yes, cancel it')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(`giveaway-deny_cancel-${giveawayId}`)
                .setLabel('No, keep it')
                .setStyle(ButtonStyle.Success)
                .setDisabled(disabled)
        );
}

async function updateGiveawayMessage(client, giveawayDoc) {
    try {
        const channel = await client.channels.fetch(giveawayDoc.channelId);
        if (!channel) {
            console.error(`[Giveaway] Channel not found for message update: ${giveawayDoc.channelId}`);
            await Giveaway.deleteOne({ messageId: giveawayDoc.messageId });
            activeGiveaways.delete(giveawayDoc.messageId);
            return false;
        }
        const message = await channel.messages.fetch(giveawayDoc.messageId);
        if (!message) {
            console.error(`[Giveaway] Message not found for update: ${giveawayDoc.messageId}`);
            await Giveaway.deleteOne({ messageId: giveawayDoc.messageId });
            activeGiveaways.delete(giveawayDoc.messageId);
            return false;
        }

        const participantsCount = giveawayDoc.participants.length;
        const timeLeft = giveawayDoc.endTime - Date.now();
        const hasEnded = timeLeft <= 0;
        const endsInString = timeLeft > 0 ? `<t:${Math.floor(giveawayDoc.endTime / 1000)}:R>` : 'Ended';

        let description = `Click the "Enter Giveaway 🎉" button to enter!\nWinners: ${giveawayDoc.winners}\nPrize: **${giveawayDoc.prize}**\nEnds: ${endsInString}`;
        let color = 'Green';

        if (giveawayDoc.paused) {
            description += `\n\n**GIVEAWAY PAUSED!**`;
            color = 'Orange';
        } else if (hasEnded) {
            description += `\n\n**GIVEAWAY ENDED!**`;
            color = 'Red';
        }

        const embed = new EmbedBuilder()
            .setTitle('🎉 Giveaway 🎉')
            .setDescription(description)
            .setColor(color)
            .setFooter({ text: `Participants: ${participantsCount} | ID: ${giveawayDoc.messageId}` })
            .setTimestamp();

        const enterButton = getEnterGiveawayButton(giveawayDoc.messageId, hasEnded, giveawayDoc.paused);
        await message.edit({ embeds: [embed], components: [enterButton] });
        return true;
    } catch (error) {
        console.error(`[Giveaway] Error updating message for ${giveawayDoc.messageId}:`, error);
        return false;
    }
}

async function cancelGiveaway(client, giveawayMessageId) {
    const giveawayDoc = await Giveaway.findOne({ messageId: giveawayMessageId });
    if (!giveawayDoc) {
        console.log(`[Giveaway] Attempted to cancel non-existent or already ended giveaway with ID: ${giveawayMessageId}`);
        const inMemoryGiveaway = activeGiveaways.get(giveawayMessageId);
        if (inMemoryGiveaway && inMemoryGiveaway.intervalId) {
            clearInterval(inMemoryGiveaway.intervalId);
        }
        activeGiveaways.delete(giveawayMessageId);
        return false;
    }

    const inMemoryGiveaway = activeGiveaways.get(giveawayMessageId);
    if (inMemoryGiveaway && inMemoryGiveaway.intervalId) {
        clearInterval(inMemoryGiveaway.intervalId);
        inMemoryGiveaway.intervalId = null;
    }

    const channel = await client.channels.fetch(giveawayDoc.channelId);
    if (!channel) {
        console.error(`[Giveaway] Channel not found for canceling giveaway: ${giveawayDoc.channelId}`);
        await Giveaway.deleteOne({ messageId: giveawayMessageId });
        activeGiveaways.delete(giveawayMessageId);
        return false;
    }

    const message = await channel.messages.fetch(giveawayDoc.messageId);
    if (!message) {
        console.error(`[Giveaway] Message not found for canceling giveaway: ${giveawayMessageId}`);
        await Giveaway.deleteOne({ messageId: giveawayMessageId });
        activeGiveaways.delete(giveawayMessageId);
        return false;
    }

    const cancelledEmbed = new EmbedBuilder()
        .setTitle('🚫 Giveaway Cancelled 🚫')
        .setDescription(`The giveaway for **${giveawayDoc.prize}** has been cancelled by an administrator. No winners were selected.`)
        .setColor('Grey')
        .setTimestamp()
        .setFooter({ text: `ID: ${giveawayDoc.messageId}` });

    const disabledEnterButton = getEnterGiveawayButton(giveawayDoc.messageId, true, true);

    try {
        await message.edit({ embeds: [cancelledEmbed], components: [disabledEnterButton] });
        await channel.send(`🚫 The giveaway for **${giveawayDoc.prize}** has been cancelled. No winners.`);
    } catch (editError) {
        console.error(`[Giveaway] Error editing/sending cancellation message for ${giveawayMessageId}:`, editError);
        if (message.deleted) {
            await channel.send(`🚫 The giveaway for **${giveawayDoc.prize}** has been cancelled. No winners.`);
        }
    }

    await Giveaway.deleteOne({ messageId: giveawayMessageId });
    activeGiveaways.delete(giveawayMessageId);
    console.log(`[Giveaway] Cancelled and deleted giveaway ${giveawayMessageId} from database.`);
    return true;
}

async function endGiveaway(client, giveawayMessageId) {
    const giveawayDoc = await Giveaway.findOne({ messageId: giveawayMessageId });

    // IMPORTANT: Check if the giveaway still exists. If not, it's already ended.
    if (!giveawayDoc) {
        console.log(`[Giveaway] Attempted to end non-existent or already ended giveaway with ID: ${giveawayMessageId}`);
        const inMemoryGiveaway = activeGiveaways.get(giveawayMessageId);
        if (inMemoryGiveaway && inMemoryGiveaway.intervalId) {
            clearInterval(inMemoryGiveaway.intervalId);
        }
        activeGiveaways.delete(giveawayMessageId);
        return;
    }

    // Stop the active interval for this giveaway
    const inMemoryGiveaway = activeGiveaways.get(giveawayMessageId);
    if (inMemoryGiveaway && inMemoryGiveaway.intervalId) {
        clearInterval(inMemoryGiveaway.intervalId);
        inMemoryGiveaway.intervalId = null;
    }

    const channel = await client.channels.fetch(giveawayDoc.channelId);
    if (!channel) {
        console.error(`[Giveaway] Channel not found for ending giveaway: ${giveawayDoc.channelId}`);
        await Giveaway.deleteOne({ messageId: giveawayMessageId });
        activeGiveaways.delete(giveawayMessageId);
        return;
    }

    const message = await channel.messages.fetch(giveawayDoc.messageId);
    if (!message) {
        console.error(`[Giveaway] Message not found for ending giveaway: ${giveawayMessageId}`);
        await Giveaway.deleteOne({ messageId: giveawayMessageId });
        activeGiveaways.delete(giveawayMessageId);
        return;
    }

    const participants = giveawayDoc.participants;
    const winnersCount = Math.min(giveawayDoc.winners, participants.length);
    let winners = [];

    if (winnersCount > 0) {
        const humanParticipants = participants.filter(id => {
            const member = channel.guild.members.cache.get(id);
            return member && !member.user.bot;
        });

        if (humanParticipants.length > 0) {
            const shuffled = humanParticipants.sort(() => 0.5 - Math.random());
            winners = shuffled.slice(0, winnersCount);
        }
    }

    let winnerMentions = winners.length > 0 ? winners.map(w => `<@${w}>`).join(', ') : 'No one';
    let finalAnnouncement = '';

    if (winners.length > 0) {
        finalAnnouncement = `🎉 The giveaway for **${giveawayDoc.prize}** has ended! Congratulations ${winnerMentions}!`;
    } else {
        finalAnnouncement = `😢 The giveaway for **${giveawayDoc.prize}** has ended! There were no valid participants.`;
    }

    const finalEmbed = new EmbedBuilder()
        .setTitle('🎉 Giveaway Ended 🎉')
        .setDescription(`Prize: **${giveawayDoc.prize}**\nWinners: ${winnerMentions}\n\n`)
        .setColor('Red')
        .setTimestamp()
        .setFooter({ text: `ID: ${giveawayDoc.messageId}` });

    const disabledEnterButton = getEnterGiveawayButton(giveawayDoc.messageId, true, true);

    try {
        await message.edit({ embeds: [finalEmbed], components: [disabledEnterButton] });
        await channel.send(finalAnnouncement);
    } catch (editError) {
        console.error(`[Giveaway] Error editing/sending final message for ${giveawayMessageId}:`, editError);
        if (message.deleted) {
            await channel.send(finalAnnouncement);
        }
    }

    // Now delete from the database and active map after everything is done
    await Giveaway.deleteOne({ messageId: giveawayMessageId });
    activeGiveaways.delete(giveawayMessageId);
    console.log(`[Giveaway] Deleted giveaway ${giveawayMessageId} from database and active map.`);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manages server giveaways.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Starts a new giveaway.')
                .addIntegerOption(option =>
                    option
                        .setName('duration_value')
                        .setDescription('The number for the giveaway duration (e.g., 5, 30, 1)')
                        .setRequired(true)
                        .setMinValue(1))
                .addStringOption(option =>
                    option
                        .setName('duration_unit')
                        .setDescription('The unit of time for the duration')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Seconds', value: 'seconds' },
                            { name: 'Minutes', value: 'minutes' },
                            { name: 'Hours', value: 'hours' },
                            { name: 'Days', value: 'days' },
                            { name: 'Weeks', value: 'weeks' },
                            { name: 'Months', value: 'months' },
                        ))
                .addIntegerOption(option =>
                    option
                        .setName('winners')
                        .setDescription('Number of winners for the giveaway (e.g., 1, 3)')
                        .setRequired(true)
                        .setMinValue(1))
                .addStringOption(option =>
                    option
                        .setName('prize')
                        .setDescription('The prize for the giveaway')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pause')
                .setDescription('Pauses an active giveaway.')
                .addStringOption(option =>
                    option
                        .setName('message_id')
                        .setDescription('The message ID of the giveaway to pause.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('resume')
                .setDescription('Resumes a paused giveaway.')
                .addStringOption(option =>
                    option
                        .setName('message_id')
                        .setDescription('The message ID of the giveaway to resume.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Stops an active giveaway immediately.')
                .addStringOption(option =>
                    option
                        .setName('message_id')
                        .setDescription('The message ID of the giveaway to stop.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cancel')
                .setDescription('Cancels an active giveaway with no winners (asks for confirmation).')
                .addStringOption(option =>
                    option
                        .setName('message_id')
                        .setDescription('The message ID of the giveaway to cancel.')
                        .setRequired(true))),
    category: 'Events',

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        }

        if (subcommand === 'start') {
            const durationValue = interaction.options.getInteger('duration_value');
            const durationUnit = interaction.options.getString('duration_unit');
            const winners = interaction.options.getInteger('winners');
            const prize = interaction.options.getString('prize');
            const channel = interaction.channel;

            const durationMs = parseDuration(durationValue, durationUnit);
            if (!durationMs || durationMs < 10000) {
                return interaction.reply({ content: 'Please provide a valid duration. Minimum duration is 10 seconds.', ephemeral: true });
            }

            const endTime = Date.now() + durationMs;

            const embed = new EmbedBuilder()
                .setTitle('🎉 Giveaway 🎉')
                .setDescription(`Click the "Enter Giveaway 🎉" button to enter!\nWinners: ${winners}\nPrize: **${prize}**\nEnds: <t:${Math.floor(endTime / 1000)}:R>`)
                .setColor('Green')
                .setFooter({ text: `Hosted by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.deferReply({ ephemeral: true });

            const giveawayMessage = await channel.send({ embeds: [embed], components: [getEnterGiveawayButton('temp_id')] });
            
            embed.setFooter({ text: `Participants: 0 | ID: ${giveawayMessage.id}` });
            const initialEnterButton = getEnterGiveawayButton(giveawayMessage.id, false, false);
            await giveawayMessage.edit({ embeds: [embed], components: [initialEnterButton] });

            try {
                const newGiveawayDoc = new Giveaway({
                    messageId: giveawayMessage.id,
                    channelId: giveawayMessage.channel.id,
                    guildId: interaction.guild.id,
                    endTime: endTime,
                    prize: prize,
                    winners: winners,
                    paused: false,
                    hostId: interaction.user.id,
                    participants: [],
                });
                await newGiveawayDoc.save();

                activeGiveaways.set(giveawayMessage.id, newGiveawayDoc);

                // This is now the ONLY place where the giveaway is checked for ending automatically.
                newGiveawayDoc.intervalId = setInterval(async () => {
                    const currentGiveaway = activeGiveaways.get(giveawayMessage.id);
                    if (!currentGiveaway) { // Giveaway was manually ended/cancelled, clear interval
                         clearInterval(newGiveawayDoc.intervalId);
                         return;
                    }

                    if (Date.now() >= currentGiveaway.endTime && !currentGiveaway.paused) {
                        clearInterval(newGiveawayDoc.intervalId); // Clear the interval first
                        endGiveaway(interaction.client, giveawayMessage.id);
                        return;
                    }

                    if (!currentGiveaway.paused) {
                        await updateGiveawayMessage(interaction.client, currentGiveaway);
                    }
                }, 5000);

                await interaction.editReply({ content: `Giveaway for **${prize}** created successfully! [Jump to giveaway](${giveawayMessage.url})`, ephemeral: true });

            } catch (dbError) {
                console.error('[Giveaway] Error saving giveaway to database:', dbError);
                await giveawayMessage.delete();
                return interaction.editReply({ content: 'Failed to create giveaway due to a database error.', ephemeral: true });
            }

        } else if (['pause', 'resume', 'stop', 'cancel'].includes(subcommand)) {
            const messageId = interaction.options.getString('message_id');
            if (!messageId) {
                return interaction.reply({ content: 'Please provide the message ID of the giveaway.', ephemeral: true });
            }

            if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return interaction.reply({ content: 'You do not have permission to manage giveaways.', ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: true });

            if (subcommand === 'cancel') {
                const giveawayDoc = await Giveaway.findOne({ messageId: messageId });
                if (!giveawayDoc) {
                    return interaction.editReply({ content: `The giveaway with ID \`${messageId}\` was not found. It might have already ended or been removed.`, ephemeral: true });
                }

                const confirmButtons = getCancelConfirmationButtons(messageId, false);
                await interaction.editReply({
                    content: `Are you sure you want to cancel the giveaway for **${giveawayDoc.prize}**? This cannot be undone.`,
                    components: [confirmButtons],
                    ephemeral: true
                });
            } else {
                return this.handleButton(interaction, subcommand, messageId, true);
            }
        }
    },

    async handleButton(interaction, action, messageId, isSlashCommand = false) {
        if (!isSlashCommand && !interaction.deferred && !interaction.replied) {
            try {
                // Defer the reply for button interactions, but not for slash commands
                // as they are already deferred.
                await interaction.deferReply({ ephemeral: true });
            } catch (error) {
                if (error.code === 10062) {
                    console.error('Failed to defer reply to interaction, it may have expired:', error.message);
                    return;
                }
                throw error;
            }
        }

        if (['pause', 'resume', 'stop', 'confirm_cancel', 'deny_cancel'].includes(action)) {
            if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) {
                if (!isSlashCommand) {
                    const currentComponents = interaction.message?.components || [];
                    const disabledComponents = currentComponents.map(row => {
                        return new ActionRowBuilder().addComponents(
                            row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
                        );
                    });
                    await interaction.update({ components: disabledComponents }).catch(e => console.error("Error updating buttons:", e));
                    return interaction.followUp({ content: 'You do not have permission to manage giveaways.', ephemeral: true });
                }
                return interaction.editReply({ content: 'You do not have permission to manage giveaways.', ephemeral: true });
            }
        }

        const giveawayDoc = await Giveaway.findOne({ messageId: messageId });

        if (!giveawayDoc && action !== 'deny_cancel') {
            if (action === 'confirm_cancel' || action === 'deny_cancel') {
                const disabledButtons = getCancelConfirmationButtons(messageId, true);
                if (!isSlashCommand) {
                    await interaction.update({ components: [disabledButtons] }).catch(e => console.error("Error updating buttons on non-existent giveaway:", e));
                }
            }
            return interaction.editReply({ content: `The giveaway with ID \`${messageId}\` was not found or has already ended/been cancelled.`, ephemeral: true });
        }

        if (action === 'enter') {
            if (giveawayDoc.paused) {
                return interaction.editReply({ content: 'This giveaway is currently paused. You cannot enter it right now.', ephemeral: true });
            }
            if (Date.now() >= giveawayDoc.endTime) {
                await endGiveaway(interaction.client, messageId);
                return interaction.editReply({ content: 'This giveaway has already ended. You can no longer enter.', ephemeral: true });
            }
            if (giveawayDoc.participants.includes(interaction.user.id)) {
                return interaction.editReply({ content: 'You have already entered this giveaway!', ephemeral: true });
            }

            giveawayDoc.participants.push(interaction.user.id);
            await giveawayDoc.save();
            activeGiveaways.set(messageId, giveawayDoc);

            await updateGiveawayMessage(interaction.client, giveawayDoc);
            return interaction.editReply({ content: 'You have successfully entered the giveaway! Good luck!', ephemeral: true });

        } else if (action === 'confirm_cancel') {
            const disabledButtons = getCancelConfirmationButtons(messageId, true);
            const cancelled = await cancelGiveaway(interaction.client, messageId);

            let replyContent;
            if (cancelled) {
                replyContent = `Giveaway with ID \`${messageId}\` has been **cancelled** successfully.`;
            } else {
                replyContent = `Failed to cancel giveaway with ID \`${messageId}\`. It might not exist or already be finished.`;
            }

            // Since it was deferred by the slash command, use editReply.
            await interaction.editReply({ content: replyContent, components: [disabledButtons], ephemeral: true });

        } else if (action === 'deny_cancel') {
            const disabledButtons = getCancelConfirmationButtons(messageId, true);
            if (giveawayDoc) {
                await updateGiveawayMessage(interaction.client, giveawayDoc);
            }
            // Since it was deferred by the slash command, use editReply.
            await interaction.editReply({ content: 'Giveaway cancellation aborted. The giveaway continues as normal.', components: [disabledButtons], ephemeral: true });
        }

        if (giveawayDoc && Date.now() >= giveawayDoc.endTime && action !== 'stop') {
            if (!giveawayDoc.paused) {
                await endGiveaway(interaction.client, messageId);
            }
            return interaction.editReply({ content: `The giveaway with ID \`${messageId}\` has already ended naturally. It has now been finalized.`, ephemeral: true });
        }

        let replyContent = '';
        if (giveawayDoc) {
            switch (action) {
                case 'pause':
                    if (giveawayDoc.paused) {
                        replyContent = `The giveaway with ID \`${messageId}\` is already paused.`;
                    } else {
                        giveawayDoc.paused = true;
                        await giveawayDoc.save();
                        const inMemoryGiveaway = activeGiveaways.get(messageId);
                        if (inMemoryGiveaway && inMemoryGiveaway.intervalId) {
                            clearInterval(inMemoryGiveaway.intervalId);
                            inMemoryGiveaway.intervalId = null;
                        }
                        activeGiveaways.set(messageId, giveawayDoc);
                        await updateGiveawayMessage(interaction.client, giveawayDoc);
                        replyContent = `Giveaway with ID \`${messageId}\` has been **paused**.`;
                    }
                    break;
                case 'resume':
                    if (!giveawayDoc.paused) {
                        replyContent = `The giveaway with ID \`${messageId}\` is not currently paused.`;
                    } else if (Date.now() >= giveawayDoc.endTime) {
                        await endGiveaway(interaction.client, messageId);
                        replyContent = `The giveaway with ID \`${messageId}\` was paused but its time ran out. It has now been ended.`;
                    } else {
                        giveawayDoc.paused = false;
                        await giveawayDoc.save();
                        
                        // Restart the interval and timeout for the resumed giveaway
                        const inMemoryGiveaway = activeGiveaways.get(messageId) || giveawayDoc;
                        activeGiveaways.set(messageId, inMemoryGiveaway);

                        if (inMemoryGiveaway.intervalId) clearInterval(inMemoryGiveaway.intervalId);
                        inMemoryGiveaway.intervalId = setInterval(async () => {
                            const currentGiveaway = activeGiveaways.get(giveawayDoc.messageId);
                            if (!currentGiveaway) {
                                 clearInterval(inMemoryGiveaway.intervalId);
                                 return;
                            }
                            if (Date.now() >= currentGiveaway.endTime && !currentGiveaway.paused) {
                                clearInterval(inMemoryGiveaway.intervalId);
                                endGiveaway(interaction.client, giveawayDoc.messageId);
                                return;
                            }
                            if (!currentGiveaway.paused) {
                                await updateGiveawayMessage(interaction.client, currentGiveaway);
                            }
                        }, 5000);

                        await updateGiveawayMessage(interaction.client, giveawayDoc);
                        replyContent = `Giveaway with ID \`${messageId}\` has been **resumed**.`;
                    }
                    break;
                case 'stop':
                    await endGiveaway(interaction.client, messageId);
                    replyContent = `Giveaway with ID \`${messageId}\` has been **stopped** successfully.`;
                    break;
                default:
                    replyContent = 'Unknown giveaway action.';
                    break;
            }
        } else {
            replyContent = `Giveaway with ID \`${messageId}\` not found for this action.`;
        }

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: replyContent, ephemeral: true });
        } else {
            await interaction.reply({ content: replyContent, ephemeral: true });
        }
    }
};

