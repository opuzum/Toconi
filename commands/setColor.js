const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');


const COLORS = [
    
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
    { name: 'Crimson', hex: '#DC143C' },
    { name: 'FireBrick', hex: '#B22222' },
    { name: 'Indian Red', hex: '#CD5C5C' },

    
    { name: 'Dark Green', hex: '#006400' },
    { name: 'Lime Green', hex: '#32CD32' },
    { name: 'Forest Green', hex: '#228B22' },
    { name: 'Olive', hex: '#808000' },
    { name: 'Sea Green', hex: '#2E8B57' },

    
    { name: 'Dark Blue', hex: '#00008B' },
    { name: 'Royal Blue', hex: '#4169E1' },
    { name: 'Sky Blue', hex: '#87CEEB' },
    { name: 'Deep Sky Blue', hex: '#00BFFF' },
    { name: 'Navy', hex: '#000080' },

    
    { name: 'Gold', hex: '#FFD700' },
    { name: 'Dark Orange', hex: '#FF8C00' },
    { name: 'Coral', hex: '#FF7F50' },
    { name: 'Salmon', hex: '#FA8072' },

    
    { name: 'Indigo', hex: '#4B0082' },
    { name: 'Violet', hex: '#EE82EE' },
    { name: 'Orchid', hex: '#DA70D6' },
    { name: 'Hot Pink', hex: '#FF69B4' },

    
    { name: 'Dark Grey', hex: '#A9A9A9' },
    { name: 'Light Grey', hex: '#D3D3D3' },
    { name: 'Slate Grey', hex: '#708090' },
    { name: 'Dark Brown', hex: '#654321' },
    { name: 'Chocolate', hex: '#D2691E' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setcolors')
        .setDescription('Creates or ensures the presence of predefined color roles in the server.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles),
    category: 'Admin',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const botMember = await guild.members.fetch(interaction.client.user.id);
        
        
        if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.editReply({ content: 'I do not have permission to manage roles. Please check my role permissions.' });
        }
        
        const createdRoles = [];
        const updatedRoles = [];
        const existingRoles = [];
        const errors = [];

        for (const color of COLORS) {
            let role = guild.roles.cache.find(r => r.name === color.name);
            const reason = 'Creating/updating predefined color roles.';

            if (!role) {
                try {
                    role = await guild.roles.create({
                        name: color.name,
                        color: color.hex,
                        reason: reason,
                        permissions: [],
                    });
                    createdRoles.push(role);
                } catch (error) {
                    console.error(`Error creating role ${color.name}:`, error);
                    errors.push(`Error creating role **${color.name}**: ${error.message}`);
                }
            } else {
                if (role.hexColor.toLowerCase() !== color.hex.toLowerCase()) {
                    try {
                        await role.setColor(color.hex, reason);
                        updatedRoles.push(role.name);
                    } catch (error) {
                        console.error(`Error updating color for role ${color.name}:`, error);
                        errors.push(`Error updating color for role **${color.name}**: ${error.message}`);
                    }
                } else {
                    existingRoles.push(role.name);
                }
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('Color Role Setup Complete')
            .setColor('Blurple');

        if (createdRoles.length > 0) {
            embed.addFields({ name: 'Created Roles', value: createdRoles.map(r => r.name).join(', ') });
        }
        if (updatedRoles.length > 0) {
            embed.addFields({ name: 'Updated Roles', value: updatedRoles.join(', ') });
        }
        if (existingRoles.length > 0) {
            embed.addFields({ name: 'Existing Roles (no changes)', value: existingRoles.join(', ') });
        }
        if (errors.length > 0) {
            embed.addFields({ name: 'Errors', value: errors.join('\n') });
            embed.setColor('Red');
        }

        if (createdRoles.length === 0 && updatedRoles.length === 0 && existingRoles.length === 0 && errors.length === 0) {
            embed.setDescription('No color roles were created, updated, or found.');
        }

        await interaction.editReply({ embeds: [embed] });
    },
};

