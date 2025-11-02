import { create } from 'zustand';
import type { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  setAuthState: (user: User | null, loading: boolean) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setAuthState: (user, loading) => set({ user, loading }),
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}));
