import { Box } from '@chakra-ui/react';

export default function AppLayout({ children }) {
  return (
    <Box
      as="main"
      minH="100vh"
      bg="gray.100"
      overflowY="auto"
      display="flex"
      alignItems={{ base: "flex-start", md: "center" }}
      justifyContent="center"
      p={{ base: 0, md: 4 }}
    >
      <Box
        w="full"
        maxW="480px"
        minH={{ base: "100vh", md: "min(100vh, calc(100vh - 32px))" }}
        bg="white"
        position="relative"
        boxShadow={{ base: "none", md: "2xl" }}
        borderRadius={{ base: 0, md: "lg" }}
        display="flex"
        flexDirection="column"
      >
        {children}
      </Box>
    </Box>
  );
} 