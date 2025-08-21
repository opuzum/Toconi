const { SlashCommandBuilder } = require("discord.js");
const profileSchema = require("../models/profileSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("Earn some Tocons by working"),
  category: 'Economy',
  
  async execute(interaction) {
    const userId = interaction.user.id;
    const today = new Date().toISOString().slice(0, 10);

    let profile = await profileSchema.findOne({ userId });

    if (!profile) {
      profile = await profileSchema.create({
        userId,
        serverId: interaction.guild.id,
        balance: 0,
        job: "Unemployed",
        workCountToday: 1,
        lastWorkDate: today
      });
    } else {
      if (profile.lastWorkDate !== today) {
        profile.workCountToday = 1;
        profile.lastWorkDate = today;
      } else {
        if (profile.workCountToday >= 3) {
          return interaction.reply("You have already worked 3 times today. Please try again tomorrow.");
        }
        profile.workCountToday += 1;
      }
    }

    const reward = Math.floor(Math.random() * 400) + 200;
    profile.balance += reward;
    await profile.save();

    await interaction.reply(`You went to work and earned ${reward} Tocons! You have now worked ${profile.workCountToday} time(s) today.`);
  }
};

