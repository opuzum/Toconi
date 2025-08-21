const { Events } = require('discord.js');

function updatePresence(client) {
    const serverCount = client.guilds.cache.size;
    client.user.setPresence({
        activities: [{ name: `${serverCount} Servers`, type: 3 }],
        status: "dnd",
    });
}

module.exports = {
    name: Events.GuildDelete,
    async execute(guild, client) { // guild is the first arg, client is passed from index.js
        console.log(`Left a guild: ${guild.name} (${guild.id}). Total servers: ${client.guilds.cache.size}`);
        updatePresence(client);
    },
};
