import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  Text,
  VStack,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Spinner,
  List,
  ListItem,
} from '@chakra-ui/react';
import { ChevronDownIcon, AddIcon } from '@chakra-ui/icons';
import { useAuth } from '../hooks/useAuth';
import { useChatList } from '../hooks/useChatList';
import { ROUTES, AVATAR_COLORS } from '../constants';

export default function ChatList() {
  const navigate = useNavigate();
  const { user, logout, isLoading: isUserLoading } = useAuth();
  const { chatList, isLoading: isChatsLoading } = useChatList();

  const getOtherParticipant = (chat) => {
    if (!chat) return 'Unknown';
    if (chat.isGroup) return chat.name;
    const otherUser = chat.participants?.find(p => p._id !== user?.id);
    return otherUser?.fullName || 'Unknown User';
  };

  const getChatUrl = (chat) => {
    return chat.isGroup ? `/group-chat/${chat._id}` : `/chat/${chat._id}`;
  };

  const getLastMessage = (chat) => {
    if (!chat?.messages?.length) return '';
    const lastMsg = chat.messages[chat.messages.length - 1];
    return lastMsg.content;
  };

  const getLastMessageTime = (chat) => {
    if (!chat?.messages?.length) return '';
    const lastMsg = chat.messages[chat.messages.length - 1];
    const date = new Date(lastMsg.timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    }
    
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (date > weekAgo) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Flex direction="column" height="100%" maxH="100%">
      <Box 
        py={3}
        px={4}
        borderBottom="1px solid"
        borderColor="gray.200"
        bg="white"
        position="sticky"
        top={0}
        zIndex={1}
      >
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={3}>
            {isUserLoading ? (
              <Spinner size="sm" color="blue.500" />
            ) : (
              <>
                <Avatar 
                  name={user?.fullName} 
                  size="sm"
                  bg={AVATAR_COLORS.USER}
                />
                <Box>
                  <Text fontSize="md" fontWeight="bold">{user?.fullName}</Text>
                  <Text fontSize="xs" color="gray.500">Online</Text>
                </Box>
              </>
            )}
          </Flex>
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<ChevronDownIcon />}
              variant="ghost"
              size="sm"
            />
            <MenuList>
              <MenuItem onClick={() => navigate(ROUTES.PROFILE)}>Profile</MenuItem>
              <MenuItem onClick={logout}>Logout</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Box>

      <Box 
        flex={1} 
        overflowY="auto" 
        position="relative"
        sx={{
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'gray.200',
            borderRadius: '24px',
          },
        }}
      >
        {isUserLoading || isChatsLoading ? (
          <Flex justify="center" align="center" h="full" p={4}>
            <Spinner size="lg" color="blue.500" thickness="3px" />
          </Flex>
        ) : chatList.length === 0 ? (
          <Flex 
            direction="column" 
            align="center" 
            justify="center" 
            h="full"
            p={4}
            gap={3}
          >
            <Text color="gray.600" fontSize="lg" textAlign="center">
              No conversations yet
            </Text>
            <Text color="gray.500" fontSize="sm" textAlign="center">
              Start chatting with someone!
            </Text>
            <Button
              leftIcon={<AddIcon />}
              colorScheme="blue"
              onClick={() => navigate(ROUTES.NEW_CHAT)}
              size="md"
              mt={2}
            >
              New Chat
            </Button>
          </Flex>
        ) : (
          <List>
            {chatList.map((chat) => (
              <ListItem
                key={chat._id}
                onClick={() => navigate(getChatUrl(chat))}
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
                      name={getOtherParticipant(chat)} 
                      size="md"
                      bg={chat.isGroup ? AVATAR_COLORS.GROUP : AVATAR_COLORS.USER}
                    />
                    <Box flex={1} minW={0}>
                      <Flex justify="space-between" align="baseline">
                        <Text 
                          fontWeight="semibold" 
                          fontSize="md"
                          color="gray.900"
                          isTruncated
                        >
                          {getOtherParticipant(chat)}
                        </Text>
                        <Text 
                          fontSize="xs" 
                          color="gray.500"
                          ml={2}
                          flexShrink={0}
                        >
                          {getLastMessageTime(chat)}
                        </Text>
                      </Flex>
                      <Text 
                        color="gray.600" 
                        fontSize="sm"
                        isTruncated
                        mt={0.5}
                      >
                        {getLastMessage(chat) || 'No messages yet'}
                      </Text>
                    </Box>
                  </Flex>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {chatList.length > 0 && (
        <Box 
          position="fixed" 
          bottom={{ base: 4, md: 8 }} 
          right={{ base: 4, md: 8 }} 
          zIndex={2}
        >
          <Button
            w="56px"
            h="56px"
            borderRadius="full"
            colorScheme="blue"
            onClick={() => navigate(ROUTES.NEW_CHAT)}
            boxShadow="lg"
            _hover={{
              transform: 'scale(1.05)',
            }}
            _active={{
              transform: 'scale(0.95)',
            }}
            transition="all 0.2s"
          >
            <AddIcon boxSize={5} />
          </Button>
        </Box>
      )}
    </Flex>
  );
} 