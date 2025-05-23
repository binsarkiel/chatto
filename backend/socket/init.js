const socketIo = require('socket.io');
const socketAuth = require('./middleware');
const {
  handleJoinChat,
  handleJoinGroup,
  handleChatMessage,
  handleGroupMessage,
  handleDisconnect
} = require('./handlers');

/**
 * Initialize Socket.IO with the HTTP server
 */
const initializeSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: ["http://localhost:3000", "http://localhost:5173"],
      methods: ["GET", "POST"]
    }
  });

  // Apply authentication middleware
  io.use(socketAuth);

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Set up event listeners
    socket.on('join_chat', (chatId) => handleJoinChat(socket, chatId));
    socket.on('join_group', (groupId) => handleJoinGroup(socket, groupId));
    socket.on('send_chat_message', (data) => handleChatMessage(io, socket, data));
    socket.on('send_group_message', (data) => handleGroupMessage(io, socket, data));
    socket.on('disconnect', () => handleDisconnect(socket));
  });

  return io;
};

module.exports = initializeSocket; 