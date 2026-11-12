import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// ----------------------------------------------------------------------

const firebaseConfig = {
  apiKey: 'AIzaSyCuWEicGdo_Ps_aOzwYCs7JQKcmO1vcKuk',
  authDomain: 'project-khoiru-ummah-v2.firebaseapp.com',
  projectId: 'project-khoiru-ummah-v2',
  storageBucket: 'project-khoiru-ummah-v2.firebasestorage.app',
  messagingSenderId: '898632411630',
  appId: '1:898632411630:web:3f49492d8a31deb4bec6ff',
};

const app = initializeApp(firebaseConfig);

export const fbAuth = getAuth(app);

export const fbFirestore = getFirestore(app);

export const functions = getFunctions(app);
