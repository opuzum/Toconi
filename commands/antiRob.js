const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("antirob")
    .setDescription("Buy a 6-hour protection from being robbed"), // <-- Make sure there is a comma here!
  category: 'Economy',

  async execute(interaction, profileData) {
    const protectionCost = 200;
    const protectionDuration = 1000 * 60 * 60 * 6; // 6 hours
    const now = Date.now();

    if (profileData.balance < protectionCost) {
      return interaction.reply("🚫 You don't have enough Coins to buy anti-rob protection.");
    }

    const activeProtection = profileData.robShieldUntil || 0;
    if (activeProtection > now) {
      return interaction.reply("🛡️ You're already protected from being robbed!");
    }

    profileData.balance -= protectionCost;
    profileData.robShieldUntil = now + protectionDuration;
    await profileData.save();

    await interaction.reply("✅ You've activated 6-hour anti-rob protection. No one can rob you during this time!");
  }
};

