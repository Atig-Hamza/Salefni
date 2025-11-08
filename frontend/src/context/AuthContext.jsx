import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get } from '../api/client.js';

const STORAGE_KEY = 'selefni_admin_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialised, setInitialised] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setInitialised(true);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setAuthError(null);
    const admins = await get('/admins', { email, password });
    const admin = Array.isArray(admins) ? admins[0] : null;

    if (!admin) {
      setAuthError('Identifiants invalides');
      return false;
    }

    const payload = { id: admin.id, email: admin.email };
    setUser(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(() => ({
    user,
    authError,
    login,
    logout,
    initialised,
  }), [user, authError, login, logout, initialised]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}
