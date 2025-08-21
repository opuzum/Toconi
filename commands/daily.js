const { SlashCommandBuilder } = require("discord.js");
const ms = require("ms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily Tocons"),
  category: 'Economy',

  async execute(interaction, profileData) {
    const cooldown = 1000 * 60 * 60 * 24; // 24 hours
    const now = Date.now();
    const lastClaim = profileData.lastDaily || 0;

    if (now - lastClaim < cooldown) {
      const timeRemaining = cooldown - (now - lastClaim);
      await interaction.reply(`🕒 You've already claimed your daily reward! Try again in ${ms(timeRemaining, { long: true })}.`);
      return;
    }

    const reward = Math.floor(Math.random() * (2500 - 250 + 1)) + 250;

    profileData.balance += reward;
    profileData.lastDaily = now;
    await profileData.save();

    await interaction.reply(`💸 You received **${reward} Coins** for your daily claim.`);
  }
};

