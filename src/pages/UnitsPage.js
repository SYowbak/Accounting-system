import { Box, Card, CardContent, Button, Grid, Typography, Stack, Chip, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import useInventory from '../hooks/useInventory';
import AdminUnitModal from '../components/AdminUnitModal';
import AdminSectionModal from '../components/AdminSectionModal';
import BusinessIcon from '@mui/icons-material/Business';
import DomainIcon from '@mui/icons-material/Domain';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

/*Сторінка перегляду всіх підрозділів*/
export default function UnitsPage() {
  const { profile } = useAuth();
  const inv = useInventory(profile);
  const navigate = useNavigate();
  const [openUnitModal, setOpenUnitModal] = useState({ open: false, mode: 'create', unit: null });
  const [openSectionModal, setOpenSectionModal] = useState({ open: false, mode: 'create', section: null, unitId: '' });
  const [expandedUnits, setExpandedUnits] = useState(new Set());

  /*Фільтрація підрозділів на основі ролі користувача*/
  const accessibleUnits = useMemo(() => {
    if (!profile) return [];
    
    if (profile.role === 'admin') {
      return inv.units;
    } else if (profile.role === 'unitStorekeeper' && profile.assignedUnitId) {
      return inv.units.filter(unit => unit.id === profile.assignedUnitId);
    } else if (profile.role === 'sectionStorekeeper' && profile.assignedSectionId) {
      const section = inv.sections.find(s => s.id === profile.assignedSectionId);
      if (section) {
        return inv.units.filter(unit => unit.id === section.unitId);
      }
    }
    return [];
  }, [profile, inv.units, inv.sections]);

  /*Отримання відділів підрозділу*/
  const getUnitSections = (unitId) => {
    return inv.sections.filter(section => section.unitId === unitId);
  };

  /*Підрахунок кількості об'єктів у підрозділі*/
  const getUnitItemsCount = (unitId) => {
    return inv.items.filter(item => item.unitId === unitId).length;
  };

  /*Адміністративні функції*/
  const handleDeleteUnit = async (unit) => {
    try {
      await inv.deleteUnitById(unit.id);
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

  /*Перемикання стану розгортання підрозділу*/
  const toggleUnitExpansion = (unitId) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId);
    } else {
      newExpanded.add(unitId);
    }
    setExpandedUnits(newExpanded);
  };

  return (
    <Stack spacing={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h4" gutterBottom>
          <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Підрозділи
        </Typography>
        {profile?.role === 'admin' && (
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setOpenUnitModal({ open: true, mode: 'create', unit: null })}
          >
            Додати підрозділ
          </Button>
        )}
      </Box>

      {accessibleUnits.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              {profile?.role === 'admin' 
                ? 'Підрозділи ще не створені. Перейдіть до адміністрування для їх створення.'
                : 'У вас немає доступу до жодного підрозділу. Зверніться до адміністратора.'
              }
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {accessibleUnits.map((unit) => {
            const sections = getUnitSections(unit.id);
            const itemsCount = getUnitItemsCount(unit.id);
            
            return (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={unit.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="h6" gutterBottom>
                        <DomainIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        {unit.name}
                      </Typography>
                      {profile?.role === 'admin' && (
                        <Box>
                          <IconButton 
                            size="small"
                            onClick={() => setOpenUnitModal({ open: true, mode: 'edit', unit })}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small"
                            color="error"
                            onClick={() => handleDeleteUnit(unit)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                    
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Відділи: <strong>{sections.length}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Матеріальних засобів: <strong>{itemsCount}</strong>
                        </Typography>
                      </Box>

                      {(sections.length > 0 || profile?.role === 'admin') && (
                        <Box>
                          <Typography variant="body2" gutterBottom>
                            Відділи:
                            {profile?.role === 'admin' && (
                              <Button 
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => setOpenSectionModal({ open: true, mode: 'create', section: null, unitId: unit.id })}
                                sx={{ ml: 1 }}
                              >
                                Додати
                              </Button>
                            )}
                          </Typography>
                          {sections.length > 0 && (
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {(expandedUnits.has(unit.id) ? sections : sections.slice(0, 3)).map((section) => (
                                <Chip 
                                  key={section.id}
                                  label={section.name}
                                  size="small"
                                  variant="outlined"
                                  onDelete={profile?.role === 'admin' ? () => handleDeleteSection(section) : undefined}
                                  onClick={profile?.role === 'admin' ? () => setOpenSectionModal({ open: true, mode: 'edit', section, unitId: unit.id }) : undefined}
                                  sx={{ cursor: profile?.role === 'admin' ? 'pointer' : 'default', mb: 0.5 }}
                                />
                              ))}
                              {sections.length > 3 && (
                                <Chip 
                                  label={expandedUnits.has(unit.id) ? 'Згорнути' : `+${sections.length - 3} ще`}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  onClick={() => toggleUnitExpansion(unit.id)}
                                  sx={{ cursor: 'pointer' }}
                                />
                              )}
                            </Stack>
                          )}
                          {sections.length === 0 && profile?.role !== 'admin' && (
                            <Typography variant="body2" color="text.secondary">
                              Немає відділів
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Модальне вікно адміністрування підрозділу */}
      <AdminUnitModal
        open={openUnitModal.open}
        mode={openUnitModal.mode}
        unit={openUnitModal.unit}
        onClose={() => setOpenUnitModal({ open: false, mode: 'create', unit: null })}
        onSave={async (payload) => {
          if (openUnitModal.mode === 'create') {
            await inv.createUnit(payload.name);
          } else {
            await inv.updateUnit(openUnitModal.unit.id, { name: payload.name });
          }
          setOpenUnitModal({ open: false, mode: 'create', unit: null });
        }}
      />

      {/* Модальне вікно адміністрування відділу */}
      <AdminSectionModal
        open={openSectionModal.open}
        mode={openSectionModal.mode}
        section={openSectionModal.section}
        unitId={openSectionModal.unitId}
        onClose={() => setOpenSectionModal({ open: false, mode: 'create', section: null, unitId: '' })}
        onSave={async (payload) => {
          if (openSectionModal.mode === 'create') {
            await inv.createSection(openSectionModal.unitId, payload.name);
          } else {
            await inv.updateSection(openSectionModal.section.id, { name: payload.name, unitId: payload.unitId });
          }
          setOpenSectionModal({ open: false, mode: 'create', section: null, unitId: '' });
        }}
      />
    </Stack>
  );
}