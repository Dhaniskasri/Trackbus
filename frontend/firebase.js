import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBX5ELHl7rteC314SDuuqKLdZm1dqQmr_w',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'trackbus-7bd25.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'trackbus-7bd25',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'trackbus-7bd25.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '119620850829',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:119620850829:web:663d8ec3cf0706fdd73ec4',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-9N4PZ3LQ9Z'
};

export const firebaseApp = initializeApp(firebaseConfig);

export const initFirebaseAnalytics = async () => {
  if (typeof window === 'undefined') return null;
  if (!(await analyticsSupported())) return null;
  return getAnalytics(firebaseApp);
};