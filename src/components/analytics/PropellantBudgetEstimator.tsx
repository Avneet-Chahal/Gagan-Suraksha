import React from 'react';
import { Fuel, ShieldCheck } from 'lucide-react';

export const PropellantBudgetEstimator: React.FC = () => {
  const initialPropellantKg = 65;
  const currentPropellantKg = 53.56;
  const deorbitReservedKg = 18.0; // Mandated reserve for controlled re-entry
  const usableCamPropellantKg = currentPropellantKg - deorbitReservedKg;

  const currentPct = (currentPropellantKg / initialPropellantKg) * 100;
  const deorbitPct = (deorbitReservedKg / initialPropellantKg) * 100;
  const usablePct = (usableCamPropellantKg / initialPropellantKg) * 100;

  // Average CAM delta-v = 0.45 m/s consumes ~0.18 kg hydrazine
  const estimatedRemainingCams = Math.floor(usableCamPropellantKg / 0.18);

  return (
    <div className="chart-container-card">
      <div className="chart-header-row">
        <div className="chart-title-area">
          <Fuel size={16} style={{ color: 'var(--status-operational)' }} />
          <div>
            <div className="chart-title-text">
              Propellant Budget & Collision Avoidance Longevity
            </div>
            <div className="chart-subtitle-text">
              Tsiolkovsky delta-v reserve tracking, monopropellant hydrazine (Isp 220s) & ISO 24113 EOL compliance
            </div>
          </div>
        </div>

        <span className="badge badge-operational">
          <ShieldCheck size={12} style={{ marginRight: '3px' }} />
          NOMINAL RESERVES (82.4%)
        </span>
      </div>

      {/* Propellant Visual Track Gauge */}
      <div className="propellant-budget-gauge">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Usable CAM Propellant: </span>
            <strong className="font-mono" style={{ color: '#00e5ff' }}>{usableCamPropellantKg.toFixed(1)} kg</strong>
            <span style={{ color: 'var(--text-muted)' }}> ({usablePct.toFixed(1)}%)</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>EOL De-orbit Mandate: </span>
            <strong className="font-mono" style={{ color: 'var(--status-critical)' }}>{deorbitReservedKg.toFixed(1)} kg</strong>
            <span style={{ color: 'var(--text-muted)' }}> ({deorbitPct.toFixed(1)}%)</span>
          </div>
        </div>

        <div className="propellant-track">
          <div
            className="propellant-fill-active"
            style={{ width: `${currentPct}%` }}
          />
          <div
            className="propellant-fill-reserved"
            style={{ width: `${deorbitPct}%` }}
            title="Reserved for 25-year de-orbit compliance"
          />
        </div>
      </div>

      {/* Propellant Stat Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          background: 'rgba(3, 7, 18, 0.45)',
          border: '1px solid var(--space-border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 12px',
          fontSize: '0.72rem',
        }}
      >
        <div>
          <div style={{ color: 'var(--text-muted)' }}>Remaining Δv Budget</div>
          <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--status-operational)' }}>
            142.8 m/s
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Across 4x 1N thrusters</div>
        </div>

        <div>
          <div style={{ color: 'var(--text-muted)' }}>Estimated CAM Reserve</div>
          <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            ~{estimatedRemainingCams} burns
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)' }}>At standard 0.45 m/s impulse</div>
        </div>

        <div>
          <div style={{ color: 'var(--text-muted)' }}>Expended Δv to Date</div>
          <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
            4.12 m/s
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>9 collision avoidance burns</div>
        </div>

        <div>
          <div style={{ color: 'var(--text-muted)' }}>Projected Mission Life</div>
          <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--status-operational)' }}>
            6.8 Years
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--status-operational)' }}>Exceeds 5-year target</div>
        </div>
      </div>
    </div>
  );
};
