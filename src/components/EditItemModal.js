import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import Grid from '@mui/material/Grid';

/*Модальне вікно редагування об'єкту обліку*/
export default function EditItemModal({ open, onClose, item, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  /*Завантаження даних об'єкту для редагування*/
  useEffect(() => {
    if (item) {
      const unitOfMeasure = item.unitOfMeasure || '';
      const isCustomUnit = unitOfMeasure && !['шт', 'кг', 'л', 'упак', 'компл'].includes(unitOfMeasure);
      
      setForm({
        name: item.name || '',
        nomenclatureNumber: item.nomenclatureNumber || '',
        unitOfMeasure: isCustomUnit ? '__custom__' : unitOfMeasure,
        customUnit: isCustomUnit ? unitOfMeasure : '',
        price: item.price || '',
        brand: item.brand || '',
        grade: item.grade || '',
        profile: item.profile || '',
        size: item.size || '',
        stockNorm: item.stockNorm || '',
      });
    }
  }, [item]);

  /*Обробка змін полів*/
  const handleChange = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
  };

  /*Збереження змін об'єкту*/
  const handleSave = async () => {
    setSaving(true);
    try {
      const unitOfMeasure = form.unitOfMeasure === '__custom__' ? form.customUnit : form.unitOfMeasure;
      
      await onSave({
        ...form,
        unitOfMeasure: unitOfMeasure || '',
        price: Number(form.price || 0),
        stockNorm: Number(form.stockNorm || 0),
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Редагувати об'єкт</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} mt={0}>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="Найменування" fullWidth size="small" margin="dense" value={form.name || ''} onChange={handleChange('name')} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="Номенклатурний №" fullWidth size="small" margin="dense" value={form.nomenclatureNumber || ''} onChange={handleChange('nomenclatureNumber')} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small" margin="dense">
              <InputLabel>Од. виміру *</InputLabel>
              <Select
                value={form.unitOfMeasure || ''}
                onChange={handleChange('unitOfMeasure')}
                label="Од. виміру *"
              >
                <MenuItem value="шт">шт</MenuItem>
                <MenuItem value="кг">кг</MenuItem>
                <MenuItem value="л">л</MenuItem>
                <MenuItem value="упак">упак</MenuItem>
                <MenuItem value="компл">компл</MenuItem>
                <MenuItem value="__custom__">
                  <em>Додати власний...</em>
                </MenuItem>
              </Select>
            </FormControl>
            {form.unitOfMeasure === '__custom__' && (
              <TextField
                label="Власна одиниця виміру"
                fullWidth
                size="small"
                margin="dense"
                sx={{ mt: 1 }}
                value={form.customUnit || ''}
                onChange={handleChange('customUnit')}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField label="Ціна" type="number" fullWidth size="small" margin="dense" value={form.price || ''} onChange={handleChange('price')} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField label="Норма запасу" type="number" fullWidth size="small" margin="dense" value={form.stockNorm || ''} onChange={handleChange('stockNorm')} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField label="Марка" fullWidth size="small" margin="dense" value={form.brand || ''} onChange={handleChange('brand')} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField label="Ґатунок" fullWidth size="small" margin="dense" value={form.grade || ''} onChange={handleChange('grade')} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField label="Профіль" fullWidth size="small" margin="dense" value={form.profile || ''} onChange={handleChange('profile')} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField label="Розмір" fullWidth size="small" margin="dense" value={form.size || ''} onChange={handleChange('size')} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Скасувати</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>Зберегти</Button>
      </DialogActions>
    </Dialog>
  );
}