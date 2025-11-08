import React, { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import { useAuthStore } from './useAuthStore';

interface AuthContextValue {
  user: User | null;
  uid: string | null;
}

const AuthContext = createContext<AuthContextValue>({ user: null, uid: null });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const value: AuthContextValue = { user, uid: user?.uid ?? null };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

