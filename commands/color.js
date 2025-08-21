// commands/color.js
const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const CURATED_COLORS_FOR_MENU = [
    { name: 'Red', hex: '#FF0000' },
    { name: 'Green', hex: '#00FF00' },
    { name: 'Blue', hex: '#0000FF' },
    { name: 'Yellow', hex: '#FFFF00' },
    { name: 'Cyan', hex: '#00FFFF' },
    { name: 'Magenta', hex: '#FF00FF' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Black', hex: '#000000' },
    { name: 'Grey', hex: '#808080' },
    { name: 'Orange', hex: '#FFA500' },
    { name: 'Purple', hex: '#800080' },
    { name: 'Pink', hex: '#FFC0CB' },
    { name: 'Brown', hex: '#A52A2A' },
    { name: 'Dark Red', hex: '#8B0000' },
    { name: 'Lime Green', hex: '#32CD32' },
    { name: 'Royal Blue', hex: '#4169E1' },
    { name: 'Gold', hex: '#FFD700' },
    { name: 'Indigo', hex: '#4B0082' },
    { name: 'Hot Pink', hex: '#FF69B4' },
    { name: 'Dark Grey', hex: '#A9A9A9' },
    { name: 'Light Grey', hex: '#D3D3D3' },
    { name: 'Sky Blue', hex: '#87CEEB' },
    { name: 'Crimson', hex: '#DC143C' },
    { name: 'Forest Green', hex: '#228B22' },
    { name: 'Chocolate', hex: '#D2691E' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('color')
        .setDescription('Choose a color for your name and get the corresponding role.'),
    category: 'Customization',
    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const selectMenuOptions = CURATED_COLORS_FOR_MENU.map(color => ({
            label: color.name,
            value: color.name.toLowerCase(),
            description: `Change your name color to ${color.name}`,
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('color_selector')
            .setPlaceholder('Choose your desired color...')
            .addOptions(selectMenuOptions);

        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({
            content: 'Please select a color from the dropdown:',
            components: [actionRow],
            ephemeral: true,
        });
    },
};

