import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  FormControl,
  IconButton,
  Input,
  Text,
  useToast,
  VStack,
  Avatar,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  List,
  ListItem,
  Checkbox,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { ArrowBackIcon, SearchIcon, AddIcon } from '@chakra-ui/icons';
import { chats } from '../utils/api';
import socketService from '../services/socket';
import { setDocumentTitle } from '../utils/title';

// Header Component
const ChatHeader = ({ chat, user, onBack, onAddMembers }) => (
  <Box py={3} px={4} bg="white" borderBottom="1px solid" borderColor="gray.200">
    <Flex align="center" gap={3}>
      <IconButton
        icon={<ArrowBackIcon />}
        onClick={onBack}
        aria-label="Back to chats"
        variant="ghost"
        size="sm"
      />
      <Avatar 
        name={chat?.name || chat?.participants?.find(p => p._id !== user.id)?.fullName || 'Unknown'} 
        size="sm"
        bg={chat?.isGroup ? "green.500" : "blue.500"}
      />
      <Box flex={1}>
        <Text fontSize="md" fontWeight="bold" isTruncated>
          {chat?.name || chat?.participants?.find(p => p._id !== user.id)?.fullName || 'Unknown'}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {chat?.isGroup ? `${chat.members?.length || 0} members` : 'Online'}
        </Text>
      </Box>
      {chat?.isGroup && (
        <IconButton
          icon={<AddIcon />}
          aria-label="Add members"
          variant="ghost"
          size="sm"
          onClick={onAddMembers}
        />
      )}
    </Flex>
  </Box>
);

// Message Component
const Message = ({ message, isUser, sender }) => (
  <Flex justify={isUser ? 'flex-end' : 'flex-start'} align="flex-end" gap={2}>
    {!isUser && (
      <Avatar 
        name={sender?.fullName} 
        size="xs"
        bg="blue.500"
      />
    )}
    <Box
      maxW="75%"
      bg={isUser ? 'blue.500' : 'gray.100'}
      color={isUser ? 'white' : 'black'}
      px={3}
      py={2}
      borderRadius={isUser ? '15px 15px 0 15px' : '15px 15px 15px 0'}
    >
      {message.isSystemMessage && (
        <Text fontSize="xs" color={isUser ? 'whiteAlpha.800' : 'gray.500'} fontStyle="italic">
          System Message
        </Text>
      )}
      <Text fontSize="sm">{message.content}</Text>
      <Text 
        fontSize="10px" 
        opacity={0.8} 
        mt={1}
        textAlign={isUser ? 'right' : 'left'}
        color={isUser ? 'whiteAlpha.800' : 'gray.500'}
      >
        {new Date(message.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        })}
      </Text>
    </Box>
  </Flex>
);

