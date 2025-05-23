import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  Text,
  VStack,
  useToast,
  List,
  ListItem,
  Avatar,
  InputGroup,
  InputLeftElement,
  Checkbox,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Spinner,
} from '@chakra-ui/react';
import { ArrowBackIcon, SearchIcon, AddIcon } from '@chakra-ui/icons';
import { setDocumentTitle } from '../utils/title';

export default function NewChat() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setDocumentTitle('New Chat');
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users.filter(user => user._id !== currentUser.id));
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast({
        title: 'Error loading users',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startChat = async (userId) => {
    try {
      const response = await fetch('http://localhost:5000/api/chat/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          participantId: userId
        }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.log('Response text:', text);
        throw new Error('Invalid server response');
      }

      const data = await response.json();
      if (response.ok) {
        navigate(`/chat/${data.chat._id}`);
      } else {
        throw new Error(data.message || 'Failed to create chat');
      }
    } catch (err) {
      console.error('Chat creation error:', err);
      toast({
        title: 'Error starting chat',
        description: 'Unable to create chat. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: 'Group name required',
        description: 'Please enter a name for the group',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (selectedUsers.length < 1) {
      toast({
        title: 'Select members',
        description: 'Please select at least one member for the group',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/chat/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: groupName,
          memberIds: selectedUsers
        }),
      });

      const data = await response.json();
      if (response.ok) {
        navigate(`/group-chat/${data.group._id}`);
      } else {
        throw new Error(data.message || 'Failed to create group');
      }
    } catch (err) {
      toast({
        title: 'Error creating group',
        description: err.message || 'Unable to create group. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Flex direction="column" flex="1" minH="0">
      <Box 
        py={3}
        px={4}
        borderBottom="1px solid"
        borderColor="gray.200"
        position="sticky"
        top={0}
        bg="white"
        zIndex={1}
      >
        <Flex align="center" gap={3}>
          <IconButton
            icon={<ArrowBackIcon />}
            onClick={() => navigate('/chats')}
            aria-label="Back to chats"
            variant="ghost"
            size="sm"
          />
          <Text fontSize="lg" fontWeight="bold" flex="1">
            New Chat
          </Text>
          <IconButton
            icon={<AddIcon />}
            onClick={() => setIsGroupModalOpen(true)}
            aria-label="Create group"
            colorScheme="blue"
            size="sm"
          />
        </Flex>
      </Box>

      <Box 
        position="sticky" 
        top="57px" 
        bg="white" 
        zIndex={1}
        borderBottom="1px solid"
        borderColor="gray.100"
        px={4}
        py={3}
      >
        <InputGroup maxW="400px" mx="auto">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            bg="gray.50"
          />
        </InputGroup>
      </Box>

      <Box 
        flex="1"
        overflowY="auto"
      >
        {isLoading ? (
          <Flex justify="center" align="center" h="full" p={4}>
            <Spinner size="lg" color="blue.500" thickness="3px" />
          </Flex>
        ) : filteredUsers.length === 0 ? (
          <Flex justify="center" align="center" h="full" p={4}>
            <Text color="gray.500" textAlign="center">
              {searchQuery ? 'No users found' : 'No other users available'}
            </Text>
          </Flex>
        ) : (
          <List w="full" maxW="400px" mx="auto">
            {filteredUsers.map(user => (
              <ListItem
                key={user._id}
                onClick={() => startChat(user._id)}
                role="group"
                cursor="pointer"
                _hover={{ bg: 'gray.50' }}
                transition="all 0.2s"
              >
                <Box 
                  px={4} 
                  py={3}
                  borderBottom="1px solid"
                  borderColor="gray.100"
                >
                  <Flex align="center" gap={3}>
                    <Avatar 
                      name={user.fullName} 
                      size="md"
                      bg="blue.500"
                    />
                    <Box flex={1}>
                      <Text fontWeight="medium">{user.fullName}</Text>
                      <Text fontSize="sm" color="gray.500">
                        {user.email}
                      </Text>
                    </Box>
                  </Flex>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Group Creation Modal */}
      <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Group</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Group Name</FormLabel>
                <Input
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </FormControl>
              <Box w="full">
                <Text mb={2} fontWeight="medium">Select Members</Text>
                <List spacing={2} maxH="300px" overflowY="auto">
                  {users.map(user => (
                    <ListItem key={user._id}>
                      <Flex 
                        p={2} 
                        borderRadius="md" 
                        _hover={{ bg: 'gray.50' }}
                        cursor="pointer"
                        onClick={() => toggleUserSelection(user._id)}
                      >
                        <Checkbox 
                          isChecked={selectedUsers.includes(user._id)}
                          onChange={() => {}}
                          mr={3}
                        />
                        <Flex align="center" gap={2} flex={1}>
                          <Avatar 
                            name={user.fullName} 
                            size="sm"
                            bg="blue.500"
                          />
                          <Box>
                            <Text fontWeight="medium">{user.fullName}</Text>
                            <Text fontSize="sm" color="gray.500">
                              {user.email}
                            </Text>
                          </Box>
                        </Flex>
                      </Flex>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsGroupModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={createGroup}
              isDisabled={!groupName.trim() || selectedUsers.length === 0}
            >
              Create Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
} 