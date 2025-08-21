const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const ApplicationPanel = require('../models/ApplicationPanel.js');

async function updateApplicationPanels(client, panels, applications) {
    if (panels.length === 0) return;

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

    for (const panel of panels) {
        try {
            const channel = await client.channels.fetch(panel.channelId);
            if (!channel) {
                await ApplicationPanel.deleteOne({ _id: panel._id });
                continue;
            }
            const message = await channel.messages.fetch(panel.messageId);
            if (!message) {
                await ApplicationPanel.deleteOne({ _id: panel._id });
                continue;
            }

            if (applications.length > 0) {
                await message.edit({ components: [actionRow] });
            } else {
                await message.edit({ embeds: message.embeds, components: [] });
            }
        } catch (error) {
            console.error(`Error updating application panel message in channel ${panel.channelId}:`, error);
        }
    }
}

module.exports = { updateApplicationPanels };
