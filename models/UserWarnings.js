const mongoose = require('mongoose');

const warningSchema = new mongoose.Schema({
    warnNumber: Number,
    reason: String,
    timestamp: Date,
    adminId: String,
});

const userWarningsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: false },
    userId: { type: String, required: true, unique: false },
    warnings: [warningSchema],
});

userWarningsSchema.index({ guildId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model('UserWarnings', userWarningsSchema);
