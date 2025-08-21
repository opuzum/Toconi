const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say something, either plain text or an embed.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        // Subcommand for plain text message
        .addSubcommand(subcommand =>
            subcommand
                .setName('text')
                .setDescription('Make the bot say a plain text message.')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('The message content for the bot to say.')
                        .setRequired(true)
                )
        )
        // Subcommand for customizable embed
        .addSubcommand(subcommand =>
            subcommand
                .setName('embed')
                .setDescription('Make the bot send a fully customizable embed.')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Title of the embed.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Main message/description of the embed.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Embed color (hex like #RRGGBB or a CSS color name like "Blue").')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('URL for an image to display in the embed.')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('footer')
                        .setDescription('Footer text for the embed.')
                        .setRequired(false)
                )
        ),
    category: 'Utility',

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'You do not have the required permissions to use this command.', ephemeral: true });
        }

        switch (subcommand) {
            case 'text': {
                const messageContent = interaction.options.getString('message');
                await interaction.reply({ content: 'Sent your message successfully.', ephemeral: true });
                await interaction.channel.send(messageContent);
                break;
            }

            case 'embed': {
                const title = interaction.options.getString('title');
                const description = interaction.options.getString('description');
                const colorInput = interaction.options.getString('color');
                const image = interaction.options.getString('image');
                const footer = interaction.options.getString('footer');

                let embedColor = 0x00AEFF;

                if (colorInput) {
                    try {
                        if (colorInput.startsWith('#')) {
                            embedColor = parseInt(colorInput.slice(1), 16);
                        } else {
                            embedColor = colorInput.toUpperCase();
                        }
                    } catch (e) {
                        console.error("Invalid color input, defaulting to 0x00AEFF:", e);
                    }
                }

                const embed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle(title)
                    .setDescription(description);

                if (image) embed.setImage(image);
                if (footer) embed.setFooter({ text: footer });

                await interaction.reply({ content: 'Sent your embed successfully.', ephemeral: true });
                await interaction.channel.send({ embeds: [embed] });
                break;
            }

            default:
                await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
                break;
        }
    }
};

