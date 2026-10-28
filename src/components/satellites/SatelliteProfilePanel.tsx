import React from 'react';
import { Satellite as SatelliteIcon, ShieldAlert, Star, ExternalLink, Orbit, ShieldCheck, Activity } from 'lucide-react';
import { Satellite } from '../../types';
import { useNavigate } from 'react-router-dom';

interface SatelliteProfilePanelProps {
  satellite: Satellite;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

export const SatelliteProfilePanel: React.FC<SatelliteProfilePanelProps> = ({
  satellite,
  isFavorite,
  onToggleFavorite,
}) => {
  const navigate = useNavigate();
  const isDebris = satellite.category === 'DEBRIS';

  return (
    <div className="sat-profile-panel mission-card">
      {/* 1. Profile Hero Block */}
      <div className="profile-hero">
        <div className="profile-icon-box">
          {isDebris ? (
            <ShieldAlert size={24} style={{ color: 'var(--status-critical)' }} />
          ) : (
            <SatelliteIcon size={24} style={{ color: 'var(--accent-cyan)' }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {satellite.name}
            </h2>
            <button
              className={`star-favorite-btn ${isFavorite ? 'starred' : ''}`}
              onClick={() => onToggleFavorite(satellite.id)}
              title={isFavorite ? 'Starred Favorite' : 'Mark as Favorite'}
            >
              <Star size={16} fill={isFavorite ? '#f59e0b' : 'none'} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span
              className={`badge ${
                isDebris
                  ? satellite.status === 'CRITICAL'
                    ? 'badge-critical'
                    : 'badge-warning'
                  : 'badge-operational'
              }`}
            >
              {isDebris ? 'TRACKED DEBRIS' : satellite.status}
            </span>
            <span className="badge badge-cyan">{satellite.orbitType}</span>
          </div>
        </div>
      </div>

      {/* 2. Detailed Metadata Cards */}
      <div className="profile-details-grid">
        {/* Core Identifiers */}
        <div className="profile-section-card">
          <div className="sub-section-title">Object Identification</div>
          <div className="profile-stat-row">
            <span className="profile-stat-label">NORAD Catalog ID</span>
            <span className="profile-stat-val font-mono">{satellite.noradId}</span>
          </div>
          <div className="profile-stat-row">
            <span className="profile-stat-label">COSPAR Designator</span>
            <span className="profile-stat-val font-mono">{satellite.cosparId}</span>
          </div>
          <div className="profile-stat-row">
            <span className="profile-stat-label">Object Classification</span>
            <span className="profile-stat-val">{satellite.type}</span>
          </div>
          <div className="profile-stat-row">
            <span className="profile-stat-label">Country / Operator</span>
            <span className="profile-stat-val">{satellite.country}</span>
          </div>
          <div className="profile-stat-row">
            <span className="profile-stat-label">Launch Epoch</span>
            <span className="profile-stat-val font-mono">{satellite.launchDate}</span>
          </div>
          {satellite.rcsM2 && (
            <div className="profile-stat-row">
              <span className="profile-stat-label">Radar Cross Section (RCS)</span>
              <span className="profile-stat-val font-mono">{satellite.rcsM2} m²</span>
            </div>
          )}
        </div>

        {/* Orbital Parameters */}
        <div className="profile-section-card">
          <div className="sub-section-title">Astrodynamic State Vectors</div>
          <div className="profile-stat-row">
            <span className="profile-stat-label">Altitude (Mean)</span>
            <span className="profile-stat-val font-mono" style={{ color: 'var(--accent-cyan)' }}>
              {satellite.altitudeKm} km
            </span>
          </div>
          <div className="profile-stat-row">
            <span className="profile-stat-label">Orbital Velocity</span>
            <span className="profile-stat-val font-mono">{satellite.velocityKmS} km/s</span>
          </div>
          <div className="profile-stat-row">
            <span className="profile-stat-label">Orbital Inclination</span>
            <span className="profile-stat-val font-mono">{satellite.inclination}°</span>
          </div>
          <div className="profile-stat-row">
            <span className="profile-stat-label">Eccentricity (e)</span>
            <span className="profile-stat-val font-mono">{satellite.eccentricity}</span>
          </div>
          <div className="profile-stat-row">
            <span className="profile-stat-label">Orbital Period</span>
            <span className="profile-stat-val font-mono">{satellite.periodMin} min</span>
          </div>
          {satellite.apogeeKm && (
            <div className="profile-stat-row">
              <span className="profile-stat-label">Apogee / Perigee</span>
              <span className="profile-stat-val font-mono">{satellite.apogeeKm} / {satellite.perigeeKm} km</span>
            </div>
          )}
          {satellite.semiMajorAxisKm && (
            <div className="profile-stat-row">
              <span className="profile-stat-label">Semi-Major Axis</span>
              <span className="profile-stat-val font-mono">{satellite.semiMajorAxisKm.toLocaleString()} km</span>
            </div>
          )}
        </div>

        {/* Live Ephemeris Coordinates */}
        <div className="profile-section-card">
          <div className="sub-section-title">Sub-Satellite Point (WGS-84)</div>
          <div className="profile-stat-row">
            <span className="profile-stat-label">Sub-Latitude</span>
            <span className="profile-stat-val font-mono">{satellite.latitude.toFixed(3)}° N</span>
          </div>
          <div className="profile-stat-row">
            <span className="profile-stat-label">Sub-Longitude</span>
            <span className="profile-stat-val font-mono">{satellite.longitude.toFixed(3)}° E</span>
          </div>
          <div className="profile-stat-row">
            <span className="profile-stat-label">Ground Track Rate</span>
            <span className="profile-stat-val font-mono">{satellite.groundTrackRateKmS} km/s</span>
          </div>
        </div>

        {/* Safety & Conjunction Status */}
        <div className="profile-section-card" style={{ borderLeft: `3px solid ${isDebris ? 'var(--status-critical)' : 'var(--status-operational)'}` }}>
          <div className="sub-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={13} style={{ color: isDebris ? 'var(--status-critical)' : 'var(--status-operational)' }} />
            <span>Conjunction Assessment</span>
          </div>
          {satellite.id === 'orbit-02' ? (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <span style={{ color: 'var(--status-critical)', fontWeight: 700 }}>HIGH RISK ENCOUNTER</span>: Predicted close approach with SL-16 Debris at miss distance <strong>320 meters</strong> (TCA: 14:18:22 UTC).
            </div>
          ) : isDebris ? (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Active collision hazard to Sun-Synchronous satellites. Primary chaser object in conjunction CA-101.
            </div>
          ) : (
            <div style={{ fontSize: '0.72rem', color: 'var(--status-operational)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} />
              <span>Nominal trajectory. No critical conjunction threats within 72 hours.</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Action Toolbar */}
      <div className="profile-action-group">
        <button
          className="btn-aerospace btn-primary"
          onClick={() => navigate('/tracking')}
          style={{ justifyContent: 'center', padding: '7px 12px' }}
        >
          <Orbit size={14} />
          <span>Track in 3D Orbit View</span>
        </button>

        <button
          className="btn-aerospace"
          onClick={() => navigate('/close-approaches')}
          style={{ justifyContent: 'center', padding: '6px 12px' }}
        >
          <ExternalLink size={14} />
          <span>Screen Close Approaches</span>
        </button>
      </div>
    </div>
  );
};
