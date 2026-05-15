// context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange, getUserProfile, getOrCreateUserProfile } from '../firebase/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const p = await getOrCreateUserProfile(firebaseUser);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });
    return unsub;
  }, []);

  // Refresh profile (call this after mutations like saving a session)
  async function refreshProfile() {
    if (!user) return;
    const p = await getUserProfile(user.uid);
    setProfile(p);
  }

  return (
    <AuthContext.Provider value={{ user, profile, refreshProfile, loading: user === undefined }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}