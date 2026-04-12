import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TOKEN_KEY = 'tm_token';
const USER_KEY = 'tm_user';

export const AuthContext = createContext({});

const roleRedirect = {
  admin: '/admin',
  driver: '/driver',
  student: '/student'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setToken(null);
  }, []);

  const persistSession = useCallback((nextToken, nextUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } else {
      clearSession();
    }
    setLoading(false);
  }, [clearSession]);

  const login = useCallback(
    async ({ username, role }) => {
      // Mocked login flow using dummy values with no backend
      const dummyRole = role || 'student';
      const mockResult = {
        token: `dummy_token_${dummyRole}_${Date.now()}`,
        user: {
          id: `dummy_${dummyRole}_1`,
          username: username || 'dummy_user',
          role: dummyRole,
          firstName: 'Dummy',
          lastName: dummyRole,
          firstLogin: false
        }
      };

      persistSession(mockResult.token, mockResult.user);
      const destination = roleRedirect[mockResult.user.role] || '/login';
      navigate(destination, { replace: true });
      return mockResult.user;
    },
    [navigate, persistSession]
  );

  const logout = useCallback(() => {
    clearSession();
    navigate('/login', { replace: true });
  }, [clearSession, navigate]);

  const value = useMemo(
    () => ({ user, token, loading, login, logout, setUser }),
    [loading, login, logout, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
