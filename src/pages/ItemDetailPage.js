import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import useInventory from '../hooks/useInventory';
import EditItemModal from '../components/EditItemModal';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

/*Компонент для відображення рядків інформації про об'єкт*/
function InfoRow({ label, value }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 500 }}>
        {value || '-'}
      </Typography>
    </Box>
  );
}

/*Сторінка детальної інформації про об'єкт і його транзакції*/
export default function ItemDetailPage() {
  const { itemId } = useParams();
  const { profile } = useAuth();
  const { updateItem } = useInventory(profile);
  
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openEdit, setOpenEdit] = useState(false);

  /*Завантаження даних об'єкту*/
  useEffect(() => {
    if (!itemId) return;
    
    const loadItem = async () => {
      try {
        const itemDoc = await getDoc(doc(db, 'inventoryItems', itemId));
        if (itemDoc.exists()) {
          setItem({ id: itemDoc.id, ...itemDoc.data() });
        }
      } catch (error) {
        console.error('Error loading item:', error);
      }
    };
    
    loadItem();
  }, [itemId]);

  // Відключено історію операцій/транзакцій

  if (loading) {
    return <Typography>Завантаження...</Typography>;
  }

  if (!item) {
    return <Typography>Матеріальний засіб не знайдено</Typography>;
  }

  // Видалено таблицю «транзакцій»

  // Експорт з цієї сторінки вимкнено — залишаємо експорт лише у таблицях інвентарю

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      <Card>
        <CardContent>
          <Typography variant="h6">Інформація про об'єкт</Typography>
          <Grid container spacing={2} mt={1}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoRow label="Найменування" value={item?.name} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoRow label="Номенклатурний №" value={item?.nomenclatureNumber} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoRow label="Од. виміру" value={item?.unitOfMeasure} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoRow label="Марка" value={item?.brand} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoRow label="Ґатунок" value={item?.grade} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoRow label="Профіль" value={item?.profile} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoRow label="Розмір" value={item?.size} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoRow label="Норма запасу" value={item?.stockNorm} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><InfoRow label="Поточний залишок" value={item?.currentBalance} /></Grid>
          </Grid>
          <Box mt={2}>
            <Button variant="text" onClick={() => setOpenEdit(true)}>Редагувати об'єкт</Button>
          </Box>
        </CardContent>
      </Card>

      {/* Таблиця транзакцій та додавання записів видалені */}

      <EditItemModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        item={item}
        onSubmit={async (updatedItem) => {
          await updateItem(item.id, updatedItem);
          setItem(prev => ({ ...prev, ...updatedItem }));
          setOpenEdit(false);
        }}
      />
    </Stack>
  );
}