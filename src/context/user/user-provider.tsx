import React, { useMemo, useCallback, useEffect } from 'react';
// utils
import { fEncrypt } from '/src/utils/format-encrypt';
// supabase
import { supabase } from '/src/supabase';
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

const mapUser = (data: any): UserInterface => ({
  id: data.id,
  authId: data.auth_id ?? data.authId,
  name: data.name,
  nameLowercase: data.name_lowercase ?? data.nameLowercase,
  phoneNumber: data.phone_number ?? data.phoneNumber,
  role: data.role as RoleUserType,
  email: data.email,
  status: data.status,
  createdAt: data.created_at ? new Date(data.created_at) : new Date(),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
});

const ACCESS_TOKEN_KEY = 'accessToken';

// ----------------------------------------------------------------------

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { state, update, reset } = useLocalStorage(USER_KEY, initialState) as {
    state: InitialState;
    update: (name: string, updateValue: Value) => void;
    reset: () => void;
  };

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  const cleanupAuthSession = useCallback(async () => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    update('user', '');
    update('status', 'unauthenticated');
  }, [update]);

  const ensureActiveUser = useCallback(async (authId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Akun tidak ditemukan di database.');
    }

    if (data.status !== 'active') {
      throw new Error('Akun Anda nonaktif. Silakan hubungi admin.');
    }
  }, []);

  // ----------------------------------------------------------------------

  useEffect(() => {
    update('isLoading', true);

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          try {
            await ensureActiveUser(session.user.id);
            sessionStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
            const encrypted = fEncrypt({ ...session.user, uid: session.user.id }, USER_KEY);
            update('user', encrypted);
            update('status', 'authenticated');
          } catch {
            await cleanupAuthSession();
          }
        } else {
          sessionStorage.removeItem(ACCESS_TOKEN_KEY);
          update('user', '');
          update('status', 'unauthenticated');
        }
      })
      .catch(async () => {
        await cleanupAuthSession();
      })
      .finally(() => {
        update('isLoading', false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        update('user', '');
        update('status', 'unauthenticated');
        update('isLoading', false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        try {
          await ensureActiveUser(session.user.id);
          sessionStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
          const encrypted = fEncrypt({ ...session.user, uid: session.user.id }, USER_KEY);
          update('user', encrypted);
          update('status', 'authenticated');
        } catch {
          await cleanupAuthSession();
        } finally {
          update('isLoading', false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [cleanupAuthSession, ensureActiveUser, update]);

  // LOGIN EMAIL
  const onLoginEmail = useCallback(
    async ({ email, password }: PayloadLoginEmailAuthInterface) => {
      try {
        update('isLoading', true);

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        const { user } = data;
        if (user) {
          await ensureActiveUser(user.id);
          const accessToken = data.session?.access_token || '';
          const encrypted = fEncrypt({ ...user, uid: user.id }, USER_KEY);

          sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
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

  // LOGIN & REGISTER GOOGLE
  const onLoginGoogle = useCallback(async () => {
    try {
      update('isLoading', true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      await cleanupAuthSession();
      throw safeWrapError(error);
    } finally {
      update('isLoading', false);
    }
  }, [cleanupAuthSession, update]);

  // REGISTER
  const onRegister = useCallback(
    async (payload: PayloadRegisterAuthInterface) => {
      try {
        update('isLoading', true);

        const sanitizedEmail = payload.email.trim();
        const sanitizedPhoneNumber = payload.phoneNumber.trim();

        // Check duplicate email
        const { data: existingEmail, error: emailCheckError } = await supabase
          .from('users')
          .select('id')
          .eq('email', sanitizedEmail)
          .maybeSingle();

        if (emailCheckError) throw emailCheckError;
        if (existingEmail) {
          throw new Error('Email sudah terdaftar');
        }

        // Check duplicate phone
        if (sanitizedPhoneNumber) {
          const { data: existingPhone, error: phoneCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('phone_number', sanitizedPhoneNumber)
            .maybeSingle();

          if (phoneCheckError) throw phoneCheckError;
          if (existingPhone) {
            throw new Error('Nomor telepon sudah terdaftar');
          }
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (sessionError || !accessToken) {
          throw new Error('Sesi admin tidak valid.');
        }

        let response: Response;
        try {
          response = await fetch('/api/create-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              name: payload.name,
              nameLowercase: payload.nameLowercase,
              phoneNumber: sanitizedPhoneNumber,
              role: payload.role,
              email: sanitizedEmail,
              password: payload.password,
              status: payload.status,
            }),
          });
        } catch {
          throw new Error('Server API lokal tidak aktif. Jalankan ulang aplikasi dengan `npm run dev`.');
        }

        let result: { message?: string };
        try {
          result = await response.json();
        } catch {
          throw new Error(`Respons server API tidak valid (HTTP ${response.status}). Periksa log API.`);
        }
        if (!response.ok) {
          throw new Error(result.message || 'Pengguna gagal ditambahkan.');
        }
      } catch (error: any) {
        throw safeWrapError(error);
      } finally {
        update('isLoading', false);
      }
    },
    [update]
  );

  // UPDATE
  const onUpdate = useCallback(
    async (id: string, payload: Partial<Omit<UserInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<UserInterface | null> => {
      if (!id) return null;

      try {
        update('isLoading', true);

        const updateData: Record<string, any> = {};

        if (payload.name !== undefined) {
          updateData.name = payload.name;
          updateData.name_lowercase = payload.name.toLowerCase();
        }

        if (typeof payload.email === 'string') {
          const sanitizedEmail = payload.email.trim();
          const { data: existingEmail, error: checkEmailErr } = await supabase
            .from('users')
            .select('id')
            .eq('email', sanitizedEmail)
            .neq('id', id)
            .maybeSingle();

          if (checkEmailErr) throw checkEmailErr;
          if (existingEmail) {
            throw new Error('Email sudah terdaftar');
          }
          updateData.email = sanitizedEmail;
        }

        if (typeof payload.phoneNumber === 'string') {
          const sanitizedPhone = payload.phoneNumber.trim();
          if (sanitizedPhone) {
            const { data: existingPhone, error: checkPhoneErr } = await supabase
              .from('users')
              .select('id')
              .eq('phone_number', sanitizedPhone)
              .neq('id', id)
              .maybeSingle();

            if (checkPhoneErr) throw checkPhoneErr;
            if (existingPhone) {
              throw new Error('Nomor telepon sudah terdaftar');
            }
          }
          updateData.phone_number = sanitizedPhone;
        }

        if (payload.role !== undefined) updateData.role = payload.role;
        if (payload.status !== undefined) updateData.status = payload.status;

        const { data, error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
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

        const { data: currentSessionData } = await supabase.auth.getSession();
        const accessToken = currentSessionData.session?.access_token;
        if (!accessToken) {
          throw new Error('Sesi admin tidak valid.');
        }
        if (currentSessionData.session?.user?.id === authId) {
          throw new Error('Akun yang sedang digunakan tidak dapat dihapus.');
        }

        const response = await fetch('/api/delete-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ userId: id }),
        });

        const responseText = await response.text();
        let result: { message?: string } = {};
        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch {
          if (!response.ok) {
            throw new Error(`Server gagal menghapus pengguna (HTTP ${response.status}; respons bukan JSON).`);
          }
          throw new Error(`Respons server hapus tidak valid (HTTP ${response.status}).`);
        }
        if (!response.ok) {
          throw new Error(result.message || `Pengguna gagal dihapus (HTTP ${response.status}).`);
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
      await cleanupAuthSession();
    } catch (error: any) {
      throw safeWrapError(error);
    } finally {
      update('isLoading', false);
    }
  }, [cleanupAuthSession, update]);

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
