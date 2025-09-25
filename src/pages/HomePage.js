import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Card, 
  CardContent, 
  Button, 
  Typography, 
  Stack, 
  Chip,
  Paper,
  Divider
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useAuth } from '../context/AuthContext';
import useInventory from '../hooks/useInventory';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import DomainIcon from '@mui/icons-material/Domain';
import WorkIcon from '@mui/icons-material/Work';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

/*Головна сторінка з дашбордом і статистикою*/
export default function HomePage() {
  const { profile } = useAuth();
  const inv = useInventory(profile);
  const navigate = useNavigate();

  /*Обчислення статистики на основі ролі користувача*/
  const statistics = useMemo(() => {
    if (!profile) return { units: 0, sections: 0, items: 0, myItems: 0 };
    
    let accessibleUnits = [];
    let accessibleSections = [];
    let accessibleItems = [];
    
    if (profile.role === 'admin') {
      accessibleUnits = inv.units;
      accessibleSections = inv.sections;
      accessibleItems = inv.items;
    } else if (profile.role === 'unitStorekeeper' && profile.assignedUnitId) {
      accessibleUnits = inv.units.filter(u => u.id === profile.assignedUnitId);
      accessibleSections = inv.sections.filter(s => s.unitId === profile.assignedUnitId);
      accessibleItems = inv.items.filter(i => i.unitId === profile.assignedUnitId);
    } else if (profile.role === 'sectionStorekeeper' && profile.assignedSectionId) {
      const section = inv.sections.find(s => s.id === profile.assignedSectionId);
      if (section) {
        accessibleUnits = inv.units.filter(u => u.id === section.unitId);
        accessibleSections = [section];
        accessibleItems = inv.items.filter(i => i.sectionId === profile.assignedSectionId);
      }
    }
    
    return {
      units: accessibleUnits.length,
      sections: accessibleSections.length,
      items: accessibleItems.length,
      myItems: accessibleItems.length
    };
  }, [profile, inv.units, inv.sections, inv.items]);

  /*Отримання опису ролі користувача*/
  const getRoleDescription = (role) => {
    switch (role) {
      case 'admin': return 'Головний складовщик';
      case 'unitStorekeeper': return 'Складовщик підрозділу';
      case 'sectionStorekeeper': return 'Складовщик відділу';
      default: return 'Користувач';
    }
  };

  if (!profile) return <Typography>Завантаження...</Typography>;

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Ласкаво просимо, {profile.displayName || profile.email}!
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            {getRoleDescription(profile.role)}
          </Typography>
        </Box>
      </Paper>

      {/*Картки статистики*/}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: 180, display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 4 } }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ height: '100%' }}>
                <Box display="flex" flexDirection="column" justifyContent="center">
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Підрозділи
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {statistics.units}
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: 180, display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 4 } }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ height: '100%' }}>
                <Box display="flex" flexDirection="column" justifyContent="center">
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Відділи
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                    {statistics.sections}
                  </Typography>
                </Box>
                <ApartmentRoundedIcon sx={{ fontSize: 60, color: 'secondary.main', opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: 180, display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 4 } }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ height: '100%' }}>
                <Box display="flex" flexDirection="column" justifyContent="center">
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Матеріальні засоби
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    {statistics.items}
                  </Typography>
                </Box>
                <ViewModuleIcon sx={{ fontSize: 60, color: 'success.main', opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/*Швидкі дії*/}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Швидкі дії
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Button 
              variant="outlined" 
              fullWidth 
              onClick={() => navigate('/units')}
              sx={{ py: 2 }}
            >
              <BusinessIcon sx={{ mr: 1 }} />
              {profile.role === 'admin' ? 'Керувати підрозділами' : 'Підрозділи'}
            </Button>
          </Grid>
          
          {profile.role === 'admin' && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Button 
                variant="outlined" 
                fullWidth 
                onClick={() => navigate('/admin/users')}
                sx={{ py: 2 }}
              >
                <PeopleIcon sx={{ mr: 1 }} />
                Керувати користувачами
              </Button>
            </Grid>
          )}
          
          {profile.assignedUnitId && !profile.assignedSectionId && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Button 
                variant="outlined" 
                fullWidth 
                onClick={() => navigate(`/unit/${profile.assignedUnitId}`)}
                sx={{ py: 2 }}
              >
                <DomainIcon sx={{ mr: 1 }} />
                Перейти до мого підрозділу
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Stack>
  );
}


