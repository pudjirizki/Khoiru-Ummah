import React, { useMemo, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
// supabase
import { supabase } from '/src/lib/supabase';
// firebase (fallback)
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, deleteUser as deleteAuthUser, onAuthStateChanged } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { fbAuth, fbFirestore } from '/src/firebase';
import { collection, query, where, limit as fbLimit, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
// utils
import { fEncrypt } from '/src/utils/format-encrypt';
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
  createdAt: new Date(data.created_at ?? data.createdAt),
  updatedAt: new Date(data.updated_at ?? data.updatedAt),
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
    } catch {}

    try {
      if (fbAuth.currentUser) {
        await signOut(fbAuth);
      }
    } catch {}

    update('user', '');
    update('status', 'unauthenticated');
  }, [update]);

  // Ensure active user from Supabase with Firestore fallback
  const ensureActiveUser = useCallback(async (authId: string, email?: string) => {
    try {
      let q = supabase.from('users').select('*');
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authId);
      if (isUuid) {
        q = q.or(`auth_id.eq.${authId},id.eq.${authId}${email ? `,email.eq.${email}` : ''}`);
      } else if (email) {
        q = q.eq('email', email);
      } else {
        q = q.eq('auth_id', authId);
      }

      const { data, error } = await q.limit(1);

      if (!error && data && data.length > 0) {
        const row = data[0];
        if (row.status !== 'active') {
          throw new Error('Akun Anda nonaktif. Silakan hubungi admin.');
        }
        return row;
      }
    } catch (supaErr: any) {
      if (supaErr.message?.includes('nonaktif')) throw supaErr;
    }

    // Fallback: check Firestore if Supabase didn't find the user
    try {
      const usersCollectionRef = collection(fbFirestore, 'users');
      const q = query(usersCollectionRef, where('authId', '==', authId), fbLimit(1));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const data = snap.docs[0]?.data();
        if (data?.status !== 'active') {
          throw new Error('Akun Anda nonaktif. Silakan hubungi admin.');
        }
        return data;
      }
    } catch (fsErr: any) {
      if (fsErr.message?.includes('nonaktif')) throw fsErr;
    }

    throw new Error('Akun tidak ditemukan di database.');
  }, []);

  // ----------------------------------------------------------------------
  // Auth state listener
  useEffect(() => {
    update('isLoading', true);

    let isSubscribed = true;

    // 1. Check Supabase session first
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isSubscribed) return;

      if (session?.user) {
        try {
          await ensureActiveUser(session.user.id, session.user.email);
          sessionStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
          const minimalUser = {
            uid: session.user.id,
            id: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.name ?? '',
          };
          const encrypted = fEncrypt(minimalUser, USER_KEY);
          update('user', encrypted);
          update('status', 'authenticated');
          update('isLoading', false);
          return;
        } catch {
          await cleanupAuthSession();
        }
      }

      // 2. Fallback to Firebase auth listener
      const unsubscribeFb = onAuthStateChanged(fbAuth, async (user) => {
        if (!isSubscribed) return;

        if (user) {
          try {
            await ensureActiveUser(user.uid, user.email ?? undefined);
            const token = await user.getIdToken();
            sessionStorage.setItem(ACCESS_TOKEN_KEY, token);

            const minimalUser = {
              uid: user.uid,
              id: user.uid,
              email: user.email,
              displayName: user.displayName ?? '',
              photoURL: user.photoURL ?? null,
            };
            const encrypted = fEncrypt(minimalUser, USER_KEY);
            update('user', encrypted);
            update('status', 'authenticated');
          } catch {
            await cleanupAuthSession();
          }
        } else if (!session?.user) {
          sessionStorage.removeItem(ACCESS_TOKEN_KEY);
          update('user', '');
          update('status', 'unauthenticated');
        }

        update('isLoading', false);
      });

      return () => {
        unsubscribeFb();
      };
    });

    return () => {
      isSubscribed = false;
    };
  }, [cleanupAuthSession, ensureActiveUser, update]);

  // LOGIN EMAIL (Supabase first, then Firebase)
  const onLoginEmail = useCallback(
    async ({ email, password }: PayloadLoginEmailAuthInterface) => {
      try {
        update('isLoading', true);

        const cleanEmail = email.trim();
        const cleanPassword = password.trim();

        let loggedInUser: any = null;
        let token: string | null = null;

        // Try Supabase Auth first
        try {
          const { data: supaData, error: supaErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
          });

          if (!supaErr && supaData?.user && supaData.session) {
            loggedInUser = {
              uid: supaData.user.id,
              id: supaData.user.id,
              email: supaData.user.email,
              displayName: supaData.user.user_metadata?.name ?? '',
            };
            token = supaData.session.access_token;
          }
        } catch {}

        // Fallback: Try Firebase Auth
        if (!loggedInUser) {
          const userCredential = await signInWithEmailAndPassword(fbAuth, cleanEmail, cleanPassword);
          const u = userCredential.user;
          if (u) {
            loggedInUser = {
              uid: u.uid,
              id: u.uid,
              email: u.email,
              displayName: u.displayName ?? '',
              photoURL: u.photoURL ?? null,
            };
            token = await u.getIdToken();
          }
        }

        if (loggedInUser) {
          await ensureActiveUser(loggedInUser.uid, loggedInUser.email);
          if (token) {
            sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
          }
          const encrypted = fEncrypt(loggedInUser, USER_KEY);
          update('user', encrypted);
          update('status', 'authenticated');
        } else {
          throw new Error('Email atau password salah');
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

      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(fbAuth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(userCredential);
      const { user } = userCredential;

      if (user) {
        await ensureActiveUser(user.uid, user.email ?? undefined);
      }

      if (credential) {
        const { accessToken } = credential;
        const minimalUser = {
          uid: user.uid,
          id: user.uid,
          email: user.email,
          displayName: user.displayName ?? '',
          photoURL: user.photoURL ?? null,
        };
        const encrypted = fEncrypt(minimalUser, USER_KEY);
        sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken!);
        update('user', encrypted);
        update('status', 'authenticated');
      }
    } catch (error: any) {
      await cleanupAuthSession();
      throw safeWrapError(error);
    } finally {
      update('isLoading', false);
    }
  }, [cleanupAuthSession, ensureActiveUser, update]);

  // REGISTER
  const onRegister = useCallback(
    async (payload: PayloadRegisterAuthInterface) => {
      try {
        update('isLoading', true);

        const sanitizedEmail = payload.email.trim();
        const sanitizedPhoneNumber = payload.phoneNumber.trim();

        // 1. Check duplicate in Supabase
        const { data: existingUsers } = await supabase
          .from('users')
          .select('id, email, phone_number')
          .or(`email.eq.${sanitizedEmail}${sanitizedPhoneNumber ? `,phone_number.eq.${sanitizedPhoneNumber}` : ''}`)
          .limit(1);

        if (existingUsers && existingUsers.length > 0) {
          if (existingUsers[0].email === sanitizedEmail) throw new Error('Email sudah terdaftar');
          if (existingUsers[0].phone_number === sanitizedPhoneNumber) throw new Error('Nomor telepon sudah terdaftar');
        }

        // 2. Create in Firebase Auth (for credentials)
        let authId = uuidv4();
        try {
          const adminUser = fbAuth.currentUser;
          const response = await createUserWithEmailAndPassword(fbAuth, sanitizedEmail, payload.password);
          if (adminUser) {
            await fbAuth.updateCurrentUser(adminUser);
          }
          if (response.user) {
            authId = response.user.uid;
          }
        } catch {}

        // 3. Also try Supabase SignUp if possible
        try {
          const { data: supaSignUp } = await supabase.auth.signUp({
            email: sanitizedEmail,
            password: payload.password,
            options: { data: { name: payload.name, role: payload.role } },
          });
          if (supaSignUp?.user) {
            authId = supaSignUp.user.id;
          }
        } catch {}

        // 4. Insert into Supabase users table
        const docId = uuidv4();
        const now = new Date().toISOString();

        const { error: insertError } = await supabase.from('users').insert({
          id: docId,
          auth_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authId) ? authId : null,
          name: payload.name,
          name_lowercase: payload.name.toLowerCase(),
          phone_number: sanitizedPhoneNumber,
          role: payload.role,
          email: sanitizedEmail,
          status: payload.status,
          created_at: now,
          updated_at: now,
        });

        if (insertError) {
          console.error('Failed to insert user into Supabase:', insertError);
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

        const sanitizedPayload: Record<string, any> = { ...payload };

        if (typeof sanitizedPayload.email === 'string') {
          sanitizedPayload.email = sanitizedPayload.email.trim();
        }

        if (typeof sanitizedPayload.phoneNumber === 'string') {
          sanitizedPayload.phone_number = sanitizedPayload.phoneNumber.trim();
          delete sanitizedPayload.phoneNumber;
        }

        if (typeof sanitizedPayload.nameLowercase === 'string') {
          sanitizedPayload.name_lowercase = sanitizedPayload.nameLowercase;
          delete sanitizedPayload.nameLowercase;
        }

        sanitizedPayload.updated_at = new Date().toISOString();

        // Update in Supabase
        const { data, error } = await supabase
          .from('users')
          .update(sanitizedPayload)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          // Fallback to Firestore update
          const docRef = doc(fbFirestore, 'users', id);
          await updateDoc(docRef, { ...payload, updatedAt: new Date() });
          const snap = await getDoc(docRef);
          return snap.exists() ? mapUser(snap.data()) : null;
        }

        return data ? mapUser(data) : null;
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

        // Delete from Supabase
        await supabase.from('users').delete().eq('id', id);

        // Delete from Firebase
        try {
          const current = fbAuth.currentUser;
          if (current && current.uid === authId) {
            await deleteAuthUser(current);
            sessionStorage.removeItem(ACCESS_TOKEN_KEY);
            update('user', '');
          } else {
            const functions = getFunctions(undefined, 'asia-southeast1');
            const adminDelete = httpsCallable(functions, 'adminDeleteUser');
            await adminDelete({ uid: authId, docId: id });
          }
          await deleteDoc(doc(fbFirestore, 'users', id));
        } catch {}
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
