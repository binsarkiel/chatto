import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import Register from './components/Register';
import Login from './components/Login';
import Profile from './components/Profile';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import NewChat from './components/NewChat';
import AppLayout from './components/layout/AppLayout';
import { setDocumentTitle } from './utils/title';
import { useEffect } from 'react';

// Custom theme configuration
const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: 'gray.100',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'lg',
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'blue.500',
      },
    },
  },
});

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    localStorage.clear(); // Clear any partial data
    return <Navigate to="/login" />;
  }
  return children;
};

const AuthLayout = ({ children }) => (
  <AppLayout>
    {children}
  </AppLayout>
);

export default function App() {
  useEffect(() => {
    setDocumentTitle(); // Set default title
  }, []);

  return (
    <ChakraProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/register" element={
            <AuthLayout>
              <Register />
            </AuthLayout>
          } />
          <Route path="/login" element={
            <AuthLayout>
              <Login />
            </AuthLayout>
          } />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <AuthLayout>
                  <Profile />
                </AuthLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/chats"
            element={
              <PrivateRoute>
                <AuthLayout>
                  <ChatList />
                </AuthLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/new-chat"
            element={
              <PrivateRoute>
                <AuthLayout>
                  <NewChat />
                </AuthLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/chat/:chatId"
            element={
              <PrivateRoute>
                <AuthLayout>
                  <ChatWindow />
                </AuthLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/group-chat/:chatId"
            element={
              <PrivateRoute>
                <AuthLayout>
                  <ChatWindow />
                </AuthLayout>
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
}
