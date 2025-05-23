import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Text,
  VStack,
  useToast,
  Avatar,
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';

export default function Profile() {
  const navigate = useNavigate();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setFormData(prev => ({
      ...prev,
      fullName: user.fullName || '',
      email: user.email || '',
    }));
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword || undefined,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({
          ...user,
          fullName: formData.fullName,
        }));

        toast({
          title: 'Success',
          description: 'Profile updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        }));
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex direction="column" h="100vh">
      <Box 
        py={3}
        px={4}
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Flex align="center" gap={3}>
          <IconButton
            icon={<ArrowBackIcon />}
            onClick={() => navigate('/chats')}
            aria-label="Back to chats"
            variant="ghost"
            size="sm"
          />
          <Text fontSize="lg" fontWeight="bold">
            Profile
          </Text>
        </Flex>
      </Box>

      <Box 
        flex={1} 
        overflowY="auto"
        p={4}
      >
        <VStack 
          spacing={6} 
          align="center"
          as="form"
          onSubmit={handleSubmit}
          maxW="400px"
          mx="auto"
          w="full"
        >
          <Avatar 
            size="2xl"
            name={formData.fullName}
            bg="blue.500"
          />

          <FormControl>
            <FormLabel>Full Name</FormLabel>
            <Input
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              size="lg"
              bg="gray.50"
            />
          </FormControl>

          <FormControl>
            <FormLabel>Email</FormLabel>
            <Input
              name="email"
              value={formData.email}
              isReadOnly
              size="lg"
              bg="gray.50"
            />
          </FormControl>

          <Box w="full" h="1px" bg="gray.200" my={2} />

          <FormControl>
            <FormLabel>Current Password</FormLabel>
            <Input
              name="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder="Enter current password"
              size="lg"
              bg="gray.50"
            />
          </FormControl>

          <FormControl>
            <FormLabel>New Password</FormLabel>
            <Input
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Enter new password"
              size="lg"
              bg="gray.50"
            />
          </FormControl>

          <FormControl>
            <FormLabel>Confirm New Password</FormLabel>
            <Input
              name="confirmNewPassword"
              type="password"
              value={formData.confirmNewPassword}
              onChange={handleChange}
              placeholder="Confirm new password"
              size="lg"
              bg="gray.50"
            />
          </FormControl>

          <Button
            type="submit"
            colorScheme="blue"
            size="lg"
            width="full"
            isLoading={isLoading}
          >
            Save Changes
          </Button>
        </VStack>
      </Box>
    </Flex>
  );
} 