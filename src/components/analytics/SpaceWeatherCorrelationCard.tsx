import React, { useState } from 'react';
import { Sun, Wind, Activity, Zap, Flame } from 'lucide-react';

export const SpaceWeatherCorrelationCard: React.FC = () => {
  const [isSimulatingStorm, setIsSimulatingStorm] = useState(false);

  // Dynamic parameters based on geomagnetic storm simulation toggle
  const kp = isSimulatingStorm ? 6.7 : 2.3;
  const f107 = isSimulatingStorm ? 228.0 : 142.5;
  const solarWind = isSimulatingStorm ? 680.0 : 412.0;
  const densityMultiplier = isSimulatingStorm ? 2.85 : 1.04;
  const decayRate = isSimulatingStorm ? -38.6 : -11.2;

  return (
    <div className="chart-container-card">
      <div className="chart-header-row">
        <div className="chart-title-area">
          <Sun size={16} style={{ color: isSimulatingStorm ? 'var(--status-critical)' : 'var(--status-warning)' }} />
          <div>
            <div className="chart-title-text">
              Space Weather & Thermospheric Drag Correlation
            </div>
            <div className="chart-subtitle-text">
              NOAA Space Weather Prediction Center (SWPC) real-time feed & Jacchia-Bowman drag perturber
            </div>
          </div>
        </div>

        <button
          className="btn-aerospace"
          onClick={() => setIsSimulatingStorm(!isSimulatingStorm)}
          style={{
            padding: '3px 10px',
            fontSize: '0.7rem',
            background: isSimulatingStorm ? 'rgba(239, 68, 68, 0.2)' : undefined,
            borderColor: isSimulatingStorm ? 'var(--status-critical)' : undefined,
            color: isSimulatingStorm ? 'var(--status-critical)' : undefined,
          }}
        >
          <Flame size={12} />
          <span>{isSimulatingStorm ? 'Reset to Nominal Feed' : 'Simulate Solar Storm (Kp 6.7)'}</span>
        </button>
      </div>

      {/* Grid of Weather Telemetry */}
      <div className="weather-correlation-grid">
        {/* Metric 1: Solar Flux F10.7 */}
        <div className="weather-metric-tile">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Solar Radio Flux (F10.7)</span>
            <Sun size={13} style={{ color: 'var(--status-warning)' }} />
          </div>
          <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
            {f107.toFixed(1)} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>sfu</span>
          </div>
          <span style={{ fontSize: '0.68rem', color: isSimulatingStorm ? 'var(--status-critical)' : 'var(--accent-cyan)' }}>
            {isSimulatingStorm ? 'Solar Cycle 25 High Flare Activity' : 'Moderate Solar Cycle 25 Phase'}
          </span>
        </div>

        {/* Metric 2: Planetary K-Index */}
        <div className="weather-metric-tile">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Planetary K-Index (Kp)</span>
            <Activity size={13} style={{ color: isSimulatingStorm ? 'var(--status-critical)' : 'var(--status-operational)' }} />
          </div>
          <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: isSimulatingStorm ? 'var(--status-critical)' : 'var(--status-operational)' }}>
            {kp.toFixed(1)} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({isSimulatingStorm ? 'G3 Strong Storm' : 'Quiet'})</span>
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Pottsdam Geomagnetic Index Station
          </span>
        </div>

        {/* Metric 3: Solar Wind Speed */}
        <div className="weather-metric-tile">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Solar Wind Plasma Velocity</span>
            <Wind size={13} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
            {solarWind.toFixed(0)} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>km/s</span>
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            DSCOVR satellite L1 Lagrange point
          </span>
        </div>

        {/* Metric 4: Density Perturbation Multiplier */}
        <div className="weather-metric-tile">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Atmospheric Density Scaling (ρ/ρ₀)</span>
            <Zap size={13} style={{ color: isSimulatingStorm ? 'var(--status-critical)' : 'var(--accent-cyan)' }} />
          </div>
          <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: isSimulatingStorm ? 'var(--status-critical)' : '#38bdf8' }}>
            {densityMultiplier.toFixed(2)}x
          </div>
          <span style={{ fontSize: '0.68rem', color: isSimulatingStorm ? 'var(--status-critical)' : 'var(--status-operational)' }}>
            {isSimulatingStorm ? 'Thermospheric ballooning expands drag' : 'Nominal drag coefficient applied'}
          </span>
        </div>
      </div>

      {/* Ephemeris Impact Analysis Box */}
      <div
        style={{
          background: 'rgba(3, 7, 18, 0.65)',
          border: `1px solid ${isSimulatingStorm ? 'var(--status-critical)' : 'var(--space-border-subtle)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          fontSize: '0.72rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Orbital Altitude Loss Rate (Cartosat-3 LEO):</span>
          <span className="font-mono" style={{ color: isSimulatingStorm ? 'var(--status-critical)' : 'var(--status-operational)', fontWeight: 700 }}>
            {decayRate.toFixed(1)} m / day
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Conjunction Screening Covariance Inflation:</span>
          <span className="font-mono" style={{ color: isSimulatingStorm ? 'var(--status-critical)' : 'var(--accent-cyan)' }}>
            {isSimulatingStorm ? '+185% along-track 3σ sigma' : 'Nominal ±45m bubble'}
          </span>
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', borderTop: '1px solid var(--space-border-subtle)', paddingTop: '4px', marginTop: '2px' }}>
          {isSimulatingStorm
            ? '⚠️ Notice: Geomagnetic storm requires recalculating SGP4 B* ballistic coefficients for all close approaches.'
            : 'Operational Note: Space weather perturbation within nominal 0.05% SGP4 analytical tolerances.'}
        </div>
      </div>
    </div>
  );
};
