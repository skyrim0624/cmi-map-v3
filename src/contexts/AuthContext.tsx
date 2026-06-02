import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import { ensureProfile } from '@/db/api';
import { checkUserNameAvailability, normalizeProfileUserName } from '@/features/auth/user-name-availability';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/types';
import { toast } from 'sonner';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
  return data;
}
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  sendEmailCode: (input: {
    email: string;
    userName?: string;
    shouldCreateUser?: boolean;
    redirectTo?: string;
  }) => Promise<{ error: Error | null }>;
  verifyEmailCode: (input: {
    email: string;
    code: string;
    redirectTo?: string;
  }) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (input: {
    email: string;
    redirectTo: string;
    userName?: string;
    shouldCreateUser?: boolean;
  }) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    userName?: string,
    redirectTo?: string
  ) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  sendPasswordResetEmail: (input: {
    email: string;
    redirectTo: string;
  }) => Promise<{ error: Error | null }>;
  verifyPasswordResetCode: (input: {
    email: string;
    code: string;
  }) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_NAME_TAKEN_ERROR_MESSAGE = '这个昵称已经被用过了，请换一个';

const getFallbackName = (user: User) => {
  const metadataName = [
    user.user_metadata?.user_name,
    user.user_metadata?.full_name,
    user.user_metadata?.name,
  ].find((name) => typeof name === 'string' && name.trim());

  return typeof metadataName === 'string' ? metadataName.trim() : user.email?.split('@')[0];
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    supabase
      .auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          // 登录时确保 profile 行存在，再拉取
          const fallbackName = getFallbackName(session.user);
          ensureProfile(session.user.id, fallbackName, session.user.email)
            .then(() => getProfile(session.user.id))
            .then(setProfile);
        }
      })
      .catch((error: Error) => {
        toast.error(`获取用户信息失败: ${error.message}`);
      })
      .finally(() => {
        setLoading(false);
      });

    // In this function, do NOT use any await calls. Use `.then()` instead to avoid deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const fallbackName = getFallbackName(session.user);
        ensureProfile(session.user.id, fallbackName, session.user.email)
          .then(() => getProfile(session.user.id))
          .then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle: AuthContextType['signInWithGoogle'] = async (redirectTo) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: redirectTo ? { redirectTo } : undefined,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const sendEmailCode: AuthContextType['sendEmailCode'] = async ({
    email,
    redirectTo,
    userName,
    shouldCreateUser = false,
  }) => {
    try {
      const normalizedUserName = normalizeProfileUserName(userName ?? '');

      if (shouldCreateUser) {
        if (!normalizedUserName) throw new Error('请输入昵称');

        const availability = await checkUserNameAvailability(supabase, normalizedUserName);
        if (availability.error) throw new Error('暂时无法确认昵称是否可用，请稍后再试');
        if (!availability.available) throw new Error(USER_NAME_TAKEN_ERROR_MESSAGE);
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser,
          emailRedirectTo: redirectTo,
          data: normalizedUserName ? { user_name: normalizedUserName } : undefined,
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const verifyEmailCode: AuthContextType['verifyEmailCode'] = async ({
    email,
    code,
    redirectTo,
  }) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
        options: redirectTo ? { redirectTo } : undefined,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithMagicLink: AuthContextType['signInWithMagicLink'] = async (input) =>
    sendEmailCode(input);

  const signUpWithEmail: AuthContextType['signUpWithEmail'] = async (
    email,
    password,
    userName,
    redirectTo
  ) => {
    try {
      const normalizedUserName = normalizeProfileUserName(userName ?? '');
      if (!normalizedUserName) throw new Error('请输入昵称');

      const availability = await checkUserNameAvailability(supabase, normalizedUserName);
      if (availability.error) throw new Error('暂时无法确认昵称是否可用，请稍后再试');
      if (!availability.available) throw new Error(USER_NAME_TAKEN_ERROR_MESSAGE);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            user_name: normalizedUserName,
          },
        },
      });

      if (error) throw error;
      return { error: null, needsEmailConfirmation: Boolean(data.user && !data.session) };
    } catch (error) {
      return { error: error as Error, needsEmailConfirmation: false };
    }
  };

  const sendPasswordResetEmail: AuthContextType['sendPasswordResetEmail'] = async ({
    email,
    redirectTo,
  }) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const verifyPasswordResetCode: AuthContextType['verifyPasswordResetCode'] = async ({
    email,
    code,
  }) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'recovery',
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updatePassword: AuthContextType['updatePassword'] = async (password) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithEmail,
        signInWithGoogle,
        sendEmailCode,
        verifyEmailCode,
        signInWithMagicLink,
        signUpWithEmail,
        sendPasswordResetEmail,
        verifyPasswordResetCode,
        updatePassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
