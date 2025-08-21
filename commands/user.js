const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require("../models/profileSchema"); // Make sure this path is correct

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user')
    .setDescription('Get information about a user')
    // Subcommand: /user id
    .addSubcommand(subcommand => subcommand
      .setName('id')
      .setDescription('Get the ID of a user')
      .addUserOption(option => option.setName('target')
        .setDescription('User to get ID of')
        .setRequired(true)
      )
    )
    // Subcommand: /user info
    .addSubcommand(subcommand => subcommand
      .setName('info')
      .setDescription('Display basic server information about a user')
      .addUserOption(option => option.setName('target')
        .setDescription('User to get info about')
        .setRequired(true)
      )
    )
    // Subcommand: /user avatar
    .addSubcommand(subcommand => subcommand
      .setName('avatar')
      .setDescription('View your avatar or someone else’s')
      .addUserOption(option => option.setName('user')
        .setDescription('User whose avatar you want to see')
        .setRequired(false)
      )
    )
    // New Subcommand: /user profile
    .addSubcommand(subcommand => subcommand
      .setName('profile')
      .setDescription('Displays a user\'s economy and profile stats')
      .addUserOption(option => option
        .setName('target')
        .setDescription('The user whose profile you want to view')
        .setRequired(false)
      )
    ),
  category: 'Utility',
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('target') || interaction.options.getUser('user') || interaction.user;

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    // This part is shared by multiple subcommands
    let profileData = null;
    if (subcommand === 'info' || subcommand === 'profile') {
      profileData = await Profile.findOne({ userId: targetUser.id, serverId: interaction.guild.id });
      if (!profileData) {
        profileData = await Profile.create({ 
          userId: targetUser.id, 
          serverId: interaction.guild.id,
        });
      }
    }

    switch (subcommand) {
      case 'id': {
        const embed = new EmbedBuilder()
          .setColor(0x00AEFF)
          .setTitle('User ID')
          .addFields(
            { name: 'Username', value: `${targetUser.tag}`, inline: true },
            { name: 'User ID', value: `\`${targetUser.id}\``, inline: true }
          )
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
          .setFooter({ text: 'User ID Retrieval' });
        await interaction.reply({ embeds: [embed] });
        break;
      }
      case 'info': {
        if (!targetMember) {
          return interaction.reply({
            content: `User **${targetUser.tag}** is not in this server.`,
            ephemeral: true
          });
        }
        
        const roles = targetMember.roles.cache
          .filter(r => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => r.toString())
          .join(', ') || 'None';
          
        const embed = new EmbedBuilder()
          .setColor(0x00AEFF)
          .setTitle(`User Info: ${targetUser.tag}`)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
          .addFields(
            { name: 'User ID', value: `\`${targetUser.id}\``, inline: false },
            { name: 'Is Bot', value: targetUser.bot ? 'Yes' : 'No', inline: true },
            { name: 'Balance', value: `${profileData.balance} coins`, inline: true },
            { name: 'Job', value: `${profileData.job}`, inline: true },
            { name: 'Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: false },
            { name: 'Joined Server', value: targetMember.joinedTimestamp ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>` : 'N/A', inline: false },
            { name: 'Roles', value: roles, inline: false }
          )
          .setFooter({ text: `Requested by ${interaction.user.tag}` });
        await interaction.reply({ embeds: [embed] });
        break;
      }
      case 'avatar': {
        const avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 1024, format: 'png' });
        const embed = new EmbedBuilder()
          .setColor(0x00AEFF)
          .setTitle(`${targetUser.tag}'s Avatar`)
          .setImage(avatarUrl)
          .setDescription(`[Click here to download the avatar](${avatarUrl})`)
          .setFooter({ text: `Requested by ${interaction.user.tag}` });
        await interaction.reply({ embeds: [embed], ephemeral: false });
        break;
      }
      case 'profile': {
        if (!targetMember) {
          return interaction.reply({
            content: `User **${targetUser.tag}** is not in this server.`,
            ephemeral: true
          });
        }

        const warningCount = profileData.robHistory.length;
        
        // Create the profile embed
        const profileEmbed = new EmbedBuilder()
          .setColor(targetMember.displayHexColor !== '#000000' ? targetMember.displayHexColor : 0x00AEFF)
          .setTitle(`${targetUser.username}'s Profile`)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
          .addFields(
            { name: 'Balance', value: `\`${profileData.balance} coins\``, inline: true },
            { name: 'Job', value: `\`${profileData.job}\``, inline: true },
            { name: 'Lifetime Earnings', value: `\`${profileData.lifetimeEarnings} coins\``, inline: true },
            { name: 'Warnings', value: `\`${warningCount}\``, inline: true },
            { name: 'Robbed Count', value: `\`${profileData.robbedCount}\``, inline: true },
            { name: 'Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: `User ID: ${targetUser.id}` });

        await interaction.reply({ embeds: [profileEmbed] });
        break;
      }
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
        break;
    }
  }
};

