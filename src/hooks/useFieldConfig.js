import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const commonUnits = ['шт', 'кг', 'л', 'упак', 'компл'];

// Базові поля за замовчуванням
const DEFAULT_FIELDS = [
  { id: 'autoNumber', name: 'Порядковий №', type: 'auto', enabled: true, required: true, editable: false, width: 120, order: 0 },
  { id: 'name', name: 'Найменування', type: 'text', enabled: true, required: true, editable: true, width: 200, order: 1 },
  { id: 'currentBalance', name: 'Кількість', type: 'number', enabled: true, required: false, editable: true, width: 120, order: 2 },
  { id: 'unitOfMeasure', name: 'Од. виміру', type: 'select', enabled: true, required: true, editable: true, options: [...commonUnits], width: 100, order: 3 },
  
  // Додаткові поля, які можна увімкнути
  { id: 'factoryNumber', name: 'Заводський номер', type: 'text', enabled: false, required: false, editable: true, width: 150, order: 4 },
  { id: 'invNumber', name: 'Інвентарний номер', type: 'text', enabled: false, required: false, editable: true, width: 150, order: 5 },
  { id: 'description', name: 'Додаткова інформація', type: 'textarea', enabled: false, required: false, editable: true, width: 200, order: 6 },
];

/*Хук для керування конфігурацією полів через Firestore*/
export default function useFieldConfig(isAdmin = false) {
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /*Функція для забезпечення відображення обов'язкових полів*/
  const ensureEssentialFieldsEnabled = useCallback((fieldsArray) => {
    if (isAdmin) {
      return fieldsArray;
    }
    
    return fieldsArray.map(field => {
      /*Примусово увімкнути обов'язкові поля*/
      if (field.id === 'unitOfMeasure' || field.id === 'name' || field.id === 'currentBalance') {
        return { ...field, enabled: true };
      }
      return field;
    });
  }, [isAdmin]);

  /*Завантаження конфігурації з Firestore*/
  useEffect(() => {
    let unsubscribe = null;
    
    const setupFieldConfigListener = async () => {
      try {
        const configDocRef = doc(db, 'config', 'fieldConfiguration');
        
        /*Налаштування слухача для реального часу*/
        unsubscribe = onSnapshot(configDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const configData = docSnapshot.data();
            const savedFields = configData.fields || DEFAULT_FIELDS;
            setFields(ensureEssentialFieldsEnabled(savedFields));
          } else {
            // Якщо документ не існує, створюємо його з базовими налаштуваннями
            const initialConfig = {
              fields: DEFAULT_FIELDS,
              lastUpdated: serverTimestamp(),
              updatedBy: 'system'
            };
            setDoc(configDocRef, initialConfig)
              .then(() => {
                setFields(ensureEssentialFieldsEnabled(DEFAULT_FIELDS));
              })
              .catch((error) => {
                setError(error);
                setFields(ensureEssentialFieldsEnabled(DEFAULT_FIELDS));
              });
          }
          setLoading(false);
        }, (error) => {
          setError(error);
          setFields(ensureEssentialFieldsEnabled(DEFAULT_FIELDS));
          setLoading(false);
        });
        
      } catch (error) {
        setError(error);
        setFields(ensureEssentialFieldsEnabled(DEFAULT_FIELDS));
        setLoading(false);
      }
    };

    setupFieldConfigListener();

    /*Очищення слухача при демонтажі*/
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [ensureEssentialFieldsEnabled]);

  /*Функція збереження конфігурації (тільки для адмінів)*/
  const saveFieldConfiguration = useCallback(async (newFields, updatedBy = 'admin') => {
    if (!isAdmin) {
      return false;
    }

    try {
      const configDocRef = doc(db, 'config', 'fieldConfiguration');
      const configData = {
        fields: newFields,
        lastUpdated: serverTimestamp(),
        updatedBy: updatedBy
      };

      await setDoc(configDocRef, configData);
      return true;
    } catch (error) {
      setError(error);
      return false;
    }
  }, [isAdmin]);

  /*Функція скидання до базових налаштувань*/
  const resetFieldConfiguration = useCallback(async () => {
    if (!isAdmin) {
      return false;
    }

    return await saveFieldConfiguration(DEFAULT_FIELDS, 'admin_reset');
  }, [isAdmin, saveFieldConfiguration]);

  return {
    fields,
    loading,
    error,
    saveFieldConfiguration,
    resetFieldConfiguration,
    DEFAULT_FIELDS
  };
}

export { DEFAULT_FIELDS };