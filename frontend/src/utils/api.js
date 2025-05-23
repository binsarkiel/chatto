import axios from 'axios';
import { API_BASE_URL, LOCAL_STORAGE_KEYS } from '../constants';
import { emitNewGroup } from './socket';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/auth/profile', userData);
    return response.data;
  },

  getUsers: async () => {
    const response = await api.get('/auth/users');
    return response.data;
  },
};

export const chats = {
  getAll: async () => {
    const response = await api.get('/chat/chats');
    return {
      personalChats: response.data.personalChats || [],
      groupChats: response.data.groupChats || []
    };
  },

  create: async (participantId) => {
    const response = await api.post('/chat/chat', { participantId });
    return response.data;
  },

  createGroup: async (data) => {
    const response = await api.post('/chat/group', data);
    const newGroup = response.data;
    emitNewGroup(newGroup);
    return newGroup;
  },

  sendMessage: async (chatId, content) => {
    const response = await api.post(`/chat/${chatId}/message`, { content });
    return response.data;
  },

  addGroupMembers: async (groupId, memberIds) => {
    const response = await api.post(`/chat/group/${groupId}/members`, { memberIds });
    return response.data;
  },
};

export default api; 