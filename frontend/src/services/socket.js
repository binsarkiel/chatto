import io from 'socket.io-client';
import { SOCKET_URL, SOCKET_EVENTS } from '../constants';

class SocketService {
  constructor() {
    this.socket = null;
    this.eventHandlers = new Map();
  }

  /**
   * Initialize socket connection
   */
  initialize(token) {
    if (this.socket) return this.socket;

    this.socket = io(SOCKET_URL, {
      auth: {
        token: `Bearer ${token}`
      }
    });

    this.setupBaseHandlers();
    return this.socket;
  }

  /**
   * Set up base socket event handlers
   */
  setupBaseHandlers() {
    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('Connected to socket server');
    });

    this.socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error) => {
      console.error('Socket connection error:', error);
    });
  }

  /**
   * Join a chat room
   */
  joinChat(chatId, isGroup = false) {
    if (!this.socket) return;

    const event = isGroup ? SOCKET_EVENTS.JOIN_GROUP : SOCKET_EVENTS.JOIN_CHAT;
    this.socket.emit(event, chatId);
  }

  /**
   * Leave a chat room
   */
  leaveChat(chatId, isGroup = false) {
    if (!this.socket) return;

    const roomPrefix = isGroup ? 'group_' : 'chat_';
    this.socket.emit('leave', `${roomPrefix}${chatId}`);
  }

  /**
   * Send a message
   */
  sendMessage(chatId, content, isGroup = false) {
    if (!this.socket) return;

    const event = isGroup ? SOCKET_EVENTS.SEND_GROUP_MESSAGE : SOCKET_EVENTS.SEND_MESSAGE;
    const payload = isGroup ? { groupId: chatId, content } : { chatId, content };
    this.socket.emit(event, payload);
  }

  /**
   * Subscribe to message events
   */
  onMessage(callback) {
    if (!this.socket) return;

    this.socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, callback);
    this.eventHandlers.set(SOCKET_EVENTS.RECEIVE_MESSAGE, callback);
  }

  /**
   * Subscribe to chat update events
   */
  onChatUpdate(callback) {
    if (!this.socket) return;

    this.socket.on(SOCKET_EVENTS.CHAT_UPDATED, callback);
    this.eventHandlers.set(SOCKET_EVENTS.CHAT_UPDATED, callback);
  }

  /**
   * Subscribe to new chat events
   */
  onNewChat(callback) {
    if (!this.socket) return;

    this.socket.on(SOCKET_EVENTS.NEW_CHAT, callback);
    this.eventHandlers.set(SOCKET_EVENTS.NEW_CHAT, callback);
  }

  /**
   * Subscribe to new group events
   */
  onNewGroup(callback) {
    if (!this.socket) return;

    this.socket.on(SOCKET_EVENTS.NEW_GROUP, callback);
    this.eventHandlers.set(SOCKET_EVENTS.NEW_GROUP, callback);
  }

  /**
   * Subscribe to added to group events
   */
  onAddedToGroup(callback) {
    if (!this.socket) return;

    this.socket.on(SOCKET_EVENTS.ADDED_TO_GROUP, callback);
    this.eventHandlers.set(SOCKET_EVENTS.ADDED_TO_GROUP, callback);
  }

  /**
   * Unsubscribe from all events
   */
  cleanup() {
    if (!this.socket) return;

    this.eventHandlers.forEach((handler, event) => {
      this.socket.off(event, handler);
    });
    this.eventHandlers.clear();
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.cleanup();
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService; 