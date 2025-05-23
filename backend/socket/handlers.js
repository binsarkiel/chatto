const Chat = require('../models/Chat');
const Group = require('../models/Group');
const User = require('../models/User');

/**
 * Handle joining a personal chat room
 */
const handleJoinChat = async (socket, chatId) => {
  try {
    const chat = await Chat.findById(chatId);
    if (chat && chat.participants.includes(socket.user._id)) {
      socket.join(`chat_${chatId}`);
      console.log(`User ${socket.user.email} joined chat ${chatId}`);
    }
  } catch (error) {
    console.error('Error joining chat:', error);
  }
};

/**
 * Handle joining a group chat room
 */
const handleJoinGroup = async (socket, groupId) => {
  try {
    const group = await Group.findById(groupId);
    if (group && group.members.includes(socket.user._id)) {
      socket.join(`group_${groupId}`);
      console.log(`User ${socket.user.email} joined group ${groupId}`);
    }
  } catch (error) {
    console.error('Error joining group:', error);
  }
};

/**
 * Create message payload with sender information
 */
const createMessagePayload = (message, user, chatId = null, groupId = null) => {
  const basePayload = {
    message: {
      ...message,
      sender: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName
      }
    }
  };

  if (chatId) basePayload.chatId = chatId;
  if (groupId) basePayload.groupId = groupId;

  return basePayload;
};

/**
 * Create chat update payload with complete user information
 */
const createChatUpdatePayload = async (chat, isGroup = false) => {
  // Populate participants/members information
  if (isGroup) {
    await chat.populate('members', 'email fullName');
  } else {
    await chat.populate('participants', 'email fullName');
  }

  // Populate last message sender information
  if (chat.messages.length > 0) {
    const lastMessage = chat.messages[chat.messages.length - 1];
    const sender = await User.findById(lastMessage.sender).select('email fullName');
    lastMessage.sender = sender;
  }

  return {
    _id: chat._id,
    messages: chat.messages,
    lastMessage: chat.lastMessage,
    participants: chat.participants,
    members: chat.members,
    name: chat.name,
    isGroup: isGroup
  };
};

/**
 * Handle personal chat message
 */
const handleChatMessage = async (io, socket, data) => {
  try {
    const { chatId, content } = data;
    const chat = await Chat.findById(chatId);
    
    if (chat && chat.participants.includes(socket.user._id)) {
      const message = {
        sender: socket.user._id,
        content,
        timestamp: new Date()
      };

      // Save message to database
      chat.messages.push(message);
      chat.lastMessage = new Date();
      await chat.save();

      // Emit to the chat room
      const messagePayload = createMessagePayload(message, socket.user, chatId);
      io.to(`chat_${chatId}`).emit('receive_message', messagePayload);

      // Update chat list for all users
      const chatUpdatePayload = await createChatUpdatePayload(chat, false);
      io.emit('chat_updated', chatUpdatePayload);
    }
  } catch (error) {
    console.error('Error sending chat message:', error);
  }
};

/**
 * Handle group chat message
 */
const handleGroupMessage = async (io, socket, data) => {
  try {
    const { groupId, content } = data;
    const group = await Group.findById(groupId);
    
    if (group && group.members.includes(socket.user._id)) {
      const message = {
        sender: socket.user._id,
        content,
        timestamp: new Date()
      };

      // Save message to database
      group.messages.push(message);
      group.lastMessage = new Date();
      await group.save();

      // Emit to the group room
      const messagePayload = createMessagePayload(message, socket.user, null, groupId);
      io.to(`group_${groupId}`).emit('receive_message', messagePayload);

      // Update chat list for all users
      const chatUpdatePayload = await createChatUpdatePayload(group, true);
      io.emit('chat_updated', chatUpdatePayload);
    }
  } catch (error) {
    console.error('Error sending group message:', error);
  }
};

/**
 * Handle client disconnection
 */
const handleDisconnect = (socket) => {
  console.log('Client disconnected:', socket.id);
};

module.exports = {
  handleJoinChat,
  handleJoinGroup,
  handleChatMessage,
  handleGroupMessage,
  handleDisconnect
}; 