const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tax')
        .setDescription('Calculate the Toconi tax.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount before tax.')
                .setRequired(true)
        ),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        
        const taxedAmount = Math.round((amount * 100) / 95); 
        
        await interaction.reply(`💰 The amount needed to send to receive **${amount}** after Toconi's tax: **${taxedAmount}**`);
    },
};

