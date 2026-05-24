import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getLocalUserId, migrateLocalUserId } from '../db/database';
import { DEV_USER_ID } from '../types';

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
  const [userId, setUserId] = useState<string>(DEV_USER_ID);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Initialise the local userId state by querying the local database
    async function initLocalUser() {
      try {
        const id = await getLocalUserId(db);
        setUserId(id);
      } catch (e) {
        console.error('Failed to init local user ID in AuthContext:', e);
      } finally {
        setIsLoading(false);
      }
    }
    initLocalUser();

    // 2. Listen to Supabase Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        const newUser = newSession?.user ?? null;
        setUser(newUser);

        if (newUser) {
          const authId = newUser.id;
          try {
            // Get current local user ID from SQLite
            const currentLocalId = await getLocalUserId(db);
            if (currentLocalId && currentLocalId !== authId) {
              console.log(`Migrating local user ${currentLocalId} -> authenticated UUID ${authId}`);
              await migrateLocalUserId(db, currentLocalId, authId);
            }
            setUserId(authId);
          } catch (e) {
            console.error('Failed to run SQLite auth bridge migration:', e);
            setUserId(authId);
          }
        } else {
          // If signed out, default back to DEV_USER_ID
          setUserId(DEV_USER_ID);
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
