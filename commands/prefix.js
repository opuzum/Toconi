const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Define the path to your prefixes data file
const prefixesFile = path.join(__dirname, '../data/prefixes.json');

// Helper function to load prefixes data
function loadPrefixes() {
    if (!fs.existsSync(prefixesFile)) {
        // Ensure the directory exists if not already present
        const dir = path.dirname(prefixesFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return {}; // Return empty object if file doesn't exist
    }
    try {
        const data = fs.readFileSync(prefixesFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading or parsing prefixes.json:', error);
        return {}; // Return empty object on error
    }
}

// Helper function to save prefixes data
function savePrefixes(data) {
    try {
        fs.writeFileSync(prefixesFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing prefixes.json:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Manage custom command prefixes for your server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Create a custom prefix with a reply message and optional image.')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Prefix keyword (e.g., link, info)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('The reply message to send when the prefix is used')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('Optional image URL to include in the reply')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Delete a saved prefix by name.')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name of the prefix to delete')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all custom prefixes for this server.')
        ),
    category: 'Utility',

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const prefixes = loadPrefixes();
        const guildId = interaction.guild.id;

        // Ensure the guild has an entry in the prefixes object
        if (!prefixes[guildId]) {
            prefixes[guildId] = {};
        }

        switch (subcommand) {
            case 'add': {
                const name = interaction.options.getString('name').toLowerCase();
                const message = interaction.options.getString('message');
                const image = interaction.options.getString('image');

                if (prefixes[guildId][name]) {
                    return interaction.reply({
                        content: `A prefix with the name \`${name}\` already exists for this server.`,
                        ephemeral: true
                    });
                }

                prefixes[guildId][name] = { message, image };
                savePrefixes(prefixes);

                let replyMessage = `Successfully created prefix \`${name}\` for this server. The message is: "${message}".`;
                if (image) {
                    replyMessage += ` It will also include the image at URL: ${image}`;
                }

                await interaction.reply({
                    content: replyMessage,
                    ephemeral: false
                });
                break;
            }

            case 'remove': {
                const name = interaction.options.getString('name').toLowerCase();

                if (!prefixes[guildId][name]) {
                    return interaction.reply({
                        content: `A prefix with the name \`${name}\` was not found in this server's list.`,
                        ephemeral: true
                    });
                }

                delete prefixes[guildId][name];
                savePrefixes(prefixes);

                await interaction.reply({
                    content: `Successfully deleted the prefix \`${name}\` for this server.`,
                    ephemeral: false
                });
                break;
            }

            case 'list': {
                const serverPrefixes = prefixes[guildId];
                const prefixNames = Object.keys(serverPrefixes);

                if (prefixNames.length === 0) {
                    return interaction.reply({
                        content: 'This server has no custom prefixes set yet.',
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor(0x00AEFF)
                    .setTitle(`Custom Prefixes for ${interaction.guild.name}`)
                    .setDescription(prefixNames.map(name => `**\`${name}\`**`).join(', '));
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            }

            default:
                await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
                break;
        }
    }
};

