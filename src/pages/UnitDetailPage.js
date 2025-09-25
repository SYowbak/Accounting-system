import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Grid, 
  Typography, 
  Stack, 
  Chip,
  Breadcrumbs,
  Link,
  Divider,
  Paper
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import useInventory from '../hooks/useInventory';
import InventoryTable from '../components/InventoryTable';
import AddItemModal from '../components/AddItemModal';
import AdminUnitModal from '../components/AdminUnitModal';
import AdminSectionModal from '../components/AdminSectionModal';
import DomainIcon from '@mui/icons-material/Domain';
import WorkIcon from '@mui/icons-material/Work';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

/*Сторінка детальної інформації про підрозділ*/
export default function UnitDetailPage() {
  const { unitId } = useParams();
  const { profile } = useAuth();
  const inv = useInventory(profile);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [openUnitEdit, setOpenUnitEdit] = useState(false);
  const [openSectionModal, setOpenSectionModal] = useState({ open: false, mode: 'create', section: null });

  /*Пошук підрозділу за ID*/
  const unit = useMemo(() => {
    return inv.units.find(u => u.id === unitId);
  }, [inv.units, unitId]);

  /*Отримання відділів підрозділу*/
  const unitSections = useMemo(() => {
    return inv.sections.filter(section => section.unitId === unitId);
  }, [inv.sections, unitId]);

  /*Отримання об'єктів підрозділу*/
  const unitItems = useMemo(() => {
    return inv.items.filter(item => item.unitId === unitId);
  }, [inv.items, unitId]);

  /*Створення об'єднаного інвентарю з заголовками відділів*/
  const unifiedInventoryWithHeaders = useMemo(() => {
    if (profile?.role !== 'unitStorekeeper' && profile?.role !== 'admin') {
      return [];
    }
    
    /*Для складовщика підрозділу - тільки призначений підрозділ*/
    if (profile?.role === 'unitStorekeeper' && profile?.assignedUnitId !== unitId) {
      return [];
    }

    const result = [];
    
    /*Додавання прямих об'єктів підрозділу*/
    const directUnitItems = unitItems.filter(item => !item.sectionId);
    if (directUnitItems.length > 0) {
      result.push({
        id: `header-unit-${unitId}`,
        isHeader: true,
        headerTitle: `${unit?.name} (підрозділ)`,
        headerIcon: 'unit'
      });
      result.push(...directUnitItems.map(item => ({ ...item, groupType: 'unit' })));
    }
    
    /*Додавання об'єктів, згрупованих за відділами*/
    unitSections.forEach(section => {
      const sectionItems = unitItems.filter(item => item.sectionId === section.id);
      if (sectionItems.length > 0) {
        result.push({
          id: `header-section-${section.id}`,
          isHeader: true,
          headerTitle: `${section.name} (відділ)`,
          headerIcon: 'section',
          sectionId: section.id
        });
        result.push(...sectionItems.map(item => ({ ...item, groupType: 'section' })));
      }
    });
    
    return result;
  }, [unitItems, unitSections, unit?.name, unitId, profile]);

  useEffect(() => {
    if (!profile) return;
    
    /*Перевірка дозволів доступу*/
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
    if (!unit || !profile || profile.role !== 'unitStorekeeper') return;
    
    const unsub = inv.subscribeItems(unitId);
    return () => {
      unsub && unsub();
    };
  }, [unit?.id, unitId, inv.subscribeItems, profile?.id, profile?.role]);

  const getSectionItemsCount = (sectionId) => {
    return unitItems.filter(item => item.sectionId === sectionId).length;
  };

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

  /*Обробка видалення об'єкта*/
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

  /*Адміністративні функції керування підрозділами і відділами*/
  const handleDeleteUnit = async () => {
    try {
      await inv.deleteUnitById(unit.id);
      navigate('/units');
    } catch (error) {
      console.error('Помилка при видаленні підрозділу:', error);
    }
  };

  const handleDeleteSection = async (section) => {
    try {
      await inv.deleteSectionById(section.id);
    } catch (error) {
      console.error('Помилка при видаленні відділу:', error);
    }
  };

  if (loading) return <Typography>Завантаження...</Typography>;
  if (!unit) return <Typography>Підрозділ не знайдено</Typography>;

  // If user is unit storekeeper or admin, show unified table view
  if ((profile?.role === 'unitStorekeeper' && profile?.assignedUnitId === unitId) || profile?.role === 'admin') {
    return (
      <Stack spacing={3}>
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
          <Link 
            underline="hover" 
            color="inherit" 
            onClick={() => navigate('/units')}
            sx={{ cursor: 'pointer' }}
          >
            Підрозділи
          </Link>
          <Typography color="text.primary">{unit.name}</Typography>
        </Breadcrumbs>

        {/* Unit Header */}
        <Paper sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" gutterBottom>
                <DomainIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                {unit.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Управління матеріальними засобами підрозділу
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

        {/* Unified Items Table with Headers */}
        <Box>
          <InventoryTable
            inventory={unifiedInventoryWithHeaders}
            onSelectItem={(item) => item.isHeader ? null : navigate(`/items/${item.id}`)}
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
                ? "У цьому підрозділі ще немає матеріальних засобів. Натисніть 'Додати' щоб додати перший запис."
                : "У цьому підрозділі немає матеріальних засобів."
            }
          />
        </Box>

        {/* Add Item Modal */}
        {canManageItems && (
          <AddItemModal
            open={openAdd}
            onClose={() => setOpenAdd(false)}
            unitId={unitId}
            sectionId={selectedItem?.sectionId || null}
            userProfile={profile}
            onSubmit={async (payload) => {
              await inv.createItem(payload);
              setOpenAdd(false);
            }}
          />
        )}

        {/* Edit Item Modal */}
        {canManageItems && (
          <AddItemModal
            open={openEdit}
            onClose={() => {
              setOpenEdit(false);
              setSelectedItem(null);
            }}
            unitId={unitId}
            sectionId={selectedItem?.sectionId || null}
            item={selectedItem}
            userProfile={profile}
            onSubmit={async (payload) => {
              await inv.updateItem(selectedItem.id, payload);
              setOpenEdit(false);
              setSelectedItem(null);
            }}
          />
        )}



        {/* Admin Unit Modal */}
        <AdminUnitModal
          open={openUnitEdit}
          mode="edit"
          unit={unit}
          onClose={() => setOpenUnitEdit(false)}
          onSave={async (payload) => {
            await inv.updateUnit(unit.id, { name: payload.name });
            setOpenUnitEdit(false);
          }}
        />

        {/* Admin Section Modal */}
        <AdminSectionModal
          open={openSectionModal.open}
          mode={openSectionModal.mode}
          section={openSectionModal.section}
          unitId={unitId}
          onClose={() => setOpenSectionModal({ open: false, mode: 'create', section: null })}
          onSave={async (payload) => {
            if (openSectionModal.mode === 'create') {
              await inv.createSection(unitId, payload.name);
            } else {
              await inv.updateSection(openSectionModal.section.id, { name: payload.name, unitId: payload.unitId });
            }
            setOpenSectionModal({ open: false, mode: 'create', section: null });
          }}
        />
      </Stack>
    );
  }

  // Original view for other roles (admin, section storekeeper)
  return (
    <Stack spacing={3}>
      {/* Breadcrumbs */}
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
        <Link 
          underline="hover" 
          color="inherit" 
          onClick={() => navigate('/units')}
          sx={{ cursor: 'pointer' }}
        >
          Підрозділи
        </Link>
        <Typography color="text.primary">{unit.name}</Typography>
      </Breadcrumbs>

      {/* Unit Header */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" gutterBottom>
              <DomainIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {unit.name}
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
          
          <Stack direction="row" spacing={1}>
            {profile?.role === 'admin' && (
              <>
                <Button 
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => setOpenUnitEdit(true)}
                >
                  Редагувати
                </Button>
                <Button 
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteUnit}
                >
                  Видалити
                </Button>
              </>
            )}
            
            {canManageItems && (
              <Button 
                variant="outlined" 
                onClick={() => navigate(`/unit/${unit.id}/items`)}
              >
                Переглянути всі засоби
              </Button>
            )}
          </Stack>
        </Box>
      </Paper>

      {/* Sections Grid */}
      <Box>
        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Відділи в підрозділі
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Матеріальні засоби можна додавати як до підрозділу безпосередньо, так і до його відділів.
            </Typography>
          </Box>
          {profile?.role === 'admin' && (
            <Button 
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenSectionModal({ open: true, mode: 'create', section: null })}
            >
              Додати відділ
            </Button>
          )}
        </Box>
        
        {unitSections.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="text.secondary" align="center">
                {profile?.role === 'admin' 
                  ? 'У цьому підрозділі ще немає відділів. Створіть їх в розділі адміністрування або додавайте матеріальні засоби безпосередньо в підрозділ.'
                  : 'У цьому підрозділі немає відділів. Можна додавати матеріальні засоби безпосередньо в підрозділ.'
                }
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {unitSections.map((section) => {
              const itemsCount = getSectionItemsCount(section.id);
              
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={section.id}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      '&:hover': { boxShadow: 3 }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6" gutterBottom>
                          <ApartmentRoundedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          {section.name}
                        </Typography>
                        {profile?.role === 'admin' && (
                          <Box>
                            <IconButton 
                              size="small"
                              onClick={() => setOpenSectionModal({ open: true, mode: 'edit', section })}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small"
                              color="error"
                              onClick={() => handleDeleteSection(section)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        Матеріальних засобів: <strong>{itemsCount}</strong>
                      </Typography>
                    </CardContent>
                    
                    <CardActions>
                      <Button 
                        size="small" 
                        onClick={() => navigate(`/section/${section.id}`)}
                        fullWidth
                        variant="outlined"
                      >
                        Переглянути відділ
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Direct Unit Items (items without section) */}
      {unitItems.filter(item => !item.sectionId).length > 0 && (
        <>
          <Divider />
          <Box>
            <Typography variant="h6" gutterBottom>
              Матеріальні засоби підрозділу (без відділу)
            </Typography>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Засоби, що належать безпосередньо підрозділу: {unitItems.filter(item => !item.sectionId).length}
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  onClick={() => {
                    // Navigate to items list for this unit
                    navigate(`/unit/${unit.id}/items`);
                  }}
                  variant="outlined"
                >
                  Переглянути засоби
                </Button>
              </CardActions>
            </Card>
          </Box>
        </>
      )}
    </Stack>
  );
}