import React from 'react';
import { Orbit, Compass, Activity, Layers } from 'lucide-react';
import { Satellite } from '../../types';

interface TrackingInfoPanelProps {
  satellite: Satellite;
  simSeconds: number;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const TrackingInfoPanel: React.FC<TrackingInfoPanelProps> = ({
  satellite,
  simSeconds,
  isOpen,
  onToggleOpen,
}) => {
  const isDebris = satellite.category === 'DEBRIS';

  // Calculate Mean Motion (n = 1440 / periodMin rev/day)
  const meanMotionRevDay = satellite.periodMin > 0 ? (1440 / satellite.periodMin).toFixed(4) : 'N/A';

  // Calculate simulated sub-satellite coordinates dynamically as simSeconds advances
  const orbitalPeriodSec = Math.max(1, (satellite.periodMin || 94.7) * 60);
  const orbitalFraction = (simSeconds / orbitalPeriodSec) % 1;
  const incRad = (satellite.inclination * Math.PI) / 180;
  const phaseAngle = orbitalFraction * Math.PI * 2;

  // Simplified spherical astrodynamic projection
  const simLatDeg = (Math.asin(Math.sin(incRad) * Math.sin(phaseAngle)) * 180) / Math.PI;
  // Earth rotation in 24h (360 deg in 86400s -> 0.004166 deg/sec)
  const earthRotDeg = (simSeconds / 86400) * 360;
  const simLonDeg = (((phaseAngle * 180) / Math.PI - earthRotDeg + satellite.longitude + 180) % 360) - 180;

  return (
    <aside className={`tracking-info-sidebar ${!isOpen ? 'collapsed' : ''}`}>
      {/* Header with Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--space-border-subtle)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Orbit size={18} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
            ORBITAL TELEMETRY
          </span>
        </div>
        <button
          className="icon-button"
          onClick={onToggleOpen}
          style={{ fontSize: '0.75rem', padding: '2px 6px' }}
          title={isOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {isOpen ? '▶' : '◀'}
        </button>
      </div>

      {/* Target Identity */}
      <div className="tracking-info-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff' }}>{satellite.name}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              NORAD #{satellite.noradId} • {satellite.cosparId}
            </div>
          </div>
          <span
            className={`badge ${
              isDebris
                ? 'badge-critical'
                : satellite.status === 'OPERATIONAL'
                ? 'badge-operational'
                : 'badge-warning'
            }`}
          >
            {isDebris ? 'DEBRIS' : satellite.status}
          </span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {satellite.type} • {satellite.country}
        </div>
      </div>

      {/* Dynamic Simulated Coordinates */}
      <div className="tracking-info-section">
        <div className="sub-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Compass size={13} style={{ color: 'var(--accent-cyan)' }} />
          <span>Simulated Ephemeris State</span>
        </div>
        <div className="tracking-info-row">
          <span className="tracking-info-label">Sub-Latitude</span>
          <span className="tracking-info-val font-mono">
            {simLatDeg >= 0 ? `${simLatDeg.toFixed(3)}° N` : `${Math.abs(simLatDeg).toFixed(3)}° S`}
          </span>
        </div>
        <div className="tracking-info-row">
          <span className="tracking-info-label">Sub-Longitude</span>
          <span className="tracking-info-val font-mono">
            {simLonDeg >= 0 ? `${simLonDeg.toFixed(3)}° E` : `${Math.abs(simLonDeg).toFixed(3)}° W`}
          </span>
        </div>
        <div className="tracking-info-row">
          <span className="tracking-info-label">Altitude (AGL)</span>
          <span className="tracking-info-val font-mono" style={{ color: 'var(--accent-cyan)' }}>
            {satellite.altitudeKm} km
          </span>
        </div>
        <div className="tracking-info-row">
          <span className="tracking-info-label">Orbital Velocity</span>
          <span className="tracking-info-val font-mono">{satellite.velocityKmS} km/s</span>
        </div>
        <div className="tracking-info-row">
          <span className="tracking-info-label">Ground Track Rate</span>
          <span className="tracking-info-val font-mono">{satellite.groundTrackRateKmS} km/s</span>
        </div>
      </div>

      {/* Classical Keplerian Elements */}
      <div className="tracking-info-section">
        <div className="sub-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={13} style={{ color: 'var(--accent-cyan)' }} />
          <span>Keplerian Orbital Elements</span>
        </div>
        <div className="tracking-info-row">
          <span className="tracking-info-label">Inclination (i)</span>
          <span className="tracking-info-val font-mono">{satellite.inclination}°</span>
        </div>
        <div className="tracking-info-row">
          <span className="tracking-info-label">Eccentricity (e)</span>
          <span className="tracking-info-val font-mono">{satellite.eccentricity}</span>
        </div>
        <div className="tracking-info-row">
          <span className="tracking-info-label">Orbital Period (T)</span>
          <span className="tracking-info-val font-mono">{satellite.periodMin} min</span>
        </div>
        <div className="tracking-info-row">
          <span className="tracking-info-label">Mean Motion (n)</span>
          <span className="tracking-info-val font-mono">{meanMotionRevDay} rev/day</span>
        </div>
        {satellite.semiMajorAxisKm && (
          <div className="tracking-info-row">
            <span className="tracking-info-label">Semi-Major Axis (a)</span>
            <span className="tracking-info-val font-mono">{satellite.semiMajorAxisKm.toLocaleString()} km</span>
          </div>
        )}
        {satellite.apogeeKm && (
          <div className="tracking-info-row">
            <span className="tracking-info-label">Apogee / Perigee</span>
            <span className="tracking-info-val font-mono">{satellite.apogeeKm} / {satellite.perigeeKm} km</span>
          </div>
        )}
      </div>

      {/* Safety & Conjunction Banner */}
      <div className="tracking-info-section" style={{ borderLeft: `3px solid ${isDebris ? 'var(--status-critical)' : 'var(--status-operational)'}` }}>
        <div className="sub-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={13} style={{ color: isDebris ? 'var(--status-critical)' : 'var(--status-operational)' }} />
          <span>Conjunction Proximity</span>
        </div>
        {satellite.id === 'orbit-02' ? (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
            <span style={{ color: 'var(--status-critical)', fontWeight: 600 }}>Active Alert</span>: Predicted conjunction CA-101 with SL-16 Debris at 320m miss distance.
          </div>
        ) : isDebris ? (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
            <span style={{ color: 'var(--status-critical)', fontWeight: 600 }}>Debris Object</span>: Monitored for collision avoidance screening.
          </div>
        ) : (
          <div style={{ fontSize: '0.7rem', color: 'var(--status-operational)' }}>
            Trajectory nominal. No critical close encounters within 72 hours.
          </div>
        )}
      </div>

      {/* Scientific Disclaimer */}
      <div style={{ marginTop: 'auto', padding: '8px', background: 'rgba(3, 7, 18, 0.4)', borderRadius: '4px', fontSize: '0.64rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
        Note: Demonstrated orbital motion uses simplified 2-body Keplerian kinematics with Earth spin simulation. Full SGP4/SDP4 precision propagator connects via API service layer.
      </div>
    </aside>
  );
};
