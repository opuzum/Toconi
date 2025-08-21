const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const EMBED_FIELD_VALUE_LIMIT = 1024;

function getCategorizedCommands(client) {
    const categorizedCommands = {};
    for (const cmd of client.commands.values()) {
        const category = cmd.category || 'Uncategorized';
        if (!categorizedCommands[category]) {
            categorizedCommands[category] = [];
        }
        categorizedCommands[category].push({ name: `/${cmd.data.name}`, description: cmd.data.description });
    }
    if (client.prefixCommands) {
        const prefix = '!';
        for (const cmd of client.prefixCommands.values()) {
            const category = cmd.category || 'Uncategorized';
            if (!categorizedCommands[category]) {
                categorizedCommands[category] = [];
            }
            categorizedCommands[category].push({ name: `${prefix}${cmd.name}`, description: cmd.description });
        }
    }
    return categorizedCommands;
}

function createCategoryMenu(client) {
    const embed = new EmbedBuilder()
        .setTitle('Bot Commands')
        .setDescription('Select a category below to see its commands.')
        .setColor('Blurple')
        .setTimestamp();
    
    const categorizedCommands = getCategorizedCommands(client);
    const sortedCategories = Object.keys(categorizedCommands).sort();
    
    const rows = [];
    let currentRow = new ActionRowBuilder();

    for (const category of sortedCategories) {
        const button = new ButtonBuilder()
            .setCustomId(`help_category_${category}`)
            .setLabel(category)
            .setStyle(ButtonStyle.Primary);
        
        if (currentRow.components.length >= 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
        currentRow.addComponents(button);
    }
    rows.push(currentRow);

    return { embeds: [embed], components: rows };
}

function createCategoryCommandList(category, client) {
    const categorizedCommands = getCategorizedCommands(client);
    const commands = categorizedCommands[category] || [];

    const embed = new EmbedBuilder()
        .setTitle(`Commands in ${category}`)
        .setDescription(`Here are all the commands in the **${category}** category.`)
        .setColor('Blurple')
        .setTimestamp();
    
    let currentField = '';
    let fieldCount = 0;
    
    for (const cmd of commands) {
        const cmdString = `**\`${cmd.name}\`**: ${cmd.description}\n`;
        
        if ((currentField + cmdString).length > EMBED_FIELD_VALUE_LIMIT) {
            embed.addFields({ name: fieldCount === 0 ? 'Commands' : '\u200b', value: currentField, inline: false });
            currentField = cmdString;
            fieldCount++;
        } else {
            currentField += cmdString;
        }
    }
    if (currentField.length > 0) {
        embed.addFields({ name: fieldCount === 0 ? 'Commands' : '\u200b', value: currentField, inline: false });
    }

    const backButtonRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('help_back')
                .setLabel('Go Back to Categories')
                .setStyle(ButtonStyle.Secondary)
        );

    return { embeds: [embed], components: [backButtonRow] };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays a list of all available commands or information about a specific command.'),
    category: 'Utility',
    
    async execute(interaction) {
        const commandName = interaction.options.getString('command');
        
        if (commandName) {
            const command = interaction.client.commands.get(commandName) || (interaction.client.prefixCommands ? interaction.client.prefixCommands.get(commandName) : null);
            if (!command) {
                return interaction.reply({ content: `I could not find a command named \`${commandName}\`.`, ephemeral: true });
            }
            const embed = new EmbedBuilder()
                .setTitle(`Command: ${command.data?.name || command.name}`)
                .setDescription(command.data?.description || command.description)
                .addFields({ name: 'Category', value: command.category || 'Uncategorized', inline: true })
                .setColor('Blurple');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        const menu = createCategoryMenu(interaction.client);
        return interaction.reply(menu);
    },

    async handleButton(interaction) {
        const [_, type, ...valueArray] = interaction.customId.split('_');
        const value = valueArray.join('_');

        if (type === 'category') {
            const commandList = createCategoryCommandList(value, interaction.client);
            return interaction.update(commandList);
        } else if (type === 'back') {
            const menu = createCategoryMenu(interaction.client);
            return interaction.update(menu);
        }
    },
};

