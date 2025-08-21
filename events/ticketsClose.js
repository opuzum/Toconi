const { PermissionFlagsBits } = require('discord.js');
const { Ticket } = require('../models/Tickets.js');

module.exports = {
    data: {
        name: 'ticket-close',
        description: 'Closes the current ticket.',
    },

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.channel;
        const guildId = interaction.guildId;
        const member = interaction.member;

        if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.followUp({ content: '❌ You need Manage Channels permission to close this ticket.', ephemeral: true });
        }

        
        const ticket = await Ticket.findOne({ guildId, channelId: channel.id });
        if (!ticket) {
            return interaction.followUp({ content: '❌ This channel is not a recognized ticket.', ephemeral: true });
        }

        
        const defaultPrefix = 'ticket-';
        const isDefaultName = channel.name.startsWith(defaultPrefix);

        if (isDefaultName) {
            
            const ticketNumber = channel.name.slice(defaultPrefix.length) || 'closed';
            const closedName = `closed-${ticketNumber}`;

            try {
                await channel.setName(closedName);
            } catch (err) {
                console.error('Rename error:', err);
               
                
            }
        }

        try {
            await Ticket.updateOne({ guildId, channelId: channel.id }, { status: 'closed' });
            await interaction.followUp({ content: '✅ Ticket closed successfully.', ephemeral: true });
            await channel.send(`🔒 This ticket was closed by ${interaction.user}.`);
        } catch (err) {
            console.error('Close ticket error:', err);
            return interaction.followUp({ content: '❌ Failed to close the ticket. Try again later.', ephemeral: true });
        }
    }
};