import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDD-_zQy1Tbl0V5_CJMraPiTa9z4nl15Y4",
  authDomain: "attendance-app-ed147.firebaseapp.com",
  databaseURL: "https://attendance-app-ed147-default-rtdb.firebaseio.com",
  projectId: "attendance-app-ed147",
  storageBucket: "attendance-app-ed147.firebasestorage.app",
  messagingSenderId: "744937657357",
  appId: "1:744937657357:web:636ea05ebffd0c767d7144",
  measurementId: "G-6BR86LRJBQ"
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
