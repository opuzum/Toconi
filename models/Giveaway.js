const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    messageId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    guildId: { type: String, required: true },
    endTime: { type: Number, required: true },
    prize: { type: String, required: true },
    winners: { type: Number, required: true },
    paused: { type: Boolean, default: false },
    hostId: { type: String, required: true },
    participants: { type: [String], default: [] }, // NEW: Array to store user IDs of participants
});

module.exports = mongoose.model('Giveaway', giveawaySchema);
