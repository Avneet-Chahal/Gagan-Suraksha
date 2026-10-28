import React from 'react';
import { X, Sun, ShieldAlert, Database, Flame, CheckCircle, Radio } from 'lucide-react';
import { DEMO_SPACE_WEATHER, DEMO_MANEUVER_RECOMMENDATIONS } from '../../data/mockData';

interface DashboardModalProps {
  type: 'weather' | 'risk' | 'sources' | null;
  onClose: () => void;
}

export const SpaceWeatherAndRiskModal: React.FC<DashboardModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="mission-card"
        style={{
          width: '100%',
          maxWidth: '650px',
          background: 'rgba(11, 19, 41, 0.95)',
          border: '1px solid var(--accent-cyan)',
          boxShadow: 'var(--shadow-glow-cyan)',
          padding: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--space-border-subtle)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {type === 'weather' && <Sun size={20} style={{ color: 'var(--status-warning)' }} />}
            {type === 'risk' && <ShieldAlert size={20} style={{ color: 'var(--status-critical)' }} />}
            {type === 'sources' && <Database size={20} style={{ color: 'var(--accent-cyan)' }} />}
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              {type === 'weather' && 'Space Weather & Thermospheric Density Analysis'}
              {type === 'risk' && 'Collision Risk & Maneuver Recommendation'}
              {type === 'sources' && 'Telemetry & Astrodynamics Data Source Status'}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* 1. Space Weather Content */}
        {type === 'weather' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.78rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(3, 7, 18, 0.6)', padding: '12px', borderRadius: '6px', border: '1px solid var(--space-border-subtle)' }}>
                <div style={{ color: 'var(--text-muted)' }}>Planetary K-Index (Kp)</div>
                <div className="font-mono" style={{ fontSize: '1.3rem', color: 'var(--status-operational)', fontWeight: 700, marginTop: '4px' }}>
                  {DEMO_SPACE_WEATHER.kpIndex} (Quiet)
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>No geomagnetic storm threat to LEO assets</div>
              </div>

              <div style={{ background: 'rgba(3, 7, 18, 0.6)', padding: '12px', borderRadius: '6px', border: '1px solid var(--space-border-subtle)' }}>
                <div style={{ color: 'var(--text-muted)' }}>Solar Radio Flux F10.7</div>
                <div className="font-mono" style={{ fontSize: '1.3rem', color: 'var(--accent-cyan)', fontWeight: 700, marginTop: '4px' }}>
                  {DEMO_SPACE_WEATHER.solarFluxF107} sfu
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>Atmospheric drag perturbation model updated</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(3, 7, 18, 0.4)', padding: '12px', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Solar Wind Velocity:</span>
                <span className="font-mono">{DEMO_SPACE_WEATHER.solarWindSpeedKmS} km/s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Geomagnetic Activity Alert:</span>
                <span className="badge badge-operational">{DEMO_SPACE_WEATHER.geomagneticStormAlert}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Atmospheric Density Drag:</span>
                <span className="badge badge-operational">{DEMO_SPACE_WEATHER.atmosphericDensityDrag}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Last Ephemeris Calibration:</span>
                <span className="font-mono">{DEMO_SPACE_WEATHER.lastUpdatedUtc}</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Collision Risk & Maneuver Recommendation Content */}
        {type === 'risk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.78rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '12px', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--status-critical)', fontWeight: 700 }}>
                    CONJUNCTION ALERT: CA-101
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                    ORBIT-02 vs SL-16 DEBRIS (CZ-4C R/B)
                  </div>
                </div>
                <span className="badge badge-critical">Pc: 3.42 × 10⁻⁴</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '0.74rem' }}>
                <div>Miss Distance: <strong className="font-mono" style={{ color: '#fff' }}>0.32 km (320 m)</strong></div>
                <div>Relative Velocity: <strong className="font-mono" style={{ color: '#fff' }}>14.82 km/s</strong></div>
                <div>TCA: <strong className="font-mono" style={{ color: '#fff' }}>14:18:22 UTC</strong></div>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={16} /> Recommended Collision Avoidance Maneuver (CAM-01)
            </div>

            <div style={{ background: 'rgba(3, 7, 18, 0.6)', padding: '12px', borderRadius: '6px', border: '1px solid var(--space-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Maneuver Strategy:</span>
                <span style={{ fontWeight: 600, color: '#fff' }}>{DEMO_MANEUVER_RECOMMENDATIONS[0].burnDirection} RETROGRADE IN-TRACK</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Velocity Increment (ΔV):</span>
                <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{DEMO_MANEUVER_RECOMMENDATIONS[0].deltaVMs} m/s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Hydrazine Propellant Required:</span>
                <span className="font-mono">{DEMO_MANEUVER_RECOMMENDATIONS[0].fuelMassCostKg} kg</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Post-CAM Miss Distance:</span>
                <span className="font-mono" style={{ color: 'var(--status-operational)', fontWeight: 600 }}>{DEMO_MANEUVER_RECOMMENDATIONS[0].postManeuverMissDistanceKm} km</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Post-CAM Collision Probability:</span>
                <span className="font-mono" style={{ color: 'var(--status-operational)' }}>1.0 × 10⁻⁷ (SAFE)</span>
              </div>
            </div>

            <button className="btn-aerospace btn-primary" style={{ justifyContent: 'center' }} onClick={onClose}>
              Acknowledge & Proceed to Maneuver Planner
            </button>
          </div>
        )}

        {/* 3. Data Sources Status Content */}
        {type === 'sources' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(3, 7, 18, 0.6)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={16} style={{ color: 'var(--accent-cyan)' }} />
                <span>Ground Station Hartebeesthoek (HBK)</span>
              </div>
              <span className="badge badge-operational">S-BAND LOCKED</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(3, 7, 18, 0.6)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: 'var(--status-operational)' }} />
                <span>Space-Track.org Astrodynamics Catalog</span>
              </div>
              <span className="badge badge-operational">SYNCHRONIZED</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(3, 7, 18, 0.6)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: 'var(--status-operational)' }} />
                <span>CelesTrak Supplemental TLE Engine</span>
              </div>
              <span className="badge badge-operational">ONLINE</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(3, 7, 18, 0.6)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: 'var(--status-operational)' }} />
                <span>NOAA SWPC Space Weather Feed</span>
              </div>
              <span className="badge badge-operational">ONLINE</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
