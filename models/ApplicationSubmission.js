const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    answers: {
        type: Map,
        of: String
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ApplicationSubmission', submissionSchema);
