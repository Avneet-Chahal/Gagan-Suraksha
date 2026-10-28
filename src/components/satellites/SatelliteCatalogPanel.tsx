import React, { useState } from 'react';
import { Search, Star, Layers, Satellite as SatelliteIcon, ShieldAlert, RotateCcw } from 'lucide-react';
import { Satellite } from '../../types';

interface SatelliteCatalogPanelProps {
  satellites: Satellite[];
  selectedSatellite: Satellite;
  onSelectSatellite: (sat: Satellite) => void;
  onToggleFavorite: (satId: string) => void;
  favorites: Set<string>;
}

export const SatelliteCatalogPanel: React.FC<SatelliteCatalogPanelProps> = ({
  satellites,
  selectedSatellite,
  onSelectSatellite,
  onToggleFavorite,
  favorites,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PAYLOAD' | 'DEBRIS' | 'FAVORITES' | 'SSO' | 'LEO' | 'GEO'>('ALL');

  const filteredSatellites = satellites.filter((sat) => {
    // 1. Search Query
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      sat.name.toLowerCase().includes(query) ||
      sat.noradId.toString().includes(query) ||
      sat.cosparId.toLowerCase().includes(query) ||
      sat.type.toLowerCase().includes(query) ||
      sat.country.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // 2. Active Filter
    if (activeFilter === 'PAYLOAD') return sat.category !== 'DEBRIS';
    if (activeFilter === 'DEBRIS') return sat.category === 'DEBRIS';
    if (activeFilter === 'FAVORITES') return favorites.has(sat.id);
    if (activeFilter === 'SSO' || activeFilter === 'LEO' || activeFilter === 'GEO') {
      return sat.orbitType === activeFilter;
    }

    return true;
  });

  return (
    <div className="sat-catalog-panel mission-card">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em' }}>
            SPACE OBJECT CATALOG
          </span>
        </div>
        <span className="badge badge-cyan" style={{ fontSize: '0.66rem' }}>
          {filteredSatellites.length} of {satellites.length}
        </span>
      </div>

      {/* Search Input */}
      <div className="catalog-search-box">
        <Search size={15} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          className="catalog-search-input"
          placeholder="Search by name, NORAD, COSPAR..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="catalog-filter-chips">
        {(
          [
            { id: 'ALL', label: 'All Objects' },
            { id: 'PAYLOAD', label: 'Active Satellites' },
            { id: 'DEBRIS', label: 'Tracked Debris' },
            { id: 'FAVORITES', label: '★ Starred' },
            { id: 'SSO', label: 'SSO' },
            { id: 'LEO', label: 'LEO' },
            { id: 'GEO', label: 'GEO' },
          ] as const
        ).map((chip) => (
          <button
            key={chip.id}
            className={`filter-chip ${activeFilter === chip.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Catalog List */}
      <div className="catalog-list-scroll">
        {filteredSatellites.length === 0 ? (
          <div className="catalog-empty-state">
            <ShieldAlert size={28} style={{ color: 'var(--text-muted)' }} />
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>No Space Objects Found</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              No satellites or debris match the search term &quot;{searchTerm}&quot; under the active filter.
            </div>
            <button
              className="btn-aerospace"
              onClick={() => {
                setSearchTerm('');
                setActiveFilter('ALL');
              }}
              style={{ padding: '4px 10px', fontSize: '0.72rem', marginTop: '6px' }}
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          </div>
        ) : (
          filteredSatellites.map((sat) => {
            const isSelected = sat.id === selectedSatellite.id;
            const isFav = favorites.has(sat.id);
            const isDebris = sat.category === 'DEBRIS';

            return (
              <div
                key={sat.id}
                className={`catalog-object-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectSatellite(sat)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <button
                    className={`star-favorite-btn ${isFav ? 'starred' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(sat.id);
                    }}
                    title={isFav ? 'Remove from favorites' : 'Mark as favorite'}
                    aria-label={`Toggle favorite for ${sat.name}`}
                  >
                    <Star size={14} fill={isFav ? '#f59e0b' : 'none'} />
                  </button>

                  <div className="catalog-obj-info">
                    <div className="catalog-obj-name">
                      {isDebris ? (
                        <ShieldAlert size={13} style={{ color: 'var(--status-critical)', flexShrink: 0 }} />
                      ) : (
                        <SatelliteIcon size={13} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                      )}
                      <span>{sat.name}</span>
                    </div>

                    <div className="catalog-obj-meta">
                      <span className="font-mono">#{sat.noradId}</span>
                      <span>•</span>
                      <span>{sat.orbitType}</span>
                      <span>•</span>
                      <span>{sat.altitudeKm.toFixed(0)} km</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <span
                    className={`badge ${
                      isDebris
                        ? sat.status === 'CRITICAL'
                          ? 'badge-critical'
                          : 'badge-warning'
                        : sat.status === 'OPERATIONAL'
                        ? 'badge-operational'
                        : 'badge-standby'
                    }`}
                    style={{ fontSize: '0.62rem', padding: '1px 5px' }}
                  >
                    {isDebris ? 'DEBRIS' : sat.status}
                  </span>
                  <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                    {sat.country}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
