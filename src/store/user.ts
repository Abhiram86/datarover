import { create } from "zustand";

export interface User {
  userId: string;
  email: string;
  name: string;
}

interface UserStoreState {
  // data
  user: User | null;
  isAuthenticated: boolean;

  // actions
  setUser: (user: User | null) => void;
  logout: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
};

export const useUserStore = create<UserStoreState>((set) => ({
  ...initialState,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  logout: () => set(initialState),
}));
