const mongoose = require('mongoose');

const ApplicationPanelSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    channelId: {
        type: String,
        required: true
    },
    messageId: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('ApplicationPanel', ApplicationPanelSchema);
