import { useMemo, useState } from 'react';
import { 
  Box, Button, Card, CardContent, FormControl, Grid, InputLabel, MenuItem, Select, Stack, TextField, Typography, 
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import useUsers from '../hooks/useUsers';
import useInventory from '../hooks/useInventory';
import { useAuth } from '../context/AuthContext';

/*Сторінка адміністрування користувачів*/
export default function UsersAdminPage() {
  const { profile } = useAuth();
  const { users, updateUserProfile, resetUserPassword, deleteUserProfile } = useUsers();
  const inv = useInventory(profile);
  
  // State for dialogs and search
  const [passwordDialog, setPasswordDialog] = useState({ open: false, user: null });
  const [editNameDialog, setEditNameDialog] = useState({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editingName, setEditingName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = profile?.role === 'admin';
  if (!isAdmin) return <Typography>Доступ заборонено</Typography>;

  /*Фільтрація користувачів за пошуковим запитом*/
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      (user.displayName && user.displayName.toLowerCase().includes(query)) ||
      (user.email && user.email.toLowerCase().includes(query))
    );
  }, [users, searchQuery]);

  /*Перевірка можливості скидання пароля*/
  const canResetPassword = (user) => {
    return user.authProvider === 'password' || !user.authProvider;
  };

  /*Визначення рекомендованої ролі*/
  const getRecommendedRole = (user) => {
    if (user.assignedSectionId) return 'sectionStorekeeper';
    if (user.assignedUnitId) return 'unitStorekeeper';
    return null;
  };

  /*Отримання текстового опису призначення*/
  const getAssignmentDisplay = (user) => {
    if (user.assignedSectionId) {
      const section = inv.sections.find(s => s.id === user.assignedSectionId);
      const unit = inv.units.find(u => u.id === section?.unitId);
      return `${section?.name || 'Невідомий відділ'} (Підрозділ: ${unit?.name || 'Невідомий'})`;
    }
    if (user.assignedUnitId) {
      const unit = inv.units.find(u => u.id === user.assignedUnitId);
      return `Підрозділ: ${unit?.name || 'Невідомий'}`;
    }
    return 'не призначено';
  };

  /*Обробка призначення підрозділу з автоматичним оновленням ролі*/
  const handleUnitAssignment = async (userId, unitId) => {
    const user = users.find(u => u.id === userId);
    const updates = { assignedUnitId: unitId };
    
    /*Якщо призначаємо підрозділ*/
    if (unitId) {
      updates.assignedSectionId = '';
      if (user.role !== 'admin') {
        updates.role = 'unitStorekeeper';
      }
    } else {
      updates.assignedSectionId = '';
    }
    
    await updateUserProfile(userId, updates);
  };

  /*Обробка призначення відділу з автоматичним оновленням ролі*/
  const handleSectionAssignment = async (userId, sectionId) => {
    const user = users.find(u => u.id === userId);
    const updates = { assignedSectionId: sectionId };
    
    if (sectionId) {
      const section = inv.sections.find(s => s.id === sectionId);
      if (section) {
        updates.assignedUnitId = section.unitId;
      }
      if (user.role !== 'admin') {
        updates.role = 'sectionStorekeeper';
      }
    } else {
      if (user.assignedUnitId && user.role !== 'admin') {
        updates.role = 'unitStorekeeper';
      }
    }
    
    await updateUserProfile(userId, updates);
  };

  /*Обробка редагування імені*/
  const handleEditName = (user) => {
    setEditNameDialog({ open: true, user });
    setEditingName(user.displayName || '');
  };

  /*Підтвердження зміни імені*/
  const handleNameSubmit = async () => {
    if (!editingName.trim()) {
      alert('Ім\'я користувача не може бути порожнім');
      return;
    }

    try {
      await updateUserProfile(editNameDialog.user.id, { displayName: editingName.trim() });
      setEditNameDialog({ open: false, user: null });
      setEditingName('');
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };

  /*Обробка скидання пароля*/
  const handlePasswordReset = async (user) => {
    if (!canResetPassword(user)) {
      alert('Неможливо скинути пароль для користувачів Google. Вони можуть входити лише через Google OAuth.');
      return;
    }
    setPasswordDialog({ open: true, user });
    setNewPassword('');
    setConfirmPassword('');
  };

  /*Підтвердження скидання пароля*/
  const handlePasswordSubmit = async () => {
    if (newPassword.length < 6) {
      alert('Пароль має бути не менше 6 символів');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Паролі не співпадають');
      return;
    }

    try {
      await resetUserPassword(passwordDialog.user.email, newPassword);
      alert(`Тимчасовий пароль встановлено для ${passwordDialog.user.displayName || passwordDialog.user.email}.

Пароль: ${newPassword}

Користувач має змінити його при наступному вході.`);
      setPasswordDialog({ open: false, user: null });
    } catch (error) {
      alert(`Помилка: ${error.message}`);
    }
  };

  /*Обробка видалення користувача*/
  const handleDeleteUser = async (user) => {
    /*Заборона видалення самого себе*/
    if (user.id === profile.id) {
      alert('Неможливо видалити свій власний обліковий запис!');
      return;
    }

    const confirmMessage = `Видалити користувача "${user.displayName || user.email}"?\n\nЦя дія незворотна і видалить всі пов'язані дані.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await deleteUserProfile(user.id);
      alert(`Користувач "${user.displayName || user.email}" був успішно видалений.`);
    } catch (error) {
      alert(`Помилка при видаленні: ${error.message}`);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Керування користувачами</Typography>
      
      {/* Поле пошуку */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <TextField
          label="Пошук користувачів"
          placeholder="Введіть ім'я або email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
          }}
        />
        <Typography variant="body2" color="text.secondary">
          Знайдено: {filteredUsers.length} з {users.length}
        </Typography>
      </Box>
      
      <Grid container spacing={2}>
        {filteredUsers.length === 0 ? (
          <Grid size={{ xs: 12 }}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                {searchQuery ? 'Нічого не знайдено' : 'Користувачі відсутні'}
              </Typography>
              {searchQuery && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Спробуйте змінити пошуковий запит
                </Typography>
              )}
            </Box>
          </Grid>
        ) : (
          filteredUsers.map((u) => (
          <Grid size={{ xs: 12, md: 6 }} key={u.id}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">{u.displayName || u.email}</Typography>
                    <Tooltip title="Редагувати ім'я">
                      <IconButton 
                        onClick={() => handleEditName(u)}
                        size="small"
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField label="Email" value={u.email || ''} InputProps={{ readOnly: true }} fullWidth size="small" />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {canResetPassword(u) ? (
                        <Tooltip title="Скинути пароль">
                          <IconButton 
                            onClick={() => handlePasswordReset(u)}
                            color="primary"
                            size="small"
                          >
                            <LockResetIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Користувач входить через Google - неможливо скинути пароль">
                          <span>
                            <IconButton 
                              disabled
                              size="small"
                            >
                              <LockResetIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      
                      {/* Кнопка видалення користувача */}
                      <Tooltip title={u.id === profile.id ? "Неможливо видалити себе" : "Видалити користувача"}>
                        <span>
                          <IconButton 
                            onClick={() => handleDeleteUser(u)}
                            color="error"
                            size="small"
                            disabled={u.id === profile.id}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                  
                      {/* Отображення статусу призначення */}
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Поточне призначення:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {getAssignmentDisplay(u)}
                    </Typography>
                    
                    {!u.role && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        Користувач не має призначеної ролі - немає доступу до системи
                      </Alert>
                    )}
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Тип входу: <strong>
                        {u.authProvider === 'google.com' ? 'Google OAuth' : 
                         u.authProvider === 'password' ? 'Пароль' :
                         'Невідомо'}
                      </strong>
                    </Typography>
                    
                    {u.mustChangePassword && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        Користувач має змінити пароль при наступному вході
                      </Alert>
                    )}
                  </Box>
                  
                  <FormControl fullWidth size="small">
                    <InputLabel>Роль</InputLabel>
                    <Select 
                      value={u.role || ''} 
                      label="Роль" 
                      onChange={(e) => updateUserProfile(u.id, { role: e.target.value })}
                    >
                      <MenuItem value="">Немає ролі (немає доступу)</MenuItem>
                      <MenuItem value="admin">Адміністратор</MenuItem>
                      <MenuItem value="unitStorekeeper">Складовщик підрозділу</MenuItem>
                      <MenuItem value="sectionStorekeeper">Складовщик відділу</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth size="small">
                    <InputLabel>Підрозділ</InputLabel>
                    <Select 
                      value={u.assignedUnitId || ''} 
                      label="Підрозділ" 
                      onChange={(e) => handleUnitAssignment(u.id, e.target.value)}
                    >
                      <MenuItem value="">(не призначено)</MenuItem>
                      {inv.units.map((unit) => (
                        <MenuItem key={unit.id} value={unit.id}>{unit.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  {/* Лише показувати поле відділу, якщо призначено підрозділ І у підрозділі є відділи */}
                  {u.assignedUnitId && inv.sections.some(section => section.unitId === u.assignedUnitId) && (
                    <FormControl fullWidth size="small">
                      <InputLabel>Відділ</InputLabel>
                      <Select 
                        value={u.assignedSectionId || ''} 
                        label="Відділ" 
                        onChange={(e) => handleSectionAssignment(u.id, e.target.value)}
                      >
                        <MenuItem value="">(не призначено)</MenuItem>
                        {inv.sections
                          .filter(section => section.unitId === u.assignedUnitId)
                          .map((section) => (
                            <MenuItem key={section.id} value={section.id}>{section.name}</MenuItem>
                          ))
                        }
                      </Select>
                    </FormControl>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))
        )}
      </Grid>
      
      {/* Діалог скидання пароля */}
      <Dialog open={passwordDialog.open} onClose={() => setPasswordDialog({ open: false, user: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          Встановити новий пароль для: {passwordDialog.user?.displayName || passwordDialog.user?.email}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Користувач буде змушений змінити цей пароль при наступному вході в систему.
            </Alert>
            <TextField
              label="Новий пароль"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              helperText="Мінімум 6 символів"
            />
            <TextField
              label="Підтвердити пароль"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              error={!!(confirmPassword && newPassword !== confirmPassword)}
              helperText={confirmPassword && newPassword !== confirmPassword ? 'Паролі не співпадають' : ''}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog({ open: false, user: null })}>
            Скасувати
          </Button>
          <Button 
            onClick={handlePasswordSubmit} 
            variant="contained"
            disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
          >
            Встановити пароль
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Діалог редагування імені */}
      <Dialog open={editNameDialog.open} onClose={() => setEditNameDialog({ open: false, user: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          Редагувати ім'я користувача: {editNameDialog.user?.email}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Ім'я користувача"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              fullWidth
              autoFocus
              helperText="Це ім'я буде відображатися в системі"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditNameDialog({ open: false, user: null })}>
            Скасувати
          </Button>
          <Button 
            onClick={handleNameSubmit} 
            variant="contained"
            disabled={!editingName.trim()}
          >
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}


