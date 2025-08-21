const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get an invite link for the bot'),
  category: 'Utility',
  async execute(interaction) {
    const clientId = interaction.client.user.id;
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot+applications.commands&permissions=8`;
    await interaction.reply(`🔗 [Click here to invite me with full permissions!](${inviteUrl})`);
  }
};

