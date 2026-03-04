// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { GithubAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB4sXzsI7557-6gX5lH_mrCIdr50Mbl2U4",
  authDomain: "rec-center-swipe-ins.firebaseapp.com",
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
const analytics = getAnalytics(app);
const githubProvider = new GithubAuthProvider();

export { auth, provider, githubProvider }