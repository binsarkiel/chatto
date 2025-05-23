import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Text,
  VStack,
  useToast,
  Link,
} from '@chakra-ui/react';

export default function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Registration successful! Please login.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        navigate('/login');
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
    <Flex direction="column" flex="1" minH="0">
      <Box 
        py={4}
        px={4}
        borderBottom="1px solid"
        borderColor="gray.200"
        position="sticky"
        top={0}
        bg="white"
        zIndex={1}
      >
        <Text fontSize="xl" fontWeight="bold">
          Register
        </Text>
      </Box>

      <Box
        flex="1"
        overflowY="auto"
        px={4}
        pb={4}
      >
        <VStack 
          w="full" 
          maxW="400px" 
          spacing={6}
          as="form" 
          onSubmit={handleSubmit}
          mx="auto"
          py={4}
        >
          <FormControl isRequired>
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

          <FormControl isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              size="lg"
              bg="gray.50"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              size="lg"
              bg="gray.50"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Confirm Password</FormLabel>
            <Input
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
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
            Register
          </Button>

          <Text color="gray.600">
            Already have an account?{' '}
            <Link 
              as={RouterLink} 
              to="/login" 
              color="blue.500"
              fontWeight="medium"
            >
              Login
            </Link>
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
} 