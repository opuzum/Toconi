const { SlashCommandBuilder } = require("discord.js");
const profileSchema = require("../models/profileSchema.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transfer")
    .setDescription("Send Tocons to another user")
    .addUserOption(option =>
      option.setName("recipient")
        .setDescription("User to send Tocons to")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("amount")
        .setDescription("Amount of Tocons to transfer")
        .setRequired(true)
    ),
  category: 'Economy',

  async execute(interaction) {
    const sender = interaction.user;
    const senderId = sender.id;
    const recipient = interaction.options.getUser("recipient");
    const amount = interaction.options.getInteger("amount");

    
    if (recipient.id === senderId) return interaction.reply({ content: 'You cannot transfer Tocons to yourself.', ephemeral: true });
    if (recipient.bot) return interaction.reply({ content: 'You cannot transfer Tocons to a bot.', ephemeral: true });
    if (amount <= 0) return interaction.reply({ content: 'The amount must be a positive number.', ephemeral: true });

    
    const taxRate = 0.05;
    const taxAmount = Math.floor(amount * taxRate);
    const netAmount = amount - taxAmount;

    
    const senderProfile = await profileSchema.findOne({ userId: senderId });
    if (!senderProfile || senderProfile.balance < amount) {
      return interaction.reply({ content: 'You do not have enough Tocons to make this transfer.', ephemeral: true });
    }

    let recipientProfile = await profileSchema.findOne({ userId: recipient.id });
    if (!recipientProfile) {
      recipientProfile = await profileSchema.create({
        userId: recipient.id,
        balance: 0,
        job: "Unemployed",
        lastDaily: 0,
        robShieldUntil: 0,
        robHistory: []
      });
    }

    
    senderProfile.balance -= amount;
    recipientProfile.balance += netAmount;

    await senderProfile.save();
    await recipientProfile.save();

    
    await interaction.reply(`You successfully transferred ${amount} Tocons to **${recipient.tag}**! They received ${netAmount} Tocons after a 5% tax.`);

    
    try {
      await recipient.send(`You received ${netAmount} Tocons from **${sender.username}**!`);
    } catch (err) {
      console.warn(`Could not DM user ${recipient.tag} about the Tocon transfer.`);
    }
  }
};

