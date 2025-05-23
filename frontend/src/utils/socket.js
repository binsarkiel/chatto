import io from 'socket.io-client';
import { SOCKET_URL, SOCKET_EVENTS } from '../constants';

let socket = null;

export const initializeSocket = (token) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: {
        token: `Bearer ${token}`
      }
    });

    socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('Connected to socket server');
    });

    socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error) => {
      console.error('Socket connection error:', error);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const subscribeToChat = (chatId, callback, isGroup = false) => {
  if (!socket) return;

  const event = isGroup ? SOCKET_EVENTS.JOIN_GROUP : SOCKET_EVENTS.JOIN_CHAT;
  socket.emit(event, chatId);

  socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, (data) => {
    if ((isGroup && data.groupId === chatId) || (!isGroup && data.chatId === chatId)) {
      callback(data.message);
    }
  });
};

export const unsubscribeFromChat = (chatId) => {
  if (socket) {
    socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE);
  }
};

export const sendMessage = (chatId, content, isGroup = false) => {
  if (!socket) return;

  const event = isGroup ? SOCKET_EVENTS.SEND_GROUP_MESSAGE : SOCKET_EVENTS.SEND_MESSAGE;
  const payload = isGroup ? { groupId: chatId, content } : { chatId, content };
  socket.emit(event, payload);
};

export const emitNewGroup = (group) => {
  if (!socket) return;
  socket.emit(SOCKET_EVENTS.NEW_GROUP, group);
};

export const emitAddedToGroup = (group, memberIds) => {
  if (!socket) return;
  socket.emit(SOCKET_EVENTS.ADDED_TO_GROUP, { group, memberIds });
}; 