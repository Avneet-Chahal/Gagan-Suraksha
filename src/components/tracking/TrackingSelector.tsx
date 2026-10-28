import React, { useState } from 'react';
import { Search, Orbit } from 'lucide-react';
import { Satellite } from '../../types';

interface TrackingSelectorProps {
  satellites: Satellite[];
  selectedSatellite: Satellite;
  onSelectSatellite: (sat: Satellite) => void;
}

export const TrackingSelector: React.FC<TrackingSelectorProps> = ({
  satellites,
  selectedSatellite,
  onSelectSatellite,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSatellites = satellites.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.noradId.toString().includes(searchTerm)
  );

  return (
    <div className="tracking-hud-top-left">
      {/* Object Selector Card */}
      <div className="tracking-selector-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Orbit size={15} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
              TARGET TRACKING SELECTOR
            </span>
          </div>
          <span className="badge badge-operational" style={{ fontSize: '0.62rem' }}>
            {selectedSatellite.orbitType}
          </span>
        </div>

        {/* Search Bar */}
        <div className="tracking-search-row">
          <Search size={13} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search catalog or NORAD ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdown Selector */}
        <select
          className="tracking-select-dropdown"
          value={selectedSatellite.id}
          onChange={(e) => {
            const found = satellites.find((s) => s.id === e.target.value);
            if (found) onSelectSatellite(found);
          }}
          aria-label="Select target satellite"
        >
          {filteredSatellites.map((sat) => (
            <option key={sat.id} value={sat.id}>
              {sat.category === 'DEBRIS' ? '⚠ ' : '🛰 '}
              {sat.name} (NORAD #{sat.noradId} • {sat.orbitType})
            </option>
          ))}
        </select>
      </div>

      {/* Floating Legend Card */}
      <div className="tracking-legend-card">
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>
          Astrodynamics Legend
        </div>
        <div className="tracking-legend-row">
          <span className="legend-swatch" style={{ background: '#00e5ff', boxShadow: '0 0 4px #00e5ff' }}></span>
          <span>Selected Orbit Path ({selectedSatellite.name})</span>
        </div>
        <div className="tracking-legend-row">
          <span className="legend-swatch" style={{ background: '#0284c7' }}></span>
          <span>Active Satellite Orbits</span>
        </div>
        <div className="tracking-legend-row">
          <span className="legend-swatch" style={{ background: '#ef4444' }}></span>
          <span>Tracked Space Debris Hazard</span>
        </div>
        <div className="tracking-legend-row">
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00e5ff' }}></span>
          <span>Sub-Satellite Ground Footprint</span>
        </div>
      </div>
    </div>
  );
};
