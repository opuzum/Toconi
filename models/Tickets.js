const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  panelMessageId: { type: String, required: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  ticketCreatorId: { type: String, required: true },
  supportRoles: [{ type: String }],
  status: { type: String, default: 'open' },
  claimedBy: { type: String, default: null }, 
  members: [{ type: String }],
  ticketNumber: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ticketPanelSchema = new mongoose.Schema({
  panelMessageId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  ticketChannelCategoryId: { type: String, required: true },
  supportRoleIds: [{ type: String, required: true }], 
  title: { type: String, required: false }, // Fixed: Changed 'required: true' to 'required: false'
  description: { type: String, required: false }, // Fixed: Changed 'required: true' to 'required: false'
  ticketCount: { type: Number, default: 0 },
});

const Ticket = mongoose.model('Ticket', ticketSchema);
const TicketPanel = mongoose.model('TicketPanel', ticketPanelSchema);

module.exports = { Ticket, TicketPanel };
