import { Box, Card, CardContent, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import { useAuth } from '../context/AuthContext';

/*Сторінка обмеженого доступу*/
export default function NoAccessPage() {
  const { profile, signOut } = useAuth();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          <LockIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
          
          <Typography variant="h4" gutterBottom color="warning.main">
            Доступ обмежено
          </Typography>
          
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Ваш обліковий запис ще не активовано
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Ласкаво просимо, <strong>{profile?.displayName || profile?.email}</strong>!
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Ваш обліковий запис було успішно створено, але адміністратор ще не призначив вам роль в системі. 
            Зверніться до адміністратора для отримання доступу до системи.
          </Typography>
          
          <Box sx={{ bgcolor: 'info.light', p: 2, borderRadius: 1, mb: 3 }}>
            <Typography variant="body2" color="info.dark">
              <ContactSupportIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              <strong>Що робити далі:</strong><br />
              1. Зверніться до адміністратора системи Email: syowbak@gmail.com<br />
              2. Повідомте ваш email: <strong>{profile?.email}</strong><br />
              3. Дочекайтеся призначення ролі та підрозділу
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Після призначення ролі адміністратором ви зможете увійти в систему та почати роботу.
          </Typography>
          
          <Button
            variant="outlined"
            onClick={signOut}
            size="large"
          >
            Вийти з системи
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}