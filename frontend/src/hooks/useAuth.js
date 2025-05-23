import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LOCAL_STORAGE_KEYS, ROUTES } from '../constants';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem(LOCAL_STORAGE_KEYS.USER);
        const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);

        if (storedUser && token) {
          setUser(JSON.parse(storedUser));
        } else {
          // If no user data is found, redirect to login
          navigate(ROUTES.LOGIN);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // On error, clear storage and redirect to login
        localStorage.clear();
        navigate(ROUTES.LOGIN);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [navigate]);

  const login = (userData, token) => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.USER, JSON.stringify(userData));
    localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, token);
    setUser(userData);
    navigate(ROUTES.CHATS);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    navigate(ROUTES.LOGIN);
  };

  const updateUser = (userData) => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.USER, JSON.stringify(userData));
    setUser(userData);
  };

  return {
    user,
    isLoading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };
}; 