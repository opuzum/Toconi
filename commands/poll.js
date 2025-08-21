const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Creates a new poll with a question, options, and duration.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  category: 'Events',
  
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('createPollModal')
      .setTitle('Create a New Poll');

    const questionInput = new TextInputBuilder()
      .setCustomId('pollQuestion')
      .setLabel('Poll Question?')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('e.g., What is your favorite color?')
      .setRequired(true);

    const optionsInput = new TextInputBuilder()
      .setCustomId('pollOptions')
      .setLabel('Options (Separate with newlines)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('e.g.,\nRed\nBlue\nGreen')
      .setRequired(true);

    const durationValueInput = new TextInputBuilder()
      .setCustomId('durationValue')
      .setLabel('Duration Value (e.g., 5)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const durationUnitInput = new TextInputBuilder()
      .setCustomId('durationUnit')
      .setLabel('Duration Unit (m, h, d)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., m for minutes, h for hours, d for days')
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(questionInput);
    const secondActionRow = new ActionRowBuilder().addComponents(optionsInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(durationValueInput);
    const fourthActionRow = new ActionRowBuilder().addComponents(durationUnitInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

    await interaction.showModal(modal);
  },
};
