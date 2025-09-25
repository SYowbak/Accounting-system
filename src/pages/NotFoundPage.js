/*Сторінка 404 - не знайдено*/
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h5">Сторінку не знайдено</Typography>
      <Button variant="contained" onClick={() => navigate('/')}>На головну</Button>
    </Box>
  );
}


