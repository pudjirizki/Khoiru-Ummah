import React, { useMemo, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { doc, updateDoc, serverTimestamp, setDoc, getDoc, getDocs, Timestamp, deleteDoc, collection, query, where, limit as fbLimit } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, deleteUser as deleteAuthUser, onAuthStateChanged } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
// utils
import { fEncrypt } from '/src/utils/format-encrypt';
// firebase
import { fbAuth, fbFirestore } from '/src/firebase';
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
  authId: data.authId,
  name: data.name,
  nameLowercase: data.nameLowercase,
  phoneNumber: data.phoneNumber,
  role: data.role as RoleUserType,
  email: data.email,
  status: data.status,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
});

const ACCESS_TOKEN_KEY = 'accessToken';

// ----------------------------------------------------------------------

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { state, update, reset } = useLocalStorage(USER_KEY, initialState) as { state: InitialState; update: (name: string, updateValue: Value) => void; reset: () => void };

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  const cleanupAuthSession = useCallback(async () => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);

    if (fbAuth.currentUser) {
      await signOut(fbAuth);
    }

    update('user', '');
    update('status', 'unauthenticated');
  }, [update]);

  const ensureActiveUser = useCallback(async (authId: string) => {
    const usersCollectionRef = collection(fbFirestore, 'users');
    const q = query(usersCollectionRef, where('authId', '==', authId), fbLimit(1));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error('Akun tidak ditemukan di database.');
    }

    const data = snap.docs[0]?.data();
    if (data?.status !== 'active') {
      throw new Error('Akun Anda nonaktif. Silakan hubungi admin.');
    }
  }, []);

  // ----------------------------------------------------------------------

  useEffect(() => {
    update('isLoading', true);

    const unsubscribe = onAuthStateChanged(fbAuth, async (user) => {
      if (user) {
        try {
          await ensureActiveUser(user.uid);

          const token = await user.getIdToken();
          sessionStorage.setItem(ACCESS_TOKEN_KEY, token);

          const encrypted = fEncrypt(user, USER_KEY);
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
    });

    return () => unsubscribe();
  }, [cleanupAuthSession, ensureActiveUser, update]);

  // LOGIN EMAIL
  const onLoginEmail = useCallback(
    async ({ email, password }: PayloadLoginEmailAuthInterface) => {
      try {
        update('isLoading', true);

        const userCredential = await signInWithEmailAndPassword(fbAuth, email, password);

        const { user } = userCredential;

        if (user) {
          await ensureActiveUser(user.uid);

          const accessToken = await user.getIdToken();

          const encrypted = fEncrypt(user, USER_KEY);

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

      const provider = new GoogleAuthProvider();

      const userCredential = await signInWithPopup(fbAuth, provider);

      const credential = GoogleAuthProvider.credentialFromResult(userCredential);

      const { user } = userCredential;

      if (user) {
        await ensureActiveUser(user.uid);
      }

      if (credential) {
        const { accessToken } = credential;

        const encrypted = fEncrypt(user, USER_KEY);

        sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken!);
        update('user', encrypted);
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

        const data: PayloadRegisterAuthInterface = {
          name: payload.name,
          nameLowercase: payload.name,
          phoneNumber: sanitizedPhoneNumber,
          role: payload.role,
          email: sanitizedEmail,
          password: payload.password,
          status: payload.status,
        };

        // eslint-disable-next-line no-unused-vars
        const { password, ...dataFirestore } = data;

        const usersCollectionRef = collection(fbFirestore, 'users');

        const duplicateEmailQuery = query(usersCollectionRef, where('email', '==', data.email), fbLimit(1));
        const duplicatePhoneQuery = data.phoneNumber ? query(usersCollectionRef, where('phoneNumber', '==', data.phoneNumber), fbLimit(1)) : null;

        const [duplicateEmailSnapshot, duplicatePhoneSnapshot] = await Promise.all([getDocs(duplicateEmailQuery), duplicatePhoneQuery ? getDocs(duplicatePhoneQuery) : Promise.resolve(null)]);

        if (!duplicateEmailSnapshot.empty) {
          throw new Error('Email sudah terdaftar');
        }

        if (duplicatePhoneSnapshot && !duplicatePhoneSnapshot.empty) {
          throw new Error('Nomor telepon sudah terdaftar');
        }

        const adminUser = fbAuth.currentUser;

        const response = await createUserWithEmailAndPassword(fbAuth, data.email, data.password);

        // Back To Admin After Register
        if (adminUser) {
          await fbAuth.updateCurrentUser(adminUser);
        }

        const { user } = response;

        const docId = uuidv4();

        await setDoc(doc(fbFirestore, 'users', docId), {
          id: docId,
          authId: user.uid,
          ...dataFirestore,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error: any) {
        throw safeWrapError(error);
      } finally {
        update('isLoading', false);
      }
    },
    [update]
  );

  // UPDATE (Only Firestore)
  const onUpdate = useCallback(
    async (id: string, payload: Partial<Omit<UserInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<UserInterface | null> => {
      if (!id) return null;

      try {
        update('isLoading', true);

        const sanitizedPayload = { ...payload };

        if (typeof sanitizedPayload.email === 'string') {
          sanitizedPayload.email = sanitizedPayload.email.trim();
        }

        if (typeof sanitizedPayload.phoneNumber === 'string') {
          sanitizedPayload.phoneNumber = sanitizedPayload.phoneNumber.trim();
        }

        const usersCollectionRef = collection(fbFirestore, 'users');

        if (sanitizedPayload.email) {
          const duplicateEmailQuery = query(usersCollectionRef, where('email', '==', sanitizedPayload.email), fbLimit(2));
          const duplicateEmailSnapshot = await getDocs(duplicateEmailQuery);
          const duplicateEmailExists = duplicateEmailSnapshot.docs.some((snapshotDoc) => snapshotDoc.id !== id);

          if (duplicateEmailExists) {
            throw new Error('Email sudah terdaftar');
          }
        }

        if (sanitizedPayload.phoneNumber) {
          const duplicatePhoneQuery = query(usersCollectionRef, where('phoneNumber', '==', sanitizedPayload.phoneNumber), fbLimit(2));
          const duplicatePhoneSnapshot = await getDocs(duplicatePhoneQuery);
          const duplicatePhoneExists = duplicatePhoneSnapshot.docs.some((snapshotDoc) => snapshotDoc.id !== id);

          if (duplicatePhoneExists) {
            throw new Error('Nomor telepon sudah terdaftar');
          }
        }

        const docRef = doc(fbFirestore, 'users', id);
        await updateDoc(docRef, {
          ...sanitizedPayload,
          updatedAt: serverTimestamp(),
        });

        const snap = await getDoc(docRef);
        if (!snap.exists()) return null;

        const updated = mapUser(snap.data());
        return updated;
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

        const docRef = doc(fbFirestore, 'users', id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          throw new Error('User not found in Firestore');
        }

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

        const remainingUser = await getDoc(docRef);
        if (remainingUser.exists()) {
          await deleteDoc(docRef);
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

      await signOut(fbAuth);

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
