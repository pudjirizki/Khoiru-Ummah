import React, { useMemo, useCallback, useEffect } from 'react';
import { createClient, User as SupabaseUser } from '@supabase/supabase-js';
// utils
import { fEncrypt } from '/src/utils/format-encrypt';
// supabase
import { supabase } from '/src/lib/supabase';
// hooks
import { useLocalStorage } from '/src/hooks/use-local-storage';
// config-global
import { USER_KEY } from '/src/config-global';
// interfaces
import { RoleUserType, UserInterface } from '/src/interfaces/user';
import { PayloadLoginEmailAuthInterface, PayloadRegisterAuthInterface } from '/src/interfaces/authentication';
//
import { UserContext } from './user-context';

// ----------------------------------------------------------------------

type Value = string | number | object | boolean | any[] | null;

interface InitialState {
  isLoading: boolean;
  user: string;
  status: 'authenticated' | 'unauthenticated';
}

interface UserProviderProps {
  children: React.ReactNode;
}

export interface UseUserContextProps {
  isLoading: boolean;
  user: string;
  status: 'authenticated' | 'unauthenticated';
  onLoginEmail: (payload: PayloadLoginEmailAuthInterface) => Promise<void>;
  onLoginGoogle: () => Promise<void>;
  onRegister: (payload: PayloadRegisterAuthInterface) => Promise<void>;
  onUpdate: (id: string, payload: Partial<Omit<UserInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<UserInterface | null>;
  onDelete: (id: string, authId: string) => Promise<void>;
  onLogout: () => void;
  onReset: () => void;
}

// ----------------------------------------------------------------------

const initialState: InitialState = {
  isLoading: true,
  user: '',
  status: 'unauthenticated',
};

// baris tabel (snake_case) -> UserInterface (camelCase)
const mapUser = (row: any): UserInterface => ({
  id: row.id,
  authId: row.auth_id,
  name: row.name,
  nameLowercase: row.name_lowercase,
  phoneNumber: row.phone_number,
  role: row.role as RoleUserType,
  email: row.email,
  status: row.status,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

// Supaya kode lain yang masih memakai user.uid tetap jalan
const toLegacyUser = (u: SupabaseUser) => ({
  ...u,
  uid: u.id,
  displayName: (u.user_metadata as any)?.name ?? null,
});

const translateError = (message: string) => {
  if (message === 'Invalid login credentials') return 'Email atau password salah.';
  if (message === 'User already registered') return 'Email sudah terdaftar';
  return message;
};

const ACCESS_TOKEN_KEY = 'accessToken';

// ----------------------------------------------------------------------

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { state, update, reset } = useLocalStorage(USER_KEY, initialState) as { state: InitialState; update: (name: string, updateValue: Value) => void; reset: () => void };

  const safeWrapError = (error: unknown) => {
    if (error instanceof Error) return new Error(translateError(error.message));
    if (error && typeof error === 'object' && 'message' in error) return new Error(translateError(String((error as any).message)));
    return new Error(String(error));
  };

  const cleanupAuthSession = useCallback(async () => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    await supabase.auth.signOut();
    update('user', '');
    update('status', 'unauthenticated');
  }, [update]);

  const ensureActiveUser = useCallback(async (authId: string) => {
    const { data, error } = await supabase.from('users').select('status').eq('auth_id', authId).limit(1).maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Akun tidak ditemukan di database.');
    if (data.status !== 'active') throw new Error('Akun Anda nonaktif. Silakan hubungi admin.');
  }, []);

  // ----------------------------------------------------------------------

  useEffect(() => {
    update('isLoading', true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // setTimeout: Supabase tidak menyarankan await query di dalam callback ini
      setTimeout(async () => {
        if (session?.user) {
          try {
            await ensureActiveUser(session.user.id);

            sessionStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);

            const encrypted = fEncrypt(toLegacyUser(session.user), USER_KEY);
            update('user', encrypted);
            update('status', 'authenticated');
          } catch (error) {
            await cleanupAuthSession();
          }
        } else {
          sessionStorage.removeItem(ACCESS_TOKEN_KEY);
          update('user', '');
          update('status', 'unauthenticated');
        }

        update('isLoading', false);
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [cleanupAuthSession, ensureActiveUser, update]);

  // LOGIN EMAIL
  const onLoginEmail = useCallback(
    async ({ email, password }: PayloadLoginEmailAuthInterface) => {
      try {
        update('isLoading', true);

        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;

        const { user, session } = data;

        if (user && session) {
          await ensureActiveUser(user.id);

          const encrypted = fEncrypt(toLegacyUser(user), USER_KEY);

          sessionStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
          update('user', encrypted);
          update('status', 'authenticated');
        }
      } catch (error: any) {
        await cleanupAuthSession();
        throw safeWrapError(error);
      } finally {
        update('isLoading', false);
      }
    },
    [cleanupAuthSession, ensureActiveUser, update]
  );

  // LOGIN GOOGLE (Supabase memakai redirect, bukan popup)
  const onLoginGoogle = useCallback(async () => {
    try {
      update('isLoading', true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error: any) {
      await cleanupAuthSession();
      update('isLoading', false);
      throw safeWrapError(error);
    }
  }, [cleanupAuthSession, update]);

  // REGISTER (dilakukan oleh admin yang sedang login)
  const onRegister = useCallback(
    async (payload: PayloadRegisterAuthInterface) => {
      try {
        update('isLoading', true);

        const email = payload.email.trim();
        const phoneNumber = payload.phoneNumber.trim();

        const { data: dupEmail, error: e1 } = await supabase.from('users').select('id').eq('email', email).limit(1);
        if (e1) throw e1;
        if (dupEmail && dupEmail.length > 0) throw new Error('Email sudah terdaftar');

        if (phoneNumber) {
          const { data: dupPhone, error: e2 } = await supabase.from('users').select('id').eq('phone_number', phoneNumber).limit(1);
          if (e2) throw e2;
          if (dupPhone && dupPhone.length > 0) throw new Error('Nomor telepon sudah terdaftar');
        }

        // Client terpisah tanpa session, supaya admin TIDAK ikut berganti akun
        const tempClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sb-temp-register' },
        });

        const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
          email,
          password: payload.password,
          options: { data: { name: payload.name } },
        });
        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error('Gagal membuat akun.');

        const { error: insertError } = await supabase.from('users').insert({
          auth_id: signUpData.user.id,
          name: payload.name,
          name_lowercase: payload.name.toLowerCase(),
          phone_number: phoneNumber,
          role: payload.role,
          email,
          status: payload.status,
        });
        if (insertError) throw insertError;
      } catch (error: any) {
        throw safeWrapError(error);
      } finally {
        update('isLoading', false);
      }
    },
    [update]
  );

  // UPDATE (hanya tabel users)
  const onUpdate = useCallback(
    async (id: string, payload: Partial<Omit<UserInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<UserInterface | null> => {
      if (!id) return null;

      try {
        update('isLoading', true);

        const row: Record<string, any> = {};
        if (payload.name !== undefined) {
          row.name = payload.name;
          row.name_lowercase = payload.nameLowercase ?? payload.name.toLowerCase();
        }
        if (payload.phoneNumber !== undefined) row.phone_number = payload.phoneNumber.trim();
        if (payload.email !== undefined) row.email = payload.email.trim();
        if (payload.role !== undefined) row.role = payload.role;
        if (payload.status !== undefined) row.status = payload.status;
        row.updated_at = new Date().toISOString();

        if (row.email) {
          const { data: dup, error } = await supabase.from('users').select('id').eq('email', row.email).neq('id', id).limit(1);
          if (error) throw error;
          if (dup && dup.length > 0) throw new Error('Email sudah terdaftar');
        }

        if (row.phone_number) {
          const { data: dup, error } = await supabase.from('users').select('id').eq('phone_number', row.phone_number).neq('id', id).limit(1);
          if (error) throw error;
          if (dup && dup.length > 0) throw new Error('Nomor telepon sudah terdaftar');
        }

        const { data, error: updateError } = await supabase.from('users').update(row).eq('id', id).select().maybeSingle();
        if (updateError) throw updateError;
        if (!data) return null;

        return mapUser(data);
      } catch (err) {
        throw safeWrapError(err);
      } finally {
        update('isLoading', false);
      }
    },
    [update]
  );

  // DELETE
  const onDelete = useCallback(
    async (id: string, authId: string) => {
      if (!id) return;

      try {
        update('isLoading', true);

        const { data: existing, error: findError } = await supabase.from('users').select('id').eq('id', id).maybeSingle();
        if (findError) throw findError;
        if (!existing) throw new Error('User tidak ditemukan di database');

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const isSelf = session?.user?.id === authId;

        if (authId) {
          // Hapus akun login; baris profil ikut terhapus (on delete cascade)
          const { error: rpcError } = await supabase.rpc('admin_delete_user', { target_auth_id: authId });
          if (rpcError) throw rpcError;
        } else {
          const { error: delError } = await supabase.from('users').delete().eq('id', id);
          if (delError) throw delError;
        }

        if (isSelf) {
          await supabase.auth.signOut();
          sessionStorage.removeItem(ACCESS_TOKEN_KEY);
          update('user', '');
          update('status', 'unauthenticated');
        }
      } catch (err) {
        throw safeWrapError(err);
      } finally {
        update('isLoading', false);
      }
    },
    [update]
  );

  // LOGOUT
  const onLogout = useCallback(async () => {
    try {
      update('isLoading', true);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      sessionStorage.removeItem(ACCESS_TOKEN_KEY);

      update('user', '');
      update('status', 'unauthenticated');
    } catch (error: any) {
      throw safeWrapError(error);
    } finally {
      update('isLoading', false);
    }
  }, [update]);

  // RESET STATE
  const onReset = useCallback(() => {
    reset();
  }, [reset]);

  const memoizedValue = useMemo(
    () => ({
      ...state,
      onLoginEmail,
      onLoginGoogle,
      onRegister,
      onUpdate,
      onDelete,
      onLogout,
      onReset,
    }),
    [onDelete, onLoginEmail, onLoginGoogle, onLogout, onRegister, onReset, onUpdate, state]
  );

  return <UserContext.Provider value={memoizedValue}>{children}</UserContext.Provider>;
};