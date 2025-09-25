import { useState } from 'react';
import { Alert, Box, Button, Container, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';

/*Сторінка авторизації та реєстрації*/
export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  /*Обробка входу через Google*/
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result === null) {
        // Redirect method was used, page will reload - don't show error
        return;
      }
      // Success will be handled by AuthContext
    } catch (e) {
      if (e.message && (e.message.includes('Cross-Origin-Opener-Policy') || 
                       e.message.includes('window.close'))) {
        // Try redirect as a last resort
        try {
          await signInWithGoogle(); // This should trigger redirect fallback
          return;
        } catch (redirectError) {
          setError('Помилка безпеки браузера. Оновіть сторінку і спробуйте ще раз.');
        }
      } else if (e.code === 'auth/popup-blocked') {
        setError('Спливаюче вікно заблоковано. Дозвольте спливаючі вікна для цього сайту.');
      } else if (e.code === 'auth/popup-closed-by-user') {
        setError('Вікно авторизації було закрито.');
      } else if (e.code === 'auth/cancelled-popup-request') {
        setError('Запит на авторизацію скасовано.');
      } else if (e.code === 'auth/unauthorized-domain') {
        setError('Домен не авторизований. Зверніться до адміністратора.');
      } else {
        setError('Помилка входу через Google. Перевірте інтернет-з’єднання і спробуйте ще раз.');
      }
      setLoading(false);
    }
  };

  /*Обробка входу або реєстрації*/
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!email.trim() || !password) {
        setError('Введіть email і пароль');
        return;
      }
      
      if (isRegistering) {
        if (password !== confirmPassword) {
          setError('Паролі не співпадають');
          return;
        }
        if (password.length < 6) {
          setError('Пароль повинен містити мінімум 6 символів');
          return;
        }
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        setError('Користувач з такою поштою вже існує');
      } else if (e.code === 'auth/weak-password') {
        setError('Пароль занадто слабкий');
      } else if (e.code === 'auth/invalid-email') {
        setError('Невірний формат email');
      } else if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
        setError('Невірна пошта або пароль');
      } else {
        setError(isRegistering ? 'Помилка реєстрації' : 'Помилка входу');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <Paper sx={{ p: 3, width: '100%' }}>
        <Typography variant="h6" gutterBottom>
          {isRegistering ? 'Реєстрація в системі' : 'Вхід до системи'}
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            
            {isRegistering && (
              <TextField 
                label="Ім'я в системі" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)} 
                fullWidth 
              />
            )}
            
            <TextField 
              label="Email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              fullWidth 
              required
            />
            
            <TextField 
              label="Пароль" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              fullWidth 
              required
            />
            
            {isRegistering && (
              <TextField 
                label="Підтвердіть пароль" 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                fullWidth 
                required
              />
            )}
            
            <Button type="submit" variant="contained" disabled={loading}>
              {isRegistering ? 'Зареєструватися' : 'Увійти'}
            </Button>
            
            <Button 
              type="button" 
              variant="text" 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setConfirmPassword('');
                setDisplayName('');
              }}
              disabled={loading}
            >
              {isRegistering ? 'Вже маєте акаунт? Увійти' : 'Немає акаунту? Зареєструватися'}
            </Button>
            
            <Divider>або</Divider>
            
            <Button variant="outlined" onClick={handleGoogleSignIn} disabled={loading}>
              Увійти через Google
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}


