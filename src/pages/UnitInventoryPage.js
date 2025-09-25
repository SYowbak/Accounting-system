/*Сторінка інвентарю підрозділу*/
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Stack, 
  Breadcrumbs,
  Link,
  Paper,
  Divider,
  Chip
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import useInventory from '../hooks/useInventory';
import InventoryTable from '../components/InventoryTable';
import AddItemModal from '../components/AddItemModal';
import EditItemModal from '../components/EditItemModal';
import DomainIcon from '@mui/icons-material/Domain';
import WorkIcon from '@mui/icons-material/Work';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export default function UnitInventoryPage() {
  const { unitId } = useParams();
  const { profile } = useAuth();
  const inv = useInventory(profile);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);

  const unit = useMemo(() => {
    return inv.units.find(u => u.id === unitId);
  }, [inv.units, unitId]);

  const unitSections = useMemo(() => {
    return inv.sections.filter(section => section.unitId === unitId);
  }, [inv.sections, unitId]);

  const unitItems = useMemo(() => {
    return inv.items.filter(item => item.unitId === unitId);
  }, [inv.items, unitId]);

  /*Групування об'єктів за відділами*/
  const groupedItems = useMemo(() => {
    const groups = [];
    
    /*Об'єкти без відділу*/
    const directUnitItems = unitItems.filter(item => !item.sectionId);
    if (directUnitItems.length > 0) {
      groups.push({
        title: `${unit?.name} (підрозділ)`,
        items: directUnitItems,
        sectionId: null,
        unitId: unitId
      });
    }
    
    /*Об'єкти згруповані за відділами*/
    unitSections.forEach(section => {
      const sectionItems = unitItems.filter(item => item.sectionId === section.id);
      if (sectionItems.length > 0) {
        groups.push({
          title: `${section.name} (відділ)`,
          items: sectionItems,
          sectionId: section.id,
          unitId: unitId
        });
      }
    });
    
    return groups;
  }, [unitItems, unitSections, unit?.name, unitId]);

  useEffect(() => {
    if (!profile) return;
    
    /*Перевірка прав доступу*/
    if (profile.role === 'sectionStorekeeper' && profile.assignedSectionId) {
      const section = inv.sections.find(s => s.id === profile.assignedSectionId);
      if (!section || section.unitId !== unitId) {
        navigate('/units');
        return;
      }
    } else if (profile.role === 'unitStorekeeper' && profile.assignedUnitId !== unitId) {
      navigate('/units');
      return;
    }
    
    setLoading(false);
  }, [profile, unitId, inv.sections, navigate]);

  /*Підписка на об'єкти цього підрозділу*/
  useEffect(() => {
    if (!unit || !profile) return;
    
    const unsub = inv.subscribeItems(unitId);
    return () => {
      unsub && unsub();
    };
  }, [unit?.id, unitId, inv.subscribeItems, profile?.id]);

  const canManageItems = useMemo(() => {
    if (!profile || !unit) return false;
    
    return (
      profile.role === 'admin' ||
      (profile.role === 'unitStorekeeper' && profile.assignedUnitId === unitId) ||
      (profile.role === 'sectionStorekeeper' && profile.assignedSectionId && 
       inv.sections.find(s => s.id === profile.assignedSectionId)?.unitId === unitId)
    );
  }, [profile, unit, unitId, inv.sections]);

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setOpenEdit(true);
  };

  const handleDeleteItem = async (item) => {
    if (!item || !item.id) {
      alert('Помилка: невірні дані запису');
      return;
    }
    
    try {
      await inv.deleteItem(item.id);
    } catch (error) {
      alert(`Помилка при видаленні "${item.name || item.id}": ${error.message}`);
    }
  };

  if (loading) return <Typography>Завантаження...</Typography>;
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
          onClick={() => navigate(`/unit/${unitId}`)}
          sx={{ cursor: 'pointer' }}
        >
          {unit.name}
        </Link>
        <Typography color="text.primary">Матеріальні засоби</Typography>
      </Breadcrumbs>

      {/* Заголовок */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" gutterBottom>
              <ViewModuleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Матеріальні засоби підрозділу {unit.name}
            </Typography>
            <Stack direction="row" spacing={2}>
              <Chip 
                icon={<ApartmentRoundedIcon />}
                label={`${unitSections.length} відділів`}
                color="primary"
                variant="outlined"
              />
              <Chip 
                icon={<ViewModuleIcon />}
                label={`${unitItems.length} матеріальних засобів`}
                color="secondary"
                variant="outlined"
              />
            </Stack>
          </Box>
        </Box>
      </Paper>

      {/* Відображення згрупованих об'єктів */}
      {groupedItems.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary" align="center">
            {canManageItems 
              ? "У цьому підрозділі ще немає матеріальних засобів. Натисніть 'Додати' щоб додати перший запис."
              : "У цьому підрозділі немає матеріальних засобів."
            }
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {groupedItems.map((group, index) => (
            <Box key={group.sectionId || 'unit'}>
              {/* Заголовок групи */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" color="primary">
                  {group.sectionId ? (
                    <ApartmentRoundedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  ) : (
                    <DomainIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  )}
                  {group.title}
                  <Chip 
                    size="small"
                    label={`${group.items.length} засобів`}
                    sx={{ ml: 2 }}
                    variant="outlined"
                  />
                </Typography>
              </Paper>

              {/* Таблиця об'єктів для цієї групи */}
              <InventoryTable
                inventory={group.items}
                onSelectItem={(item) => navigate(`/items/${item.id}`)}
                onAddItem={canManageItems ? () => {
                  setSelectedItem({ unitId, sectionId: group.sectionId });
                  setOpenAdd(true);
                } : undefined}
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
                    ? `У ${group.sectionId ? 'відділі' : 'підрозділі'} ${group.title} ще немає матеріальних засобів.`
                    : `У ${group.sectionId ? 'відділі' : 'підрозділі'} ${group.title} немає матеріальних засобів.`
                }
              />

              {/* Додавання відступу між групами, крім останньої */}
              {index < groupedItems.length - 1 && <Divider sx={{ my: 3 }} />}
            </Box>
          ))}
        </Stack>
      )}

      {/* Модальне вікно додавання */}
      {canManageItems && (
        <AddItemModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          onSubmit={async (payload) => {
            await inv.createItem(payload);
            setOpenAdd(false);
          }}
          unitId={unitId}
          sectionId={selectedItem?.sectionId || null}
        />
      )}

      {/* Модальне вікно редагування */}
      {canManageItems && selectedItem && (
        <EditItemModal
          open={openEdit}
          onClose={() => setOpenEdit(false)}
          item={selectedItem}
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