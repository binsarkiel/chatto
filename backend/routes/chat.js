const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Group = require('../models/Group');

// POST /chat - Create one-on-one chat
router.post('/chat', auth, async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user.userId;

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    // Check if chat already exists between these users
    const existingChat = await Chat.findOne({
      participants: { $all: [userId, participantId], $size: 2 }
    });

    if (existingChat) {
      return res.json({
        message: 'Chat already exists',
        chat: existingChat
      });
    }

    // Create new chat
    const chat = new Chat({
      participants: [userId, participantId],
      messages: []
    });

    const savedChat = await chat.save();
    const populatedChat = await Chat.findById(savedChat._id)
      .populate('participants', 'email fullName');

    res.status(201).json({
      message: 'Chat created successfully',
      chat: populatedChat
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error creating chat',
      error: error.message
    });
  }
});

// POST /group - Create group chat
router.post('/group', auth, async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    const userId = req.user.userId;

    // Ensure creator is included in members
    const uniqueMembers = [...new Set([userId, ...memberIds])];

    // Validate all members exist
    const members = await User.find({ _id: { $in: uniqueMembers } });
    if (members.length !== uniqueMembers.length) {
      return res.status(400).json({ message: 'One or more members not found' });
    }

    // Create group
    const group = new Group({
      name,
      members: uniqueMembers,
      createdBy: userId,
      messages: []
    });

    const savedGroup = await group.save();
    const populatedGroup = await Group.findById(savedGroup._id)
      .populate('members', 'email fullName')
      .populate('createdBy', 'email fullName');

    res.status(201).json({
      message: 'Group created successfully',
      group: populatedGroup
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error creating group',
      error: error.message
    });
  }
});

// GET /chats - Get all chats for user
router.get('/chats', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get one-on-one chats
    const personalChats = await Chat.find({
      participants: userId
    })
    .populate('participants', 'email fullName')
    .populate('messages.sender', 'email fullName')
    .sort({ 'lastMessage': -1 });

    // Get group chats
    const groupChats = await Group.find({
      members: userId
    })
    .populate('members', 'email fullName')
    .populate('createdBy', 'email fullName')
    .populate('messages.sender', 'email fullName')
    .sort({ 'lastMessage': -1 });

    res.json({
      personalChats,
      groupChats
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching chats',
      error: error.message
    });
  }
});

// POST /:chatId/message - Send a message in a chat
router.post('/:chatId/message', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    // Try to find personal chat first
    let chat = await Chat.findById(chatId);
    let isGroup = false;

    // If not found in personal chats, try groups
    if (!chat) {
      chat = await Group.findById(chatId);
      isGroup = true;
    }

    // If chat not found at all
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant/member
    const participants = isGroup ? chat.members : chat.participants;
    if (!participants.includes(userId)) {
      return res.status(403).json({ message: 'Not authorized to send messages in this chat' });
    }

    // Create and save the message
    const message = {
      sender: userId,
      content,
      timestamp: new Date()
    };

    chat.messages.push(message);
    chat.lastMessage = new Date();
    await chat.save();

    // Populate the sender info for the response
    const populatedChat = await (isGroup ? Group : Chat)
      .findById(chatId)
      .populate('messages.sender', 'email fullName')
      .select('messages')
      .slice('messages', -1);  // Get only the last message

    res.status(201).json({
      message: 'Message sent successfully',
      chat: populatedChat
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      message: 'Error sending message',
      error: error.message
    });
  }
});

// POST /group/:groupId/members - Add members to group
router.post('/group/:groupId/members', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;
    const userId = req.user.userId;

    // Find the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member of the group
    if (!group.members.includes(userId)) {
      return res.status(403).json({ message: 'Not authorized to add members to this group' });
    }

    // Validate all new members exist
    const newMembers = await User.find({ _id: { $in: memberIds } });
    if (newMembers.length !== memberIds.length) {
      return res.status(400).json({ message: 'One or more users not found' });
    }

    // Add new members to the group
    const uniqueMembers = [...new Set([...group.members, ...memberIds])];
    group.members = uniqueMembers;
    
    // Add system message about new members
    const newMemberNames = newMembers.map(member => member.fullName).join(', ');
    group.messages.push({
      sender: userId,
      content: `Added new members: ${newMemberNames}`,
      timestamp: new Date(),
      isSystemMessage: true
    });

    await group.save();

    // Get populated group data
    const populatedGroup = await Group.findById(groupId)
      .populate('members', 'email fullName')
      .populate('messages.sender', 'email fullName');

    res.json({
      message: 'Members added successfully',
      group: populatedGroup
    });
  } catch (error) {
    console.error('Error adding members:', error);
    res.status(500).json({
      message: 'Error adding members',
      error: error.message
    });
  }
});

module.exports = router; 