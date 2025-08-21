const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        
        const serverCount = client.guilds.cache.size;
        client.user.setPresence({
            activities: [{
                name: `${serverCount} servers`,
                type: ActivityType.Watching
            }],
            status: 'dnd',
        });

        console.log(`Bot is active in ${serverCount} servers.`);

        
        console.log('Attempting to deploy slash commands...');
        try {
            const commandsData = client.commands.map(command => command.data.toJSON());
            await client.application.commands.set(commandsData);
            console.log('Successfully deployed global slash commands!');
        } catch (error) {
            console.error('Failed to deploy slash commands:', error);
        }
        c
    },
};
