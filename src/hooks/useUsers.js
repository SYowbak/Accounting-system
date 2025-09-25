import { useCallback, useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebase/firebase';

/*Хук для керування користувачами*/
export default function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, {
      next: (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      error: (e) => {
        setError(e);
        setLoading(false);
      },
    });
    return () => unsub();
  }, []);

  /*Створення профілю користувача*/
  const createUserProfile = useCallback(async ({ uid, email, displayName = '', role = 'sectionStorekeeper', assignedUnitId = '', assignedSectionId = '' }) => {
    await setDoc(doc(db, 'users', uid), {
      email,
      displayName,
      role,
      assignedUnitId,
      assignedSectionId,
      createdAt: serverTimestamp(),
    });
  }, []);

  /*Оновлення профілю користувача*/
  const updateUserProfile = useCallback(async (uid, data) => {
    await updateDoc(doc(db, 'users', uid), data);
  }, []);

  /*Видалення профілю користувача*/
  const deleteUserProfile = useCallback(async (uid) => {
    await deleteDoc(doc(db, 'users', uid));
  }, []);

  /*Скидання пароля користувача*/
  const resetUserPassword = useCallback(async (email, newPassword) => {
    const userDoc = users.find(u => u.email === email);
    if (userDoc) {
      await updateDoc(doc(db, 'users', userDoc.id), {
        tempPassword: newPassword,
        mustChangePassword: true,
        passwordSetAt: serverTimestamp()
      });
    }
    return Promise.resolve();
  }, [users]);

  return { users, loading, error, createUserProfile, updateUserProfile, deleteUserProfile, resetUserPassword };
}


