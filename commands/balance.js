
const { SlashCommandBuilder } = require("discord.js");
const profileSchema = require("../models/profileSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Know your balance or someone else's balance")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User to check balance for")
        .setRequired(false)
    ),
  category: 'Economy',
  async execute(interaction, profileData) {
    const targetUser = interaction.options.getUser("user") || interaction.user;

    if (targetUser.bot) {
      return interaction.reply(`🤖 Bots don't carry Tocons.`);
    }

    let targetProfile = profileData;
    if (targetUser.id !== interaction.user.id) {
      targetProfile = await profileSchema.findOne({ userId: targetUser.id });
      if (!targetProfile) {
        targetProfile = await profileSchema.create({
          userId: targetUser.id,
          serverId: interaction.guild.id,
          balance: 0,
          job: "Unemployed",
          lastDaily: 0
        });
      }
    }

    await interaction.reply(`💼 ${targetUser.username} has **${targetProfile.balance} Tocons**.`);
  }
};