// Add Members Modal Component
const AddMembersModal = ({ 
  isOpen, 
  onClose, 
  availableUsers, 
  selectedUsers, 
  onToggleUser, 
  onAddMembers,
  searchQuery,
  onSearchChange 
}) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>Add Members</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <VStack spacing={4}>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
            />
          </InputGroup>
          <List spacing={2} maxH="300px" overflowY="auto" w="full">
            {availableUsers
              .filter(user => 
                user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((user) => (
                <ListItem
                  key={user._id}
                  p={2}
                  borderRadius="md"
                  _hover={{ bg: 'gray.50' }}
                >
                  <Flex align="center">
                    <Checkbox
                      isChecked={selectedUsers.includes(user._id)}
                      onChange={() => onToggleUser(user._id)}
                      mr={3}
                    />
                    <Avatar name={user.fullName} size="sm" mr={3} />
                    <Text>{user.fullName}</Text>
                  </Flex>
                </ListItem>
              ))}
          </List>
        </VStack>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" mr={3} onClick={onClose}>
          Cancel
        </Button>
        <Button 
          colorScheme="blue" 
          onClick={onAddMembers}
          isDisabled={selectedUsers.length === 0}
        >
          Add Selected
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

export default function ChatWindow() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [chat, setChat] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const messageIdsRef = useRef(new Set());
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isGroup = window.location.pathname.startsWith('/group-chat/');

  useEffect(() => {
    loadChat();
    const token = localStorage.getItem('token');
    socketService.initialize(token);
    
    messageIdsRef.current = new Set();
    
    const handleMessage = (newMessage) => {
      if ((isGroup && newMessage.groupId === chatId) || (!isGroup && newMessage.chatId === chatId)) {
        const messageId = newMessage.message._id || `${newMessage.message.sender._id}-${newMessage.message.timestamp}`;
        if (!messageIdsRef.current.has(messageId)) {
          messageIdsRef.current.add(messageId);
          handleNewMessage(newMessage.message);
        }
      }
    };

    socketService.joinChat(chatId, isGroup);
    socketService.onMessage(handleMessage);

    return () => {
      socketService.leaveChat(chatId, isGroup);
    };
  }, [chatId, isGroup]);

  useEffect(() => {
    if (chat) {
      const chatName = chat.name || chat.participants?.find(p => p._id !== user.id)?.fullName || 'Chat';
      setDocumentTitle(chatName);
    }
  }, [chat, user.id]);

  const loadChat = async () => {
    try {
      const response = await chats.getAll();
      const currentChat = 
        response.personalChats.find(c => c._id === chatId) ||
        response.groupChats.find(c => c._id === chatId);
        
      if (currentChat) {
        setChat({ ...currentChat, isGroup });
        currentChat.messages?.forEach(msg => {
          const messageId = msg._id || `${msg.sender._id}-${msg.timestamp}`;
          messageIdsRef.current.add(messageId);
        });
        scrollToBottom();
      } else {
        toast({
          title: 'Chat not found',
          description: 'The chat you are looking for does not exist or you do not have access to it.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        navigate('/chats');
      }
    } catch (err) {
      toast({
        title: 'Error loading chat',
        description: err.response?.data?.message || 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      navigate('/chats');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewMessage = (newMessage) => {
    setChat(prev => {
      const messageId = newMessage._id || `${newMessage.sender._id}-${newMessage.timestamp}`;
      const messageExists = prev.messages?.some(msg => {
        const existingId = msg._id || `${msg.sender._id}-${msg.timestamp}`;
        return existingId === messageId;
      });

      if (messageExists) {
        return prev;
      }

      return {
        ...prev,
        messages: [...(prev.messages || []), newMessage],
      };
    });
    scrollToBottom();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await chats.sendMessage(chatId, message);
      socketService.sendMessage(chatId, message, isGroup);
      setMessage('');
    } catch (err) {
      toast({
        title: 'Error sending message',
        description: err.response?.data?.message || 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        const existingMemberIds = chat.members.map(member => member._id);
        setAvailableUsers(data.users.filter(user => 
          !existingMemberIds.includes(user._id) && user._id !== user.id
        ));
      }
    } catch (err) {
      toast({
        title: 'Error loading users',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const response = await fetch(`http://localhost:5000/api/chat/group/${chatId}/members`, {
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

      await response.json();
      toast({
        title: 'Members added',
        description: 'New members have been added to the group',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setIsAddMembersModalOpen(false);
      setSelectedUsers([]);
      loadChat();
    } catch (err) {
      console.error('Error adding members:', err);
      toast({
        title: 'Error adding members',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (isLoading) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="3px" />
          <Text color="gray.600">Loading chat...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Flex direction="column" h="100vh">
      <ChatHeader 
        chat={chat}
        user={user}
        onBack={() => navigate('/chats')}
        onAddMembers={() => {
          setIsAddMembersModalOpen(true);
          loadAvailableUsers();
        }}
      />

      <Box 
        flex={1} 
        overflowY="auto" 
        px={4} 
        py={4}
        bg="white"
        ref={messagesContainerRef}
      >
        <VStack spacing={4} align="stretch">
          {chat?.messages.map((msg, index) => (
            <Message
              key={msg._id || index}
              message={msg}
              isUser={msg.sender._id === user.id}
              sender={msg.sender}
            />
          ))}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      <Box p={4} bg="white" borderTop="1px solid" borderColor="gray.200">
        <form onSubmit={handleSendMessage}>
          <Flex gap={2}>
            <FormControl>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                size="md"
                bg="gray.50"
                border="1px solid"
                borderColor="gray.200"
                _hover={{ borderColor: 'gray.300' }}
                _focus={{
                  borderColor: 'blue.500',
                  boxShadow: 'none'
                }}
              />
            </FormControl>
            <Button 
              type="submit" 
              colorScheme="blue"
              size="md"
              px={6}
              isDisabled={!message.trim()}
            >
              Send
            </Button>
          </Flex>
        </form>
      </Box>

      <AddMembersModal
        isOpen={isAddMembersModalOpen}
        onClose={() => setIsAddMembersModalOpen(false)}
        availableUsers={availableUsers}
        selectedUsers={selectedUsers}
        onToggleUser={(userId) => {
          setSelectedUsers(prev => 
            prev.includes(userId)
              ? prev.filter(id => id !== userId)
              : [...prev, userId]
          );
        }}
        onAddMembers={handleAddMembers}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </Flex>
  );
} 