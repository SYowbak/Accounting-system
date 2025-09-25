/*Маршрутизація застосунку*/
import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoginPage from '../pages/LoginPage';
import MainLayout from '../ui/MainLayout';
import ItemDetailPage from '../pages/ItemDetailPage';
import HomePage from '../pages/HomePage';
import UnitsPage from '../pages/UnitsPage';
import UnitDetailPage from '../pages/UnitDetailPage';
import UnitInventoryPage from '../pages/UnitInventoryPage';
import SectionDetailPage from '../pages/SectionDetailPage';
import UsersAdminPage from '../pages/UsersAdminPage';
import LoadingScreen from '../ui/LoadingScreen';
import NotFoundPage from '../pages/NotFoundPage';
import NoAccessPage from '../pages/NoAccessPage';

/*Компонент приватних маршрутів*/
function PrivateOutlet() {
  const { user, profile, loading } = useAuth();
  
  console.log('PrivateOutlet state:', { 
    hasUser: !!user, 
    hasProfile: !!profile, 
    profileRole: profile?.role,
    loading 
  });
  
  if (loading) return <LoadingScreen />;

  if (!user || !profile) {
    console.log('Redirecting to login - no user or profile');
    return <Navigate to="/login" replace />;
  }
  
  if (!profile.role || profile.role === '') {
    console.log('User has no role, showing NoAccess page');
    return <NoAccessPage />;
  }
  
  return <Outlet />;
}

/*Компонент публічних маршрутів*/
function PublicOutlet() {
  const { user, profile, loading } = useAuth();
  
  console.log('PublicOutlet state:', { 
    hasUser: !!user, 
    hasProfile: !!profile, 
    profileRole: profile?.role,
    loading 
  });
  
  if (loading) return <LoadingScreen />;
  
  return (user && profile) ? <Navigate to="/" replace /> : <Outlet />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicOutlet />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<PrivateOutlet />}> 
        <Route element={<MainLayout />}> 
          <Route index element={<HomePage />} />
          <Route path="units" element={<UnitsPage />} />
          <Route path="unit/:unitId" element={<UnitDetailPage />} />
          <Route path="unit/:unitId/items" element={<UnitInventoryPage />} />
          <Route path="section/:sectionId" element={<SectionDetailPage />} />
          <Route path="items/:itemId" element={<ItemDetailPage />} />
          <Route path="admin/users" element={<UsersAdminPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}


