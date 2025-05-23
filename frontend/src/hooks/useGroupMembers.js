import { useState, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { API_BASE_URL, TOAST_DURATION } from '../constants';
import { emitAddedToGroup } from '../utils/socket';

export const useGroupMembers = (chatId, onSuccess) => {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const loadAvailableUsers = useCallback(async (currentMembers) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        const existingMemberIds = currentMembers.map(member => member._id);
        setAvailableUsers(data.users.filter(user => 
          !existingMemberIds.includes(user._id)
        ));
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast({
        title: 'Error loading users',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: TOAST_DURATION,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const addMembers = useCallback(async () => {
    if (selectedUsers.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat/group/${chatId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ memberIds: selectedUsers }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const updatedGroup = await response.json();
      
      // Emit socket event for added members
      emitAddedToGroup(updatedGroup, selectedUsers);

      toast({
        title: 'Members added',
        description: 'New members have been added to the group',
        status: 'success',
        duration: TOAST_DURATION,
        isClosable: true,
      });

      setSelectedUsers([]);
      onSuccess?.();
    } catch (err) {
      console.error('Error adding members:', err);
      toast({
        title: 'Error adding members',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: TOAST_DURATION,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [chatId, selectedUsers, toast, onSuccess]);

  const toggleUserSelection = useCallback((userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }, []);

  return {
    availableUsers,
    selectedUsers,
    isLoading,
    loadAvailableUsers,
    addMembers,
    toggleUserSelection,
  };
}; 