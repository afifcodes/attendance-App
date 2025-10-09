import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration (from google-services.json)
const firebaseConfig = {
  apiKey: "AIzaSyBH_3Ef-QZDG-C4mmmCHYg67wRlE7WEB5g",
  authDomain: "attendance-app-ed147.firebaseapp.com",
  projectId: "attendance-app-ed147",
  storageBucket: "attendance-app-ed147.firebasestorage.app",
  messagingSenderId: "744937657357",
  appId: "1:744937657357:android:ba1677e6aa2080117d7144",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export default app;
