// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: "rec-center-swipe-ins",
  storageBucket: "rec-center-swipe-ins.firebasestorage.app",
  messagingSenderId: "169837336350",
  appId: "1:169837336350:web:09f7f7dd0f7d6c020a5b0f",
  measurementId: "G-6RHJCWEFY6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ hd: "augustana.edu", prompt: "select_account" });
const db = getFirestore(app);


export { auth, provider, db, app };