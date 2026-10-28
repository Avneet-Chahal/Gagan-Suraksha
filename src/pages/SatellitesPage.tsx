import React, { useState } from 'react';
import { SatelliteCatalogPanel } from '../components/satellites/SatelliteCatalogPanel';
import { SatellitesEarthVisualization } from '../components/satellites/SatellitesEarthVisualization';
import { SatelliteProfilePanel } from '../components/satellites/SatelliteProfilePanel';
import { DEMO_SATELLITES_LIST, DEMO_PRIMARY_SATELLITE } from '../data/mockData';
import { Satellite } from '../types';

export const SatellitesPage: React.FC = () => {
  const [satellites] = useState<Satellite[]>(DEMO_SATELLITES_LIST);
  const [selectedSatellite, setSelectedSatellite] = useState<Satellite>(DEMO_PRIMARY_SATELLITE);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['orbit-02', 'cartosat-3']));

  const handleToggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };

  return (
    <div className="satellites-page-layout">
      {/* 1. Left Catalog Panel: Searchable List, Filters, Star Favorites */}
      <SatelliteCatalogPanel
        satellites={satellites}
        selectedSatellite={selectedSatellite}
        onSelectSatellite={setSelectedSatellite}
        onToggleFavorite={handleToggleFavorite}
        favorites={favorites}
      />

      {/* 2. Central 3D Earth Space Visualization: Interactive Three.js scene, multi-satellite orbit paths, raycast selection */}
      <SatellitesEarthVisualization
        satellites={satellites}
        selectedSatellite={selectedSatellite}
        onSelectSatellite={setSelectedSatellite}
      />

      {/* 3. Right Satellite Profile Panel: Full identity, astrodynamic parameters, WGS-84 coordinates, conjunction assessment */}
      <SatelliteProfilePanel
        satellite={selectedSatellite}
        isFavorite={favorites.has(selectedSatellite.id)}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
};
