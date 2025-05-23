const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  messages: [messageSchema],
  lastMessage: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure exactly 2 participants for one-on-one chats
chatSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    next(new Error('One-on-one chat must have exactly 2 participants'));
  } else {
    next();
  }
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat; 