import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { SatellitesPage } from '../pages/SatellitesPage';
import { OrbitTrackingPage } from '../pages/OrbitTrackingPage';
import { CloseApproachesPage } from '../pages/CloseApproachesPage';
import { CollisionRiskPage } from '../pages/CollisionRiskPage';
import { ManeuverPlannerPage } from '../pages/ManeuverPlannerPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { AlertsPage } from '../pages/AlertsPage';
import { SettingsPage } from '../pages/SettingsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/satellites" element={<SatellitesPage />} />
        <Route path="/tracking" element={<OrbitTrackingPage />} />
        <Route path="/close-approaches" element={<CloseApproachesPage />} />
        <Route path="/collision-risk" element={<CollisionRiskPage />} />
        <Route path="/maneuver-planner" element={<ManeuverPlannerPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* Fallback to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
