import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const mapSnap = (snap) => ({ id: snap.id, ...snap.data() });

/*Хук для керування інвентарем з урахуванням ролі*/
export default function useInventory(currentUserProfile) {
  const role = currentUserProfile?.role;
  const assignedUnitId = currentUserProfile?.assignedUnitId || null;
  const assignedSectionId = currentUserProfile?.assignedSectionId || null;

  const [units, setUnits] = useState([]);
  const [sections, setSections] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /*Побудова фільтрів доступу на основі ролі*/
  const accessFilter = useMemo(() => {
    if (role === 'admin') return { scope: 'all' };
    if (role === 'unitStorekeeper' && assignedUnitId)
      return { scope: 'unit', unitId: assignedUnitId };
    if (role === 'sectionStorekeeper' && assignedSectionId)
      return { scope: 'section', sectionId: assignedSectionId };
    return { scope: 'none' };
  }, [role, assignedUnitId, assignedSectionId]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    /*Підписка на підрозділи*/
    let unsubUnits = () => {};
    if (accessFilter.scope === 'all') {
      const qUnits = query(collection(db, 'units'), orderBy('createdAt', 'asc'));
      unsubUnits = onSnapshot(qUnits, (snap) => setUnits(snap.docs.map(mapSnap)));
    } else if (accessFilter.scope === 'unit') {
      const qUnits = query(collection(db, 'units'), where('__name__', '==', accessFilter.unitId));
      unsubUnits = onSnapshot(qUnits, (snap) => setUnits(snap.docs.map(mapSnap)));
    } else if (accessFilter.scope === 'section') {
      setUnits([]);
    } else {
      setUnits([]);
    }

    /*Підписка на відділи*/
    let unsubSections = () => {};
    if (accessFilter.scope === 'all') {
      const qSections = query(collection(db, 'sections'), orderBy('createdAt', 'asc'));
      unsubSections = onSnapshot(qSections, (snap) => setSections(snap.docs.map(mapSnap)));
    } else if (accessFilter.scope === 'unit') {
      const qSections = query(collection(db, 'sections'), where('unitId', '==', accessFilter.unitId));
      unsubSections = onSnapshot(qSections, (snap) => setSections(snap.docs.map(mapSnap)));
    } else if (accessFilter.scope === 'section') {
      const qSections = query(collection(db, 'sections'), where('__name__', '==', accessFilter.sectionId));
      unsubSections = onSnapshot(qSections, (snap) => {
        const sections = snap.docs.map(mapSnap);
        setSections(sections);
      });
    } else {
      setSections([]);
    }

    /*Глобальна підписка на об'єкти*/
    let unsubItems = () => {};
    if (accessFilter.scope === 'all') {
      const qItems = query(collection(db, 'inventoryItems'), orderBy('name'));
      unsubItems = onSnapshot(qItems, (snap) => {
        const items = snap.docs.map(mapSnap);
        setItems(items);
      });
    } else if (accessFilter.scope === 'unit') {
      const qItems = query(collection(db, 'inventoryItems'), where('unitId', '==', accessFilter.unitId));
      unsubItems = onSnapshot(qItems, (snap) => {
        const items = snap.docs.map(mapSnap);
        setItems(items.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      });
    } else if (accessFilter.scope === 'section') {
      const qItems = query(collection(db, 'inventoryItems'), where('sectionId', '==', accessFilter.sectionId));
      unsubItems = onSnapshot(qItems, (snap) => {
        const items = snap.docs.map(mapSnap);
        setItems(items.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      });
    }

    setLoading(false);
    return () => {
      unsubUnits();
      unsubSections();
      unsubItems();
    };
  }, [accessFilter]);

  /*Окремий ефект для завантаження батьківського підрозділу для складовщиків відділів*/
  useEffect(() => {
    if (accessFilter.scope === 'section' && sections.length > 0) {
      const section = sections.find(s => s.id === accessFilter.sectionId);
      if (section && section.unitId) {
        const qUnit = query(collection(db, 'units'), where('__name__', '==', section.unitId));
        const unsubUnit = onSnapshot(qUnit, (snap) => {
          setUnits(snap.docs.map(mapSnap));
        });
        return unsubUnit;
      }
    }
  }, [accessFilter, sections]);

  /*Завантаження об'єктів на основі обраного підрозділу/відділу*/
  const subscribeItems = useCallback((selectedUnitId, selectedSectionId) => {
    if (accessFilter.scope === 'unit' && selectedUnitId !== accessFilter.unitId) {
      setItems([]);
      return () => {};
    }
    if (accessFilter.scope === 'section' && selectedSectionId !== accessFilter.sectionId) {
      setItems([]);
      return () => {};
    }

    const constraints = [];
    if (selectedUnitId) constraints.push(where('unitId', '==', selectedUnitId));
    if (selectedSectionId) constraints.push(where('sectionId', '==', selectedSectionId));
    
    let qItems;
    if (constraints.length > 0) {
      qItems = query(collection(db, 'inventoryItems'), ...constraints);
    } else {
      qItems = query(collection(db, 'inventoryItems'), orderBy('name'));
    }
    
    const unsub = onSnapshot(qItems, (snap) => {
      let items = snap.docs.map(mapSnap);
      /*Сортування на клієнті*/
      if (constraints.length > 0) {
        items = items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
      setItems(items);
    });
    return unsub;
  }, [accessFilter]);

  /*Підрозділи і відділи (тільки адмін)*/
  const createUnit = useCallback(async (name) => {
    if (role !== 'admin') throw new Error('Forbidden');
    const ref = await addDoc(collection(db, 'units'), { name, createdAt: serverTimestamp() });
    return ref.id;
  }, [role]);

  const updateUnit = useCallback(async (unitId, data) => {
    if (role !== 'admin') throw new Error('Forbidden');
    await updateDoc(doc(db, 'units', unitId), data);
  }, [role]);

  const deleteUnitById = useCallback(async (unitId) => {
    if (role !== 'admin') throw new Error('Forbidden');
    await deleteDoc(doc(db, 'units', unitId));
  }, [role]);

  const createSection = useCallback(async (unitId, name) => {
    if (role !== 'admin') throw new Error('Forbidden');
    const ref = await addDoc(collection(db, 'sections'), { unitId, name, createdAt: serverTimestamp() });
    return ref.id;
  }, [role]);

  const updateSection = useCallback(async (sectionId, data) => {
    if (role !== 'admin') throw new Error('Forbidden');
    await updateDoc(doc(db, 'sections', sectionId), data);
  }, [role]);

  const deleteSectionById = useCallback(async (sectionId) => {
    if (role !== 'admin') throw new Error('Forbidden');
    await deleteDoc(doc(db, 'sections', sectionId));
  }, [role]);

  const createItem = useCallback(async (item) => {
    const itemData = {
      ...item,
      currentBalance: item.currentBalance || 0,
      createdAt: serverTimestamp(),
    };

    delete itemData.attachedFiles;

    const docRef = await addDoc(collection(db, 'inventoryItems'), itemData);
    return docRef.id;
  }, []);

  const updateItem = useCallback(async (itemId, data) => {
    const updateData = { ...data };
    delete updateData.attachedFiles;

    await updateDoc(doc(db, 'inventoryItems', itemId), updateData);
  }, []);

  const deleteItem = useCallback(async (itemId) => {
    await deleteDoc(doc(db, 'inventoryItems', itemId));
  }, []);

  // Видалено підтримку транзакцій та файлів

  const value = {
    // дані
    units,
    sections,
    items,
    loading,
    error,
    accessFilter,
    
    subscribeItems,
   
    createUnit,
    updateUnit,
    deleteUnitById,
    createSection,
    updateSection,
    deleteSectionById,
   
    createItem,
    updateItem,
    deleteItem,
    // транзакції видалені
  };

  return value;
}


