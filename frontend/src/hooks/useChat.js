import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { chats } from '../utils/api';
import socketService from '../services/socket';
import { TOAST_DURATION } from '../constants';

export const useChat = (chatId, isGroup) => {
  const [chat, setChat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const messageIdsRef = useRef(new Set());
  const toast = useToast();

  const loadChat = useCallback(async () => {
    try {
      const response = await chats.getAll();
      const currentChat = 
        response.personalChats.find(c => c._id === chatId) ||
        response.groupChats.find(c => c._id === chatId);
        
      if (currentChat) {
        setChat({ ...currentChat, isGroup });
        setMessages(currentChat.messages || []);
        // Add existing message IDs to the Set
        currentChat.messages?.forEach(msg => {
          const messageId = msg._id || `${msg.sender._id}-${msg.timestamp}`;
          messageIdsRef.current.add(messageId);
        });
      } else {
        throw new Error('Chat not found or access denied');
      }
    } catch (err) {
      toast({
        title: 'Error loading chat',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: TOAST_DURATION,
        isClosable: true,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [chatId, isGroup, toast]);

  const handleNewMessage = useCallback((newMessage) => {
    const messageId = newMessage._id || `${newMessage.sender._id}-${newMessage.timestamp}`;
    if (!messageIdsRef.current.has(messageId)) {
      messageIdsRef.current.add(messageId);
      setMessages(prev => [...prev, newMessage]);
    }
  }, []);

  const sendMessage = useCallback(async (content) => {
    try {
      await chats.sendMessage(chatId, content);
      socketService.sendMessage(chatId, content, isGroup);
    } catch (err) {
      toast({
        title: 'Error sending message',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: TOAST_DURATION,
        isClosable: true,
      });
      throw err;
    }
  }, [chatId, isGroup, toast]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    socketService.initialize(token);
    
    // Reset message IDs when changing chats
    messageIdsRef.current = new Set();
    
    const handleMessage = (data) => {
      if ((isGroup && data.groupId === chatId) || (!isGroup && data.chatId === chatId)) {
        handleNewMessage(data.message);
      }
    };

    socketService.joinChat(chatId, isGroup);
    socketService.onMessage(handleMessage);

    loadChat();

    return () => {
      socketService.leaveChat(chatId, isGroup);
    };
  }, [chatId, isGroup, handleNewMessage, loadChat]);

  return {
    chat,
    messages,
    isLoading,
    sendMessage,
    loadChat,
  };
}; 