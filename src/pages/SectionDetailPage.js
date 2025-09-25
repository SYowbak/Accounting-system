import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Typography, 
  Stack, 
  Breadcrumbs,
  Link,
  Paper,
  Chip
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import useInventory from '../hooks/useInventory';
import InventoryTable from '../components/InventoryTable';
import AddItemModal from '../components/AddItemModal';
import WorkIcon from '@mui/icons-material/Work';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AddIcon from '@mui/icons-material/Add';

/*Сторінка детальної інформації про відділ*/
export default function SectionDetailPage() {
  const { sectionId } = useParams();
  const { profile } = useAuth();
  const inv = useInventory(profile);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);

  /*Пошук відділу за ID*/
  const section = useMemo(() => {
    return inv.sections.find(s => s.id === sectionId);
  }, [inv.sections, sectionId]);

  /*Пошук батьківського підрозділу*/
  const unit = useMemo(() => {
    if (!section) return null;
    return inv.units.find(u => u.id === section.unitId);
  }, [inv.units, section]);

  /*Отримання об'єктів відділу*/
  const sectionItems = useMemo(() => {
    return inv.items.filter(item => item.sectionId === sectionId);
  }, [inv.items, sectionId]);

  /*Форматування даних для таблиці*/
  const tableData = useMemo(() => {
    if (!section || sectionItems.length === 0) {
      return [];
    }
    
    const headerRow = {
      id: `header_${sectionId}`,
      isHeader: true,
      headerTitle: `${section.name} (відділ)`,
      headerIcon: 'section'
    };
    
    return [headerRow, ...sectionItems];
  }, [section, sectionItems, sectionId]);

  /*Перевірка дозволів доступу*/
  useEffect(() => {
    if (!profile) return;
    
    if (profile.role === 'sectionStorekeeper' && profile.assignedSectionId !== sectionId) {
      navigate('/units');
      return;
    } else if (profile.role === 'unitStorekeeper' && section && profile.assignedUnitId !== section.unitId) {
      navigate('/units');
      return;
    }
    
    setLoading(false);
  }, [profile?.id, profile?.role, sectionId, section?.id, navigate]);

  /*Окремий ефект для підписки на об'єкти*/
  useEffect(() => {
    if (!section || !profile) return;
    
    const unsub = inv.subscribeItems(section.unitId, sectionId);
    return () => {
      unsub && unsub();
    };
  }, [section?.id, sectionId, inv.subscribeItems, profile?.id]);

  /*Перевірка можливості керувати об'єктами*/
  const canManageItems = useMemo(() => {
    if (!profile || !section) return false;
    
    return (
      profile.role === 'admin' ||
      (profile.role === 'unitStorekeeper' && profile.assignedUnitId === section.unitId) ||
      (profile.role === 'sectionStorekeeper' && profile.assignedSectionId === sectionId)
    );
  }, [profile, section, sectionId]);

  /*Обробка редагування об'єкта*/
  const handleEditItem = (item) => {
    setSelectedItem(item);
    setOpenEdit(true);
  };

  /*Обробка видалення об'єкта*/
  const handleDeleteItem = async (item) => {
    if (!item || !item.id) {
      alert('Помилка: невірні дані запису');
      return;
    }
    
    try {
      await inv.deleteItem(item.id);
    } catch (error) {
      alert(`Помилка при видаленні "${item.name}": ${error.message}`);
    }
  };

  if (loading) return <Typography>Завантаження...</Typography>;
  if (!section) return <Typography>Відділ не знайдено</Typography>;
  if (!unit) return <Typography>Підрозділ не знайдено</Typography>;

  return (
    <Stack spacing={3}>
      {/* Навігаційні посилання */}
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
        <Link 
          underline="hover" 
          color="inherit" 
          onClick={() => navigate('/units')}
          sx={{ cursor: 'pointer' }}
        >
          Підрозділи
        </Link>
        <Link 
          underline="hover" 
          color="inherit" 
          onClick={() => navigate(`/unit/${unit.id}`)}
          sx={{ cursor: 'pointer' }}
        >
          {unit.name}
        </Link>
        <Typography color="text.primary">{section.name}</Typography>
      </Breadcrumbs>

      {/* Заголовок відділу */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" gutterBottom>
              <ApartmentRoundedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {section.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Підрозділ: {unit.name}
            </Typography>
            <Chip 
              icon={<ViewModuleIcon />}
              label={`${sectionItems.length} матеріальних засобів`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </Box>
      </Paper>

      {/* Таблиця матеріальних засобів */}
      <Box>
        <InventoryTable
          inventory={tableData}
          onSelectItem={(item) => navigate(`/items/${item.id}`)}
          onAddItem={canManageItems ? () => setOpenAdd(true) : undefined}
          onEditItem={canManageItems ? handleEditItem : undefined}
          onDeleteItem={canManageItems ? handleDeleteItem : undefined}
          onUpdateItem={canManageItems ? async (itemId, updatedData) => {
            await inv.updateItem(itemId, updatedData);
          } : undefined}
          canEdit={canManageItems}
          canDelete={canManageItems}
          userProfile={profile}
          emptyMessage={
            canManageItems 
              ? "У цьому відділі ще немає матеріальних засобів. Натисніть 'Додати' щоб додати перший запис."
              : "У цьому відділі немає матеріальних засобів."
          }
        />
      </Box>

      {/* Модальне вікно додавання */}
      {canManageItems && (
        <AddItemModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          unitId={section.unitId}
          sectionId={sectionId}
          userProfile={profile}
          onSubmit={async (payload) => {
            await inv.createItem(payload);
            setOpenAdd(false);
          }}
        />
      )}

      {/* Модальне вікно редагування */}
      {canManageItems && (
        <AddItemModal
          open={openEdit}
          onClose={() => {
            setOpenEdit(false);
            setSelectedItem(null);
          }}
          unitId={section.unitId}
          sectionId={sectionId}
          item={selectedItem}
          userProfile={profile}
          onSubmit={async (payload) => {
            await inv.updateItem(selectedItem.id, payload);
            setOpenEdit(false);
            setSelectedItem(null);
          }}
        />
      )}

    </Stack>
  );
}