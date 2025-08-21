const { SlashCommandBuilder } = require("discord.js");
const profileSchema = require("../models/profileSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rob")
    .setDescription("Attempt to steal Tocons from another user")
    .addUserOption(option =>
      option.setName("target")
        .setDescription("User to rob")
        .setRequired(true)
    ),
  category: 'Economy',

  async execute(interaction) {
    const robberId = interaction.user.id;
    const target = interaction.options.getUser("target");

    if (target.id === robberId || target.bot) {
      return interaction.reply('You cannot rob yourself or a bot.');
    }

    const robber = await profileSchema.findOne({ userId: robberId });
    const victim = await profileSchema.findOne({ userId: target.id });

    if (!robber || !victim) {
      return interaction.reply('Both you and the target must have a profile to perform this action.');
    }

    const now = Date.now();
    if (robber.robCooldownUntil && now < robber.robCooldownUntil) {
      const remainingTime = Math.ceil((robber.robCooldownUntil - now) / 1000);
      return interaction.reply(`You are on cooldown from robbing. Try again later.`);
    }

    const success = Math.random() < 0.5;

    if (!success) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);
      const endOfMonthTimestamp = nextMonth.getTime();

      robber.robCooldownUntil = endOfMonthTimestamp;
      await robber.save();

      return interaction.reply(`You failed to rob **${target.tag}** and have been placed on a robbing cooldown until the beginning of next month.`);
    }

    const amount = Math.floor(victim.balance * 0.3);
    if (amount <= 0) {
      return interaction.reply(`**${target.tag}** has no Tocons to steal. You got away empty-handed.`);
    }

    victim.balance -= amount;
    robber.balance += amount;
    await victim.save();
    await robber.save();

    await interaction.reply(`You successfully stole **${amount}** Tocons from **${target.tag}**!`);
  }
};

