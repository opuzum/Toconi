const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { Ticket, TicketPanel } = require('../models/Tickets.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage tickets in the server.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Create a new ticket panel.')
        .addStringOption(opt => opt.setName('panel-name').setDescription('Name for the ticket panel.').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send panel.').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addChannelOption(opt => opt.setName('category').setDescription('Category for ticket channels.').setRequired(true).addChannelTypes(ChannelType.GuildCategory))
        .addRoleOption(opt => opt.setName('support-role').setDescription('Support team role.').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add user or role to ticket.')
        .addUserOption(opt => opt.setName('user').setDescription('User to add'))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to add'))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove user or role from ticket.')
        .addUserOption(opt => opt.setName('user').setDescription('User to remove'))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove'))
    )
    .addSubcommand(sub =>
      sub.setName('rename')
        .setDescription('Rename ticket channel.')
        .addStringOption(opt => opt.setName('new-name').setDescription('New ticket name.').setRequired(true))
    ),
  category: 'Utility',
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const channel = interaction.channel;
    const member = interaction.member;
    const opts = interaction.options;

    
    if (subcommand === 'setup') {
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: 'You must be an administrator to use this command.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const panelName = opts.getString('panel-name');
      const panelChannel = opts.getChannel('channel');
      const category = opts.getChannel('category');
      const supportRole = opts.getRole('support-role');

      try {
        
        const existingPanel = await TicketPanel.findOne({ guildId });
        if (existingPanel) {
          return interaction.followUp({
            content: 'A ticket panel for this server already exists. You can only set up one.',
            ephemeral: true,
          });
        }

        const duplicateName = await TicketPanel.exists({ panelName });
        if (duplicateName) {
            return interaction.followUp({ content: 'A ticket panel with that name already exists.', ephemeral: true });
        }
        

        const panel = await TicketPanel.create({
          guildId,
          panelName,
          channelId: panelChannel.id,
          ticketChannelCategoryId: category.id,
          supportRoleIds: [supportRole.id],
          panelMessageId: 'temp',
          title: 'temp',
          description: 'temp',
          ticketEmbed: { title: 'temp', description: 'temp' },
        });

        const embed = new EmbedBuilder()
          .setTitle('Ticket Panel Setup')
          .setDescription('Please select a panel style to set up.')
          .setColor('Blurple');

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`defaultTicketPanel-${panel._id}`)
            .setLabel('Default Panel')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`customTicketPanel-${panel._id}`)
            .setLabel('Custom Panel')
            .setStyle(ButtonStyle.Primary)
        );

        return interaction.followUp({ embeds: [embed], components: [buttons], ephemeral: true });
      } catch (err) {
        console.error('Setup error:', err);
        return interaction.followUp({ content: 'Failed to create the ticket panel. Please try again.', ephemeral: true });
      }
    }

    
    if (['add', 'remove'].includes(subcommand)) {
      if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({ content: 'You must have the "Manage Channels" permission to do this.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const target = opts.getUser('user') || opts.getRole('role');
      if (!target) {
        return interaction.followUp({ content: 'Please specify a user or a role to add/remove.', ephemeral: true });
      }

      const ticket = await Ticket.findOne({ guildId, channelId: channel.id });
      if (!ticket) {
        return interaction.followUp({ content: 'This command can only be used in a ticket channel.', ephemeral: true });
      }

      const permissionEdit = subcommand === 'add' ? { ViewChannel: true, SendMessages: true } : { ViewChannel: false, SendMessages: false };

      try {
        await channel.permissionOverwrites.edit(target, permissionEdit);
        const action = subcommand === 'add' ? 'added to' : 'removed from';
        await interaction.followUp({ content: `Successfully ${action} the ticket.`, ephemeral: true });
        await channel.send({ content: `${target} has been ${action} the ticket by ${interaction.user}.` });
      } catch (err) {
        console.error(`Permission overwrite error:`, err);
        return interaction.followUp({ content: 'Failed to update permissions for the ticket.', ephemeral: true });
      }
    }

    
    if (subcommand === 'rename') {
      await interaction.deferReply({ ephemeral: true });

      if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.followUp({ content: 'You must have the "Manage Channels" permission to do this.', ephemeral: true });
      }

      const newName = opts.getString('new-name');
      const ticket = await Ticket.findOne({ guildId, channelId: channel.id });
      if (!ticket) {
        return interaction.followUp({ content: 'This command can only be used in a ticket channel.', ephemeral: true });
      }

      try {
        await channel.setName(newName);
        await interaction.followUp({ content: `Ticket channel has been renamed to **#${newName}**.`, ephemeral: true });
        await channel.send({ content: `The ticket channel was renamed to **#${newName}** by ${interaction.user}.` });
      } catch (err) {
        console.error('Rename error:', err);
        return interaction.followUp({ content: 'Failed to rename the ticket channel.', ephemeral: true });
      }
    }
  },
};
