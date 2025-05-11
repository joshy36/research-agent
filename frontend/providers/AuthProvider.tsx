'use client';

import { LoginAlert } from '@/components/login-alert';
import { User } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useState } from 'react';

interface AuthContextType {
  user: User | null;
  showLoginDialog: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: User | null;
}) {
  const [showLogin, setShowLogin] = useState(false);

  const showLoginDialog = () => {
    setShowLogin(true);
  };

  return (
    <AuthContext.Provider value={{ user, showLoginDialog }}>
      {children}
      <LoginAlert open={showLogin} onOpenChange={setShowLogin} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider');
  }
  return context;
}
