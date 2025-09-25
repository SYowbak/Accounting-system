/*Модальне вікно адміністрування відділом*/
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import useInventory from '../hooks/useInventory';

export default function AdminSectionModal({ open, onClose, mode, section, unitId, onSave }) {
  const { profile } = useAuth();
  const inv = useInventory(profile);
  const [name, setName] = useState('');
  const [localUnitId, setLocalUnitId] = useState(unitId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(section?.name || '');
    setLocalUnitId(section?.unitId || unitId || '');
  }, [section, unitId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ name, unitId: localUnitId });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'edit' ? 'Редагувати відділ' : 'Додати відділ'}</DialogTitle>
      <DialogContent>
        <TextField label="Назва відділу" fullWidth size="small" value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 1 }} />
        <TextField select label="Підрозділ" fullWidth size="small" value={localUnitId} onChange={(e) => setLocalUnitId(e.target.value)} sx={{ mt: 2 }}>
          {inv.units.map((u) => (
            <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Скасувати</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !name.trim() || !localUnitId}>Зберегти</Button>
      </DialogActions>
    </Dialog>
  );
}


