import { useMemo, useState, useEffect } from 'react';
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Divider, 
  Drawer, 
  IconButton, 
  List, 
  ListItemButton, 
  ListItemIcon,
  ListItemText, 
  Toolbar, 
  Typography, 
  Collapse,
  Badge
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useInventory from '../hooks/useInventory';
import ForcePasswordChangeModal from '../components/ForcePasswordChangeModal';

/*Основний лайаут застосунку з навігацією*/

const drawerWidth = 300;

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unitsExpanded, setUnitsExpanded] = useState(true);
  const [sectionsExpanded, setSectionsExpanded] = useState({}); /*Відстеження стану розгортання для кожного підрозділу*/
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const { profile, signOut } = useAuth();
  const inventory = useInventory(profile);
  const navigate = useNavigate();
  const location = useLocation();

  /*Обробка перемикання мобільного меню*/
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  /*Перевірка необхідності зміни пароля*/
  useEffect(() => {
    if (profile?.mustChangePassword && profile?.authProvider === 'password') {
      setForcePasswordChange(true);
    }
  }, [profile?.mustChangePassword, profile?.authProvider]);

  /*Перемикання розгортання відділів*/
  const toggleSectionsExpanded = (unitId) => {
    setSectionsExpanded(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  /*Фільтрація контенту за роллю користувача*/
  const accessibleUnits = useMemo(() => {
    if (!profile) return [];
    
    if (profile.role === 'admin') {
      return inventory.units;
    } else if (profile.role === 'unitStorekeeper' && profile.assignedUnitId) {
      return inventory.units.filter(unit => unit.id === profile.assignedUnitId);
    } else if (profile.role === 'sectionStorekeeper' && profile.assignedSectionId) {
      const section = inventory.sections.find(s => s.id === profile.assignedSectionId);
      if (section) {
        return inventory.units.filter(unit => unit.id === section.unitId);
      }
    }
    return [];
  }, [profile, inventory.units, inventory.sections]);

  const getAccessibleSections = (unitId) => {
    const sections = inventory.sections.filter(section => section.unitId === unitId);
    
    if (profile?.role === 'sectionStorekeeper' && profile.assignedSectionId) {
      return sections.filter(section => section.id === profile.assignedSectionId);
    }
    
    return sections;
  };

  const getSectionItemsCount = (sectionId) => {
    return inventory.items.filter(item => item.sectionId === sectionId).length;
  };

  const isCurrentPath = (path) => location.pathname === path;
  const isParentPath = (path) => location.pathname.startsWith(path);

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Облік складу
        </Typography>
      </Toolbar>
      <Divider />
      
      <List>
        {/* Головна панель */}
        <ListItemButton 
          onClick={() => navigate('/')}
          selected={isCurrentPath('/')}
        >
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Головна" />
        </ListItemButton>

        {/* Розділ підрозділів */}
        <ListItemButton onClick={() => setUnitsExpanded(!unitsExpanded)}>
          <ListItemIcon>
            <BusinessIcon />
          </ListItemIcon>
          <ListItemText primary="Підрозділи" />
          <Badge badgeContent={accessibleUnits.length} color="primary" sx={{ mr: 1 }}>
            {unitsExpanded ? <ExpandLess /> : <ExpandMore />}
          </Badge>
        </ListItemButton>
        
        <Collapse in={unitsExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {accessibleUnits.map((unit) => {
              const sections = getAccessibleSections(unit.id);
              
              return (
                <div key={unit.id}>
                  <ListItemButton 
                    sx={{ pl: 4 }} 
                    onClick={() => {
                      // Завжди переходити на сторінку підрозділу
                      navigate(`/unit/${unit.id}`);
                      // Також перемикати розгортання відділів, якщо є відділи
                      if (sections.length > 0) {
                        toggleSectionsExpanded(unit.id);
                      }
                    }}
                    selected={isCurrentPath(`/unit/${unit.id}`)}
                  >
                    <ListItemIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/unit/${unit.id}`);
                      }}
                      sx={{ cursor: 'pointer' }}
                    >
                      <BusinessIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={unit.name} 
                      secondary={`${sections.length} відділів`}
                    />
                    {sections.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {sectionsExpanded[unit.id] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                      </Box>
                    )}
                  </ListItemButton>
                  
                  {/* Згортувані відділи під цим підрозділом */}
                  {sections.length > 0 && (
                    <Collapse in={sectionsExpanded[unit.id]} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {sections.map((section) => (
                          <ListItemButton 
                            key={section.id}
                            sx={{ pl: 8 }} 
                            onClick={() => navigate(`/section/${section.id}`)}
                            selected={isCurrentPath(`/section/${section.id}`)}
                          >
                            <ListItemIcon>
                              <ApartmentRoundedIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={section.name}
                              secondary={
                                <span style={{ display: 'flex', alignItems: 'center' }}>
                                  <ViewModuleIcon fontSize="small" sx={{ mr: 0.5 }} />
                                  {getSectionItemsCount(section.id)}
                                </span>
                              }
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    </Collapse>
                  )}
                </div>
              );
            })}
            
            {accessibleUnits.length === 0 && (
              <ListItemButton sx={{ pl: 4 }} disabled>
                <ListItemText 
                  primary="Немає доступних підрозділів" 
                  secondary={profile?.role === 'admin' ? 'Створіть підрозділи в адмін-панелі' : 'Зверніться до адміністратора'}
                />
              </ListItemButton>
            )}
          </List>
        </Collapse>
      </List>
      
      <Divider />
      <List>
        <ListItemButton onClick={() => signOut()}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Вийти" />
        </ListItemButton>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Електронна книга складського обліку
          </Typography>
          
          {profile && (
            <Box display="flex" alignItems="center">
              <Typography variant="body2" sx={{ mr: 2 }}>
                {profile.displayName || profile.email}
              </Typography>
              <Typography variant="body2" color="inherit" sx={{ opacity: 0.8 }}>
                ({profile.role === 'admin' ? 'Адмін' : 
                  profile.role === 'unitStorekeeper' ? 'Складовщик підрозділу' : 
                  'Складовщик відділу'})
              </Typography>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label="sidebar">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>
      
      {/* Модальне вікно примусової зміни пароля */}
      <ForcePasswordChangeModal 
        open={forcePasswordChange} 
        onComplete={() => setForcePasswordChange(false)}
      />
    </Box>
  );
}


