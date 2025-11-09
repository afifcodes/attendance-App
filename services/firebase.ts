import { initializeApp, FirebaseApp } from 'firebase/app';
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

// Initialize Firebase only in a browser environment (or non-SSR environment)
if (typeof window !== 'undefined') {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('email');
  googleProvider.addScope('profile');
}

export default app;
