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

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/chats');
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
          Login
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
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              size="lg"
              bg="gray.50"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
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
            Login
          </Button>

          <Text color="gray.600">
            Don't have an account?{' '}
            <Link 
              as={RouterLink} 
              to="/register" 
              color="blue.500"
              fontWeight="medium"
            >
              Register
            </Link>
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
} 