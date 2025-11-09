import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase configuration (from google-services.json)
const firebaseConfig = {
  apiKey: "AIzaSyBH_3Ef-QZDG-C4mmmCHYg67wRlE7WEB5g",
  authDomain: "attendance-app-ed147.firebaseapp.com",
  projectId: "attendance-app-ed147",
  storageBucket: "attendance-app-ed147.firebasestorage.app",
  messagingSenderId: "744937657357",
  appId: "1:744937657357:android:ba1677e6aa2080117d7144",
};

let app: FirebaseApp | null = null;
export let auth: Auth | null = null;
export let db: Firestore | null = null;
export let googleProvider: GoogleAuthProvider | null = null;

// Initialize Firebase once. This supports both web and React Native environments.
if (getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
  } catch (err) {
    // If initialization fails for any reason, log and continue. Consumers will throw if auth/db are required.
    console.warn('Firebase initialization warning:', err);
  }
} else {
  // If an app already exists, reuse it
  app = getApps()[0] as FirebaseApp;
  try {
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
  } catch (err) {
    console.warn('Firebase reuse warning:', err);
  }
}

export default app;
