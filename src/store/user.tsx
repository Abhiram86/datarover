import { createStore, useStore } from "zustand";
import { createContext, useContext, ReactNode, useRef } from "react";

export interface User {
  userId: string;
  email: string;
  name: string;
}

interface UserStoreState {
  data: {
    user: User | null;
    isAuthenticated: boolean;
  };
  actions: {
    setUser: (user: User | null) => void;
    logout: () => void;
  };
}

const initialState = {
  user: null,
  isAuthenticated: false,
};

const createUserStore = () =>
  createStore<UserStoreState>()((set) => ({
    data: { ...initialState },

    actions: {
      setUser: (user) =>
        set({
          data: {
            user,
            isAuthenticated: !!user,
          },
        }),

      logout: () =>
        set({
          data: initialState,
        }),
    },
  }));

export type UserStoreApi = ReturnType<typeof createUserStore>;

export const UserContext = createContext<UserStoreApi | undefined>(undefined);

export interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const storeRef = useRef<UserStoreApi | null>(null);

  if (!storeRef.current) {
    storeRef.current = createUserStore();
  }

  return (
    <UserContext.Provider value={storeRef.current}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserStore = <T,>(
  selector: (state: UserStoreState) => T,
): T => {
  const userContext = useContext(UserContext);

  if (!userContext) {
    throw new Error("useUserStore must be used within UserProvider");
  }

  return useStore(userContext, selector);
};
