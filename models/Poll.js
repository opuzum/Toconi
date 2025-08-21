// models/Poll.js
const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  question: { type: String, required: true },
  endTime: { type: Date, required: true },
  options: [{
    text: { type: String, required: true },
    votes: { type: Number, default: 0 },
  }],
  voters: [{
    userId: { type: String, required: true },
    optionIndex: { type: Number, required: true },
  }],
});

module.exports = mongoose.model('Poll', pollSchema);
