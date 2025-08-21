const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    logsChannelId: {
        type: String,
        required: true
    },
    questions: [
        {
            text: {
                type: String,
                required: true
            },
            required: {
                type: Boolean,
                default: true
            },
            placeholder: {
                type: String,
                default: null
            }
        }
    ],
    // ADD THIS NEW FIELD
    addButtons: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Application', applicationSchema);
