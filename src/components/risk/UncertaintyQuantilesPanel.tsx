import React from 'react';
import { Gauge, AlertTriangle, HelpCircle } from 'lucide-react';
import { CloseApproach } from '../../types';

interface UncertaintyQuantilesPanelProps {
  encounter: CloseApproach;
}

export const UncertaintyQuantilesPanel: React.FC<UncertaintyQuantilesPanelProps> = ({ encounter }) => {
  const hasQuantiles =
    encounter.quantileQ10Meters !== undefined &&
    encounter.quantileQ50Meters !== undefined &&
    encounter.quantileQ90Meters !== undefined;

  const hasSigmas =
    encounter.sigmaRadialMeters !== undefined &&
    encounter.sigmaInTrackMeters !== undefined &&
    encounter.sigmaCrossTrackMeters !== undefined;

  if (!hasQuantiles && !hasSigmas) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 16px', textAlign: 'center', gap: '8px' }}>
        <AlertTriangle size={28} style={{ color: 'var(--text-muted)' }} />
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
          Uncertainty & Quantile Data Unavailable
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: 1.4 }}>
          No covariance matrix or empirical quantile predictions are currently registered for this secondary object track ({encounter.chaserObject}).
        </p>
      </div>
    );
  }

  // Calculate whisker layout percentages
  const q10 = encounter.quantileQ10Meters || 0;
  const q50 = encounter.quantileQ50Meters || 0;
  const q90 = encounter.quantileQ90Meters || 1;
  const maxRange = Math.max(q90 * 1.25, 100);

  const pQ10 = Math.min(100, (q10 / maxRange) * 100);
  const pQ50 = Math.min(100, (q50 / maxRange) * 100);
  const pQ90 = Math.min(100, (q90 / maxRange) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Positional Covariance Component Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700, color: '#ffffff' }}>
            <Gauge size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span>1-SIGMA COMPONENT UNCERTAINTIES (RIC FRAME)</span>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>
            DEMONSTRATION ESTIMATES
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div style={{ background: 'rgba(3, 7, 18, 0.55)', border: '1px solid var(--space-border)', borderRadius: '4px', padding: '8px 10px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Radial (σ_R)</span>
            <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
              ±{encounter.sigmaRadialMeters} m
            </div>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Altitude accuracy</span>
          </div>

          <div style={{ background: 'rgba(3, 7, 18, 0.55)', border: '1px solid var(--space-border)', borderRadius: '4px', padding: '8px 10px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>In-Track (σ_T)</span>
            <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--status-warning)', marginTop: '2px' }}>
              ±{encounter.sigmaInTrackMeters} m
            </div>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Along-orbit timing</span>
          </div>

          <div style={{ background: 'rgba(3, 7, 18, 0.55)', border: '1px solid var(--space-border)', borderRadius: '4px', padding: '8px 10px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Cross-Track (σ_C)</span>
            <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
              ±{encounter.sigmaCrossTrackMeters} m
            </div>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Orbital plane offset</span>
          </div>
        </div>
      </div>

      {/* 2. Quantile Error Distribution (Q10, Q50, Q90) */}
      {hasQuantiles && (
        <div className="quantile-whisker-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              EMPIRICAL QUANTILE ERROR DISTRIBUTION
            </span>
            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
              Non-parametric Spread (meters)
            </span>
          </div>

          {/* Whisker Graphic */}
          <div className="whisker-track">
            {/* Spread bar between Q10 and Q90 */}
            <div
              className="whisker-spread"
              style={{ left: `${pQ10}%`, width: `${Math.max(4, pQ90 - pQ10)}%` }}
            />

            {/* Q10 Pin */}
            <div className="whisker-pin" style={{ left: `${pQ10}%`, background: 'var(--accent-cyan)' }} />
            <div className="whisker-label" style={{ left: `${pQ10}%` }}>
              Q10: {q10}m
            </div>

            {/* Q50 Median Pin */}
            <div className="whisker-pin whisker-pin-q50" style={{ left: `${pQ50}%` }} />
            <div className="whisker-label" style={{ left: `${pQ50}%`, fontWeight: 'bold', color: '#ffffff' }}>
              Q50 (Median): {q50}m
            </div>

            {/* Q90 Pin */}
            <div className="whisker-pin" style={{ left: `${pQ90}%`, background: 'var(--status-critical)' }} />
            <div className="whisker-label" style={{ left: `${pQ90}%` }}>
              Q90: {q90}m
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '12px' }}>
            <span>0 m</span>
            <span>Scale Ceiling: {maxRange.toFixed(0)} m</span>
          </div>
        </div>
      )}

      {/* 3. Scientific Caveat / Advisory Notice */}
      <div style={{ padding: '8px 10px', background: 'rgba(3, 7, 18, 0.45)', borderLeft: '3px solid var(--status-warning)', borderRadius: '4px', fontSize: '0.67rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--status-warning)', fontWeight: 600, marginBottom: '2px' }}>
          <HelpCircle size={12} />
          <span>Scientific Uncertainty Caveat:</span>
        </div>
        The Q10–Q90 range represents an empirical error-distribution estimate from surrogate statistical models. It is <strong>NOT</strong> automatically interpreted as an operational 90% confidence interval or a complete 6×6 covariance matrix. Uncertainty values are demonstration outputs awaiting operational sensor calibration.
      </div>
    </div>
  );
};
