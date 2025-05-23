import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { chats } from '../utils/api';
import socketService from '../services/socket';
import { TOAST_DURATION } from '../constants';

/**
 * Custom hook for managing the chat list
 */
export const useChatList = () => {
  const [chatList, setChatList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const chatListRef = useRef([]); // Add ref to store current chatList
  const toast = useToast();

  // Update ref whenever chatList changes
  useEffect(() => {
    chatListRef.current = chatList;
  }, [chatList]);

  /**
   * Load all chats from the server
   */
  const loadChats = useCallback(async () => {
    try {
      const response = await chats.getAll();
      const personalChats = (response.personalChats || []).map(chat => ({ ...chat, isGroup: false }));
      const groupChats = (response.groupChats || []).map(chat => ({ ...chat, isGroup: true }));
      const allChats = [...personalChats, ...groupChats];
      setChatList(allChats);
      return allChats;
    } catch (err) {
      toast({
        title: 'Error loading chats',
        description: err.response?.data?.message || 'An error occurred',
        status: 'error',
        duration: TOAST_DURATION,
        isClosable: true,
      });
      setChatList([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Handle chat updates
   */
  const handleChatUpdate = useCallback((updatedChat) => {
    setChatList(prev => {
      const updatedList = prev.filter(chat => chat._id !== updatedChat._id);
      return [updatedChat, ...updatedList];
    });
  }, []);

  /**
   * Handle new chat creation
   */
  const handleNewChat = useCallback((chat) => {
    setChatList(prev => {
      const exists = prev.some(c => c._id === chat._id);
      if (exists) return prev;
      socketService.joinChat(chat._id, false);
      return [{ ...chat, isGroup: false }, ...prev];
    });
  }, []);

  /**
   * Handle new group creation
   */
  const handleNewGroup = useCallback((group) => {
    setChatList(prev => {
      const exists = prev.some(c => c._id === group._id);
      if (exists) return prev;
      socketService.joinChat(group._id, true);
      return [{ ...group, isGroup: true }, ...prev];
    });
  }, []);

  /**
   * Handle being added to a group
   */
  const handleAddedToGroup = useCallback((group) => {
    setChatList(prev => {
      const exists = prev.some(chat => chat._id === group._id);
      if (exists) return prev;
      socketService.joinChat(group._id, true);
      return [{ ...group, isGroup: true }, ...prev];
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    socketService.initialize(token);

    // Load chats and join rooms
    loadChats().then(chats => {
      chats.forEach(chat => {
        socketService.joinChat(chat._id, chat.isGroup);
      });
    });

    // Set up socket event listeners
    socketService.onChatUpdate(handleChatUpdate);
    socketService.onNewChat(handleNewChat);
    socketService.onNewGroup(handleNewGroup);
    socketService.onAddedToGroup(handleAddedToGroup);

    // Cleanup using ref instead of state
    return () => {
      chatListRef.current.forEach(chat => {
        socketService.leaveChat(chat._id, chat.isGroup);
      });
      socketService.cleanup();
    };
  }, [loadChats, handleChatUpdate, handleNewChat, handleNewGroup, handleAddedToGroup]);

  return {
    chatList,
    isLoading,
    loadChats,
  };
}; 