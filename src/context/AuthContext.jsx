import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db } from '../firebase/firebase';
import { GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signOut as fbSignOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext(null);

/*Контекст авторизації для керування станом користувача*/
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileListener, setProfileListener] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          if (profileListener) {
            profileListener();
          }
          
          /*Налаштування слухача профілю користувача*/
          const userDocRef = doc(db, 'users', u.uid);
          const unsubscribeProfile = onSnapshot(userDocRef, 
            (snap) => {
              if (snap.exists()) {
                const profileData = { id: snap.id, ...snap.data() };
                setProfile(profileData);
                setLoading(false);
              } else {
                fbSignOut(auth);
                setProfile(null);
                setLoading(false);
              }
            },
            (error) => {
              if (error.code === 'permission-denied') {
                /*Створення профілю при помилці доступу*/
                const newProfile = {
                  email: u.email,
                  displayName: u.displayName || u.email,
                  role: '',
                  assignedUnitId: '',
                  assignedSectionId: '',
                  authProvider: u.providerData[0]?.providerId || 'password',
                  createdAt: serverTimestamp(),
                };
                setDoc(userDocRef, newProfile).then(() => {
                  setProfile({ id: u.uid, ...newProfile });
                  setLoading(false);
                }).catch(() => {
                  setProfile(null);
                  setLoading(false);
                });
              } else {
                setProfile(null);
                setLoading(false);
              }
            }
          );
          
          setProfileListener(() => unsubscribeProfile);
          
        } catch (error) {
          setProfile(null);
          setLoading(false);
        }
      } else {
        if (profileListener) {
          profileListener();
          setProfileListener(null);
        }
        setProfile(null);
      }
      setLoading(false);
    });

    /*Перевірка результату redirect при завантаженні*/
    getRedirectResult(auth).then(async (result) => {
      if (result) {
        window.location.href = '/';
      }
    }).catch(() => {
      setLoading(false);
    });

    return () => {
      unsub();
      if (profileListener) {
        profileListener();
      }
    };
  }, []);

  /*Функція входу через email і пароль*/
  const signIn = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };
  
  /*Функція реєстрації нового користувача*/
  const signUp = async (email, password, displayName = '') => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    /*Створення профілю в Firestore*/
    const newProfile = {
      email: user.email,
      displayName: displayName || user.email,
      role: '',
      assignedUnitId: '',
      assignedSectionId: '',
      authProvider: 'password',
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', user.uid), newProfile);
    return userCredential;
  };
  
  /*Функція входу через Google*/
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    // Use redirect method to avoid COOP issues
    return signInWithRedirect(auth, provider);
  };
  
  /*Функція виходу з системи*/
  const signOut = () => fbSignOut(auth);

  /*Функція скидання пароля*/
  const resetPassword = async (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const value = useMemo(() => ({ user, profile, loading, signIn, signUp, signInWithGoogle, signOut, resetPassword }), [user, profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


