import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) return;
    api('/auth/me')
      .then(setUser)
      .catch(() => logout())
      .finally(() => setChecking(false));
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { token, user: u } = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(token);
    setUser(u);
  }, []);

  const value = useMemo(() => {
    const role = user?.role;
    return {
      user,
      checking,
      login,
      logout,
      can: {
        edit: role === 'ADMIN' || role === 'RANGER',
        review: role === 'ADMIN' || role === 'RANGER',
        admin: role === 'ADMIN',
      },
    };
  }, [user, checking, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
