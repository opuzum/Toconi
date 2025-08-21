const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  userId: String,
  serverId: String,
  balance: {
    type: Number,
    default: 0
  },
  lastDaily: {
  type: Number,
  default: 0
},
job: {
  type: String,
  default: "Unemployed"
},
robShieldUntil: {
  type: Number,
  default: 0
},
robHistory: {
  type: Array,
  default: []
},
robCooldownUntil: { type: Number, default: 0 }, // new field

lifetimeEarnings: { type: Number, default: 0 },
robbedCount: { type: Number, default: 0 },

workCountToday: { type: Number, default: 0 },
lastWorkDate: { type: String, default: "" }, // we’ll store as YYYY-MM-DD
lastDiceUsed: { type: Date, default: null },
});

module.exports = mongoose.model("Profile", profileSchema);
