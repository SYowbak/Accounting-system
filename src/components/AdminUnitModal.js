/*Модальне вікно адміністрування підрозділом*/
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';

export default function AdminUnitModal({ open, onClose, mode, unit, onSave }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(unit?.name || '');
  }, [unit]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ name });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'edit' ? 'Редагувати підрозділ' : 'Додати підрозділ'}</DialogTitle>
      <DialogContent>
        <TextField label="Назва підрозділу" fullWidth size="small" value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 1 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Скасувати</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !name.trim()}>Зберегти</Button>
      </DialogActions>
    </Dialog>
  );
}


