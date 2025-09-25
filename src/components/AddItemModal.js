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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import useFieldConfig from '../hooks/useFieldConfig';

// Головне модальне вікно додавання/редагування об'єктів
export default function AddItemModal({ 
  open, 
  onClose, 
  onSubmit, 
  unitId, 
  sectionId, 
  item = null, 
  userProfile = null 
}) {
  const isEditing = !!item;
  const isAdmin = userProfile?.role === 'admin';
  
  // Конфігурація полів з синхронізацією Firestore
  const { fields: tableFields, loading: fieldsLoading, saveFieldConfiguration } = useFieldConfig(isAdmin);
  
  const [form, setForm] = useState(() => {
    const initialForm = {};
    tableFields.forEach(field => {
      if (field.id === 'autoNumber') {
        initialForm[field.id] = item?.[field.id] || '';
      } else {
        initialForm[field.id] = item?.[field.id] || '';
      }
    });
    return initialForm;
  });
  
  // Оновлення форми при зміні об'єкта
  useEffect(() => {
    if (item && isEditing) {
      const updatedForm = {};
      tableFields.forEach(field => {
        updatedForm[field.id] = item[field.id] || '';
      });
      setForm(updatedForm);
    }
  }, [item, isEditing, tableFields]);

  // Оновлення структури форми при зміні полів
  useEffect(() => {
    setForm(prevForm => {
      const updatedForm = { ...prevForm };
      tableFields.forEach(field => {
        if (!(field.id in updatedForm)) {
          updatedForm[field.id] = '';
        }
      });
      return updatedForm;
    });
  }, [tableFields]);
  
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Отримання активних полів для відображення
  const enabledFields = tableFields.filter(field => {
    if (field.id === 'autoNumber' && !isEditing) {
      return false; // Приховати поле autoNumber при додаванні
    }
    return field.enabled;
  });

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((p) => ({ ...p, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    enabledFields.forEach(field => {
      if (field.required && field.id !== 'autoNumber') {
        if (!form[field.id] || String(form[field.id]).trim() === '') {
          newErrors[field.id] = `${field.name} є обов'язковим полем`;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!unitId) return;
    
    setSaving(true);
    try {
      const payload = {
        unitId,
        sectionId: sectionId || '',
      };

      // Додати всі активні поля до payload
      enabledFields.forEach(field => {
        if (field.id === 'autoNumber') {
          return;
        }
        
        const value = form[field.id];
        if (field.type === 'number') {
          payload[field.id] = Number(value || 0);
        } else {
          payload[field.id] = String(value || '').trim();
        }
      });
      
      await onSubmit(payload);
      handleClose();
    } finally {
      setSaving(false);
    }
  };
  
  const handleClose = () => {
    onClose?.();
    if (!isEditing) {
      const resetForm = {};
      tableFields.forEach(field => {
        resetForm[field.id] = '';
      });
      setForm(resetForm);
      setErrors({});
    }
  };

  const renderField = (field) => {
    if (field.id === 'autoNumber' && !isEditing) {
      return null;
    }
    
    if (field.id === 'autoNumber') {
      return (
        <TextField
          label={field.name}
          fullWidth
          value={form[field.id] || 'Автоматично'}
          disabled
          helperText="Номер присвоюється автоматично"
        />
      );
    }

    const commonProps = {
      label: field.name + (field.required ? ' *' : ''),
      fullWidth: true,
      value: form[field.id] || '',
      onChange: handleChange(field.id),
      error: !!errors[field.id],
      helperText: errors[field.id]
    };

    switch (field.type) {
      case 'select':
      case 'boolean':
        const selectOptions = field.options || [];
        const isUnitField = field.id === 'unitOfMeasure';
        
        return (
          <Box>
            <FormControl fullWidth error={!!errors[field.id]}>
              <InputLabel>{field.name + (field.required ? ' *' : '')}</InputLabel>
              <Select
                value={form[field.id] || ''}
                onChange={handleChange(field.id)}
                label={field.name + (field.required ? ' *' : '')}
              >
                {selectOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
                {isUnitField && (
                  <MenuItem value="__custom__">
                    <em>Додати власний...</em>
                  </MenuItem>
                )}
              </Select>
              {errors[field.id] && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                  {errors[field.id]}
                </Typography>
              )}
            </FormControl>
            {form[field.id] === '__custom__' && (
              <TextField
                label={`Власний варіант для ${field.name}`}
                fullWidth
                size="small"
                sx={{ mt: 1 }}
                value={form[`${field.id}Custom`] || ''}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, [`${field.id}Custom`]: e.target.value }));
                }}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    setForm(prev => ({ ...prev, [field.id]: e.target.value.trim() }));
                  }
                }}
              />
            )}
          </Box>
        );
        
      case 'number':
        return (
          <TextField
            {...commonProps}
            type="number"
            inputProps={{ min: 0, step: field.id === 'price' || field.id === 'wearingPrice' || field.id === 'priceByBalance' ? 0.01 : 1 }}
          />
        );
        
      case 'date':
        return (
          <TextField
            {...commonProps}
            type="date"
            InputLabelProps={{ shrink: true }}
          />
        );
        
      case 'textarea':
        return (
          <TextField
            {...commonProps}
            multiline
            rows={2}
          />
        );
        
      default:
        return <TextField {...commonProps} />;
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <DialogTitle>
          {isEditing ? 'Редагувати матеріальний засіб' : 'Додати новий матеріальний засіб'}
        </DialogTitle>
        <DialogContent>
          {fieldsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <Typography>Завантаження конфігурації полів...</Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
            {/* Динамічні поля на основі конфігурації */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Дані матеріального засобу
              </Typography>
              
              <Grid container spacing={2}>
                {enabledFields.map((field, index) => {
                  const fieldComponent = renderField(field);
                  if (!fieldComponent) return null; // Пропустити приховані поля
                  
                  const gridSize = field.type === 'textarea' ? 12 : field.id === 'name' ? 6 : 4;
                  return (
                    <Grid 
                      key={field.id}
                      size={{ xs: 12, md: gridSize }}
                    >
                      {fieldComponent}
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Обов'язкові поля позначені зірочкою (*)</strong><br />
              </Typography>
            </Alert>
          </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleClose} disabled={saving || fieldsLoading}>
            Скасувати
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={saving || fieldsLoading}
          >
            {saving ? 'Збереження...' : (isEditing ? 'Оновити' : 'Зберегти')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}