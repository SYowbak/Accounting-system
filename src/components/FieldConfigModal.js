import { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Alert,
  Box,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Divider,
  Switch,
  SvgIcon,
  DialogContentText,
  Checkbox
} from '@mui/material';
import Grid from '@mui/material/Grid';
import EditIcon from '@mui/icons-material/Edit';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import WarningIcon from '@mui/icons-material/Warning';
import { useAuth } from '../context/AuthContext';
import useInventory from '../hooks/useInventory';
import useFieldConfig from '../hooks/useFieldConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const fieldTypes = [
  { value: 'text', label: 'Текст' },
  { value: 'number', label: 'Число' },
  { value: 'date', label: 'Дата' },
  { value: 'select', label: 'Вибір зі списку' },
  { value: 'textarea', label: 'Текстова область' },
  { value: 'boolean', label: 'Так/Ні' },
  { value: 'auto', label: 'Автонумерація' }
];

/*Модальне вікно налаштування полів таблиці*/
export default function FieldConfigModal({ open, onClose, fields, onSave, isAdmin, userProfile }) {
  const inv = useInventory(userProfile);
  const { saveFieldConfiguration } = useFieldConfig(isAdmin);
  
  /*Стан локальних полів*/
  const [localFields, setLocalFields] = useState(() => {
    const sortedFields = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0));
    return sortedFields.map((field, index) => ({
      ...field,
      order: field.order !== undefined ? field.order : index
    }));
  });
  /*Стан для нового поля*/
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [editingField, setEditingField] = useState(null);
  
  /*Стан для діалогу підтвердження видалення*/
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({
    open: false,
    field: null,
    itemsWithData: [],
    isDeleting: false
  });

  useEffect(() => {
    const sortedFields = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0));
    setLocalFields(sortedFields.map((field, index) => ({
      ...field,
      order: field.order !== undefined ? field.order : index
    })));
  }, [fields]);

  /*Перемикання увімкнення поля*/
  const toggleField = (fieldId) => {
    setLocalFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, enabled: !field.enabled } : field
    ));
  };

  /*Перемикання обов'язковості поля*/
  const toggleRequired = (fieldId) => {
    setLocalFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, required: !field.required } : field
    ));
  };

  /*Переміщення поля вгору*/
  const moveFieldUp = (filteredIndex) => {
    const visibleFields = localFields.filter(field => field.id !== 'autoNumber');
    const currentField = visibleFields[filteredIndex];
    
    if (currentField.id === 'name') return;
    if (filteredIndex === 1 && visibleFields[0].id === 'name') return;
    
    const targetField = visibleFields[filteredIndex - 1];
    if (targetField.id === 'name') return;
    
    const currentActualIndex = localFields.findIndex(f => f.id === currentField.id);
    const targetActualIndex = localFields.findIndex(f => f.id === targetField.id);
    
    setLocalFields(prev => {
      const newFields = [...prev];
      [newFields[currentActualIndex], newFields[targetActualIndex]] = [newFields[targetActualIndex], newFields[currentActualIndex]];
      return newFields.map((field, idx) => ({ ...field, order: idx }));
    });
  };

  /*Переміщення поля вниз*/
  const moveFieldDown = (filteredIndex) => {
    const visibleFields = localFields.filter(field => field.id !== 'autoNumber');
    const currentField = visibleFields[filteredIndex];
    
    if (currentField.id === 'name') return;
    if (filteredIndex === visibleFields.length - 1) return;
    
    const targetField = visibleFields[filteredIndex + 1];
    if (targetField.id === 'name') return;
    
    const currentActualIndex = localFields.findIndex(f => f.id === currentField.id);
    const targetActualIndex = localFields.findIndex(f => f.id === targetField.id);
    
    setLocalFields(prev => {
      const newFields = [...prev];
      [newFields[currentActualIndex], newFields[targetActualIndex]] = [newFields[targetActualIndex], newFields[currentActualIndex]];
      return newFields.map((field, idx) => ({ ...field, order: idx }));
    });
  };

  /*Додавання кастомного поля*/
  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    
    const fieldNameSlug = newFieldName.trim()
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 20);
    
    const newField = {
      id: `field_${fieldNameSlug}`,
      name: newFieldName.trim(),
      type: newFieldType,
      enabled: true,
      required: false,
      editable: true,
      custom: true,
      width: newFieldType === 'textarea' ? 200 : newFieldType === 'date' ? 130 : 150,
      order: localFields.length
    };
    
    if (newFieldType === 'select' && newFieldOptions.trim()) {
      newField.options = newFieldOptions.split(',').map(opt => opt.trim()).filter(opt => opt);
    }
    
    if (newFieldType === 'boolean') {
      newField.options = ['Так', 'Ні'];
    }
    
    setLocalFields(prev => [...prev, newField]);
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldOptions('');
  };

  /*Перевірка використання поля в записах*/
  const checkFieldUsage = async (fieldId) => {
    try {
      const itemsWithData = inv.items.filter(item => {
        const fieldValue = item[fieldId];
        return fieldValue !== null && 
               fieldValue !== undefined && 
               String(fieldValue).trim() !== '';
      });
      
      return itemsWithData;
    } catch (error) {
      console.error('Error checking field usage:', error);
      return [];
    }
  };

  /*Обробка видалення поля*/
  const handleDeleteField = async (field) => {
    const itemsWithData = await checkFieldUsage(field.id);
    
    if (itemsWithData.length > 0) {
      setDeleteConfirmDialog({
        open: true,
        field: field,
        itemsWithData: itemsWithData,
        isDeleting: false
      });
    } else {
      setLocalFields(prev => prev.filter(f => f.id !== field.id));
    }
  };

  /*Підтвердження видалення поля з даними*/
  const confirmDeleteField = async () => {
    const { field } = deleteConfirmDialog;
    if (!field) return;

    setDeleteConfirmDialog(prev => ({ ...prev, isDeleting: true }));

    try {
      const itemsToUpdate = await checkFieldUsage(field.id);
      
      for (const item of itemsToUpdate) {
        const itemRef = doc(db, 'inventoryItems', item.id);
        const { [field.id]: deletedField, ...rest } = item;
        await updateDoc(itemRef, { [field.id]: null });
      }
      
      setLocalFields(prev => prev.filter(f => f.id !== field.id));
      setDeleteConfirmDialog({ open: false, field: null, itemsWithData: [], isDeleting: false });

    } catch (error) {
      console.error('Error deleting field and data:', error);
      setDeleteConfirmDialog(prev => ({ ...prev, isDeleting: false }));
    }
  };

  /*Збереження конфігурації полів*/
  const handleSave = () => {
    onSave(localFields);
    onClose();
  };

  /*Початок редагування поля*/
  const startEditing = (field) => {
    setEditingField(field);
    setNewFieldName(field.name);
    setNewFieldType(field.type);
    setNewFieldOptions(field.options ? field.options.join(', ') : '');
  };

  /*Скасування редагування*/
  const cancelEditing = () => {
    setEditingField(null);
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldOptions('');
  };

  /*Збереження змін редагування*/
  const saveEditing = () => {
    if (!editingField) return;

    setLocalFields(prev => prev.map(f => {
      if (f.id === editingField.id) {
        const updatedField = {
          ...f,
          name: newFieldName.trim(),
          type: newFieldType,
        };
        if (newFieldType === 'select') {
          updatedField.options = newFieldOptions.split(',').map(opt => opt.trim()).filter(Boolean);
        }
        return updatedField;
      }
      return f;
    }));

    cancelEditing();
  };

  const visibleFields = localFields.filter(field => field.id !== 'autoNumber');

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        Налаштування полів
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Налаштуйте поля, які відображатимуться в таблиці. Змінюйте їх порядок.
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Поля таблиці:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
            {visibleFields.map((field, index) => (
              <Box
                key={field.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1,
                  mb: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'background.paper',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <Checkbox
                  checked={field.enabled}
                  onChange={() => toggleField(field.id)}
                  disabled={!field.editable}
                  sx={{ mr: 1 }}
                />
                
                <Box sx={{ flexGrow: 1, mr: 2 }}>
                  <Typography variant="body1">
                    {field.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Тип: {fieldTypes.find(t => t.value === field.type)?.label || field.type}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                  <Checkbox
                    size="small"
                    checked={field.required}
                    onChange={() => toggleRequired(field.id)}
                    disabled={!field.editable}
                  />
                  <Typography variant="body2" sx={{ ml: 0.5 }}>
                    Обов'язкове
                  </Typography>
                </Box>
                
                {/* Кнопки переміщення */}
                {field.editable && (
                  <Box sx={{ mr: 1 }}>
                    <IconButton 
                      size="small"
                      onClick={() => moveFieldUp(index)}
                      disabled={index === 0 || visibleFields[index - 1]?.id === 'name'}
                      sx={{ mr: 0.5 }}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small"
                      onClick={() => moveFieldDown(index)}
                      disabled={index === visibleFields.length - 1}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                
                {field.custom && (
                  <IconButton 
                    size="small"
                    onClick={() => startEditing(field)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                
                {field.custom && (
                  <IconButton 
                    size="small"
                    onClick={() => handleDeleteField(field)}
                    color="error"
                  >
                    <SvgIcon fontSize="small">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </SvgIcon>
                  </IconButton>
                )}
              </Box>
            ))}
          </Paper>
        </Box>

        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Додати нове поле
        </Typography>
        <Grid container spacing={2} alignItems="end">
          <Grid item xs={12} md={3}>
            <TextField
              label="Назва нового поля"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              label="Тип поля"
              value={newFieldType}
              onChange={(e) => {
                const newType = e.target.value;
                setNewFieldType(newType);
                if (newType === 'boolean') {
                  setNewFieldOptions('Так,Ні');
                } else if (newType !== 'select') {
                  setNewFieldOptions('');
                }
              }}
              size="small"
              fullWidth
            >
              {fieldTypes.filter(type => type.value !== 'auto').map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          {newFieldType === 'select' && (
            <Grid item xs={12} md={4}>
              <TextField
                label="Варіанти (через кому)"
                value={newFieldOptions}
                onChange={(e) => setNewFieldOptions(e.target.value)}
                size="small"
                fullWidth
                placeholder="Варіант 1, Варіант 2"
              />
            </Grid>
          )}

          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              onClick={editingField ? saveEditing : addCustomField}
              disabled={!newFieldName.trim()}
              fullWidth
            >
              {editingField ? 'Зберегти' : 'Додати'}
            </Button>
            {editingField && (
              <Button
                onClick={cancelEditing}
                size="small"
                sx={{ mt: 1 }}
                fullWidth
              >
                Скасувати
              </Button>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Скасувати</Button>
        <Button onClick={handleSave} variant="contained">Зберегти</Button>
      </DialogActions>

      <Dialog open={deleteConfirmDialog.open} onClose={() => setDeleteConfirmDialog({ ...deleteConfirmDialog, open: false })}>
        <DialogTitle>
          <WarningIcon color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
          Підтвердження видалення
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Ви впевнені, що хочете видалити поле "{deleteConfirmDialog.field?.name}"?
            <br />
            Це поле використовується в <strong>{deleteConfirmDialog.itemsWithData.length}</strong> записах. 
            Якщо ви продовжите, дані з цього поля будуть видалені з цих записів.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialog({ ...deleteConfirmDialog, open: false })} disabled={deleteConfirmDialog.isDeleting}>Скасувати</Button>
          <Button onClick={confirmDeleteField} color="error" variant="contained" disabled={deleteConfirmDialog.isDeleting}>
            {deleteConfirmDialog.isDeleting ? 'Видалення...' : 'Видалити'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}