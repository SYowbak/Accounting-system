import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Alert,
  Typography
} from '@mui/material';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebase';

/*Модальне вікно примусової зміни пароля*/
export default function ForcePasswordChangeModal({ open, onComplete }) {
  const { user, profile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /*Обробка зміни пароля*/
  const handlePasswordChange = async () => {
    setError('');
    
    if (newPassword.length < 6) {
      setError('Новий пароль має бути не менше 6 символів');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }

    if (currentPassword !== profile.tempPassword) {
      setError('Неправильний поточний пароль');
      return;
    }

    setLoading(true);
    try {
      // Reauthenticate the user with their temporary password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update the user's password in Firebase Auth
      await updatePassword(user, newPassword);
      
      // Remove temporary password and flag from user profile
      await updateDoc(doc(db, 'users', user.uid), {
        tempPassword: null,
        mustChangePassword: false,
        passwordChangedAt: new Date()
      });

      onComplete?.();
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        setError('Неправильний поточний пароль');
      } else if (error.code === 'auth/requires-recent-login') {
        setError('Ця операція вимагає нещодавньої автентифікації. Будь ласка, увійдіть знову.');
      } else {
        setError(`Помилка при зміні пароля: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown
      disableBackdropClick
    >
      <DialogTitle>
        Необхідно змінити пароль
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="warning">
            Ваш адміністратор встановив тимчасовий пароль. Ви маєте змінити його перед тим, як продовжити роботу в системі.
          </Alert>
          
          {profile?.tempPassword && (
            <Alert severity="info">
              Ваш тимчасовий пароль: <strong>{profile.tempPassword}</strong>
            </Alert>
          )}

          <TextField
            label="Поточний (тимчасовий) пароль"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="Новий пароль"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            required
            helperText="Мінімум 6 символів"
          />

          <TextField
            label="Підтвердити новий пароль"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            required
            error={Boolean(confirmPassword && newPassword !== confirmPassword)}
            helperText={confirmPassword && newPassword !== confirmPassword ? 'Паролі не співпадають' : ''}
          />

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handlePasswordChange}
          variant="contained"
          disabled={
            loading || 
            !currentPassword || 
            !newPassword || 
            !confirmPassword || 
            newPassword !== confirmPassword ||
            newPassword.length < 6
          }
        >
          {loading ? 'Змінюю пароль...' : 'Змінити пароль'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}