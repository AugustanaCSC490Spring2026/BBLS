import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./Firebase";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "./Firebase";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const email = currentUser.email.toLowerCase();
        const snap = await getDoc(doc(db, "authorized_users", email));

        if (snap.exists()) {
          setUser(currentUser);
          setIsAdmin(snap.data().isAdmin);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 