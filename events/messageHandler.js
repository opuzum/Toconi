const fs = require("fs");
const path = require("path");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const prefixFile = path.join(__dirname, "../data/prefixes.json");
    const guildId = message.guild.id;
    const content = message.content.toLowerCase();

    try {
      const rawData = fs.readFileSync(prefixFile, "utf8");
      const prefixes = JSON.parse(rawData);

      
      if (prefixes[guildId]) {
        const guildPrefixes = prefixes[guildId];

        
        if (guildPrefixes[content]) {
          const reply = guildPrefixes[content];
          let replyText = reply.message;

          if (reply.image) {
            replyText += `\n${reply.image}`;
          }

          await message.reply(replyText);
        }
      }
    } catch (err) {
      
      if (err.code === 'ENOENT') {
        
        return;
      }
      console.error("❌ Failed to respond to prefix:", err);
    }
  },
};

