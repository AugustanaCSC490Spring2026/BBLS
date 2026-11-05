import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "./Firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const email = (currentUser.email || "").toLowerCase();
        if (!currentUser.emailVerified || !email.endsWith("@augustana.edu")) {
          throw new Error("Account is not an augustana.edu account");
        }
        const userRef = doc(db, "authorized_users", email);
        const snap = await getDoc(userRef);


        if (snap.exists()) {
          setUser(currentUser);

          const data = snap.data();
          setIsAdmin(data?.isAdmin === true);
        } else {
          setUser(null);
          setIsAdmin(false);
          await auth.signOut();
        }
      } catch (err) {
        console.error("Auth check error:", err);
        setUser(null);
        setIsAdmin(false);
        await auth.signOut();
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

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);