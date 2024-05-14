const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{
    text: { type: String, required: true },
    votes: { type: Number, required: true, default: 0 }
  }],
  created: { type: Date, default: Date.now }
});

const Poll = mongoose.model('Poll', pollSchema);

module.exports = Poll;
