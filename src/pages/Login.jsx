import { useState } from 'react'
import '../components/Login.css'
import logo from '../assets/logo.png';
import { auth, provider } from '../Firebase.js'
import { signInWithPopup, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navigation.jsx';
import { db } from "../Firebase.js";
import { doc, getDoc } from "firebase/firestore";
import ToastContainer from "../components/ToastContainer.jsx";


function Login() {
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = Date.now(); // Unique ID for filtering
    const newToast = { id, type, title, message };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  const navigate = useNavigate();
  const [error, setError] = useState("")
  // handleGoogleLogin will sign the user in with Google and check if their email is authorized
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email.toLowerCase();
      const userRef = doc(db, "authorized_users", email);
      const userSnap = await getDoc(userRef);

      console.log("Checking email:", email);
      if (userSnap.exists()) {
        navigate("/Location");
      } else {
        addToast("error", "Unauthorized", "Please use an allowed email address.");
        // alert("Unauthorized user. Please use an allowed email address.");
        await signOut(auth);
        window.location.reload();
      }
    } catch (error) {
      addToast("error", "Login Failed", "Please use an authorized email address to sign in.");
      // setError("Login failed. Please try again.");
      console.error("Error during login:", error);
    }
  };


  return (
    <>
      <main className="main">
        <div className='login-page'>
          <div className="login-card">
            <div className="login-card-header">
              <img src={logo} alt="Logo" className="logo-image" width={200} height={200} />
              <h1>Augustana College </h1>
              <h2> Recreation Center </h2>
              <button className="gsi-material-button"
                onClick={handleGoogleLogin}>
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{ display: "block" }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">Sign in with Google</span>
                  <span style={{ display: "none" }}>Sign in with Google</span>
                </div>
              </button>
              <h3>Use your Augustana College Google account to sign in</h3>
            </div>
          </div>
        </div>
      </main>
      <ToastContainer 
        toasts={toasts} 
        removeToast={removeToast} 
      />

    </>
  )
}

export default Login;