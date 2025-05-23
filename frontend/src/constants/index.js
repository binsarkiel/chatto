export const API_BASE_URL = 'http://localhost:5000/api';
export const SOCKET_URL = 'http://localhost:5000';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  CHATS: '/chats',
  CHAT: '/chat/:chatId',
  GROUP_CHAT: '/group-chat/:chatId',
  NEW_CHAT: '/new-chat',
};

export const LOCAL_STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
};

export const TOAST_DURATION = 3000;

export const MESSAGE_TYPES = {
  SYSTEM: 'system',
  USER: 'user',
};

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  JOIN_CHAT: 'join_chat',
  JOIN_GROUP: 'join_group',
  SEND_MESSAGE: 'send_chat_message',
  SEND_GROUP_MESSAGE: 'send_group_message',
  RECEIVE_MESSAGE: 'receive_message',
  NEW_CHAT: 'new_chat',
  NEW_GROUP: 'new_group',
  CHAT_UPDATED: 'chat_updated',
  ADDED_TO_GROUP: 'added_to_group',
};

export const AVATAR_COLORS = {
  USER: 'blue.500',
  GROUP: 'green.500',
}; 