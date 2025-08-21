const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their Discord ID.')
    .addStringOption(option =>
      option.setName('userid')
        .setDescription('Discord ID of the user to unban')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),
  category: 'Moderation',

  async execute(interaction) {
    const userId = interaction.options.getString('userid');

    try {
      await interaction.guild.bans.remove(userId);
      await interaction.reply(`Successfully unbanned the user with ID \`${userId}\`.`);
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: `Failed to unban the user with ID \`${userId}\`. Please ensure the ID is correct and the user is banned.`,
        ephemeral: true
      });
    }
  }
};

