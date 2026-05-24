import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getLocalUserId, migrateLocalUserId } from '../db/database';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userId: string;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to Supabase Auth Changes (fires immediately on subscribe with initial session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        const newUser = newSession?.user ?? null;
        setUser(newUser);

        try {
          if (newUser) {
            const authId = newUser.id;
            // Get current local user ID from SQLite
            const currentLocalId = await getLocalUserId(db);
            if (currentLocalId && currentLocalId !== authId) {
              await migrateLocalUserId(db, currentLocalId, authId);
            }
            setUserId(authId);
          } else {
            // If signed out, fall back to the local offline user
            const localId = await getLocalUserId(db);
            setUserId(localId);
          }
        } catch (e) {
          console.error('Failed to resolve database user in AuthContext:', e);
        } finally {
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [db]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error during sign out:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, userId, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
