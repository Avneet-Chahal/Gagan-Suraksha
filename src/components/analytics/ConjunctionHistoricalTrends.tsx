import React, { useState } from 'react';
import { BarChart3, CheckCircle2 } from 'lucide-react';

export const ConjunctionHistoricalTrends: React.FC = () => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'HIGH_RISK'>('ALL');

  // Distribution buckets of miss distance for screened events
  const binsAll = [
    { label: '< 250m', count: 2, color: 'var(--status-critical)' },
    { label: '250-500m', count: 4, color: 'var(--status-critical)' },
    { label: '500m-1km', count: 7, color: 'var(--status-warning)' },
    { label: '1-2km', count: 18, color: 'var(--accent-blue)' },
    { label: '2-5km', count: 32, color: 'var(--accent-cyan)' },
    { label: '> 5km', count: 58, color: 'var(--status-operational)' },
  ];

  const binsHighRisk = [
    { label: '< 250m', count: 2, color: 'var(--status-critical)' },
    { label: '250-500m', count: 3, color: 'var(--status-critical)' },
    { label: '500m-1km', count: 2, color: 'var(--status-warning)' },
    { label: '1-2km', count: 1, color: 'var(--accent-blue)' },
    { label: '2-5km', count: 0, color: 'var(--accent-cyan)' },
    { label: '> 5km', count: 0, color: 'var(--status-operational)' },
  ];

  const currentBins = filterMode === 'ALL' ? binsAll : binsHighRisk;
  const maxCount = Math.max(...currentBins.map((b) => b.count), 1);

  return (
    <div className="chart-container-card">
      <div className="chart-header-row">
        <div className="chart-title-area">
          <BarChart3 size={16} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <div className="chart-title-text">
              Conjunction Miss-Distance Distribution & False-Alarm Reduction
            </div>
            <div className="chart-subtitle-text">
              30-day screened encounter geometry histogram with Isotonic ML calibration filter
            </div>
          </div>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className={`analytics-pill-btn ${filterMode === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterMode('ALL')}
          >
            All Encounters (121)
          </button>
          <button
            className={`analytics-pill-btn ${filterMode === 'HIGH_RISK' ? 'active' : ''}`}
            onClick={() => setFilterMode('HIGH_RISK')}
          >
            Risk Pc &gt; 1e-4 (8)
          </button>
        </div>
      </div>

      {/* Histogram Bars */}
      <div className="histogram-bars-container">
        {currentBins.map((bin) => {
          const heightPct = (bin.count / maxCount) * 100;
          return (
            <div key={bin.label} className="histogram-bar-group">
              <span className="histogram-bar-val">{bin.count}</span>
              <div
                className="histogram-bar-fill"
                style={{
                  height: `${Math.max(6, heightPct)}%`,
                  background: bin.color,
                }}
              />
              <span className="histogram-bar-label">{bin.label}</span>
            </div>
          );
        })}
      </div>

      {/* Covariance Calibration Insights */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          background: 'rgba(3, 7, 18, 0.45)',
          border: '1px solid var(--space-border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 12px',
          fontSize: '0.72rem',
        }}
      >
        <div>
          <div style={{ color: 'var(--text-muted)' }}>Raw Uncalibrated Alerts</div>
          <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--status-warning)' }}>
            23 events
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Over-conservative spherical errors</div>
        </div>

        <div>
          <div style={{ color: 'var(--text-muted)' }}>Calibrated Operational Alarms</div>
          <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--status-operational)' }}>
            8 events
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--status-operational)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <CheckCircle2 size={11} /> 65.2% false alarms eliminated
          </div>
        </div>

        <div>
          <div style={{ color: 'var(--text-muted)' }}>Propellant Saved via Calibration</div>
          <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            4.2 kg N₂H₄
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)' }}>Preserves 11 months mission life</div>
        </div>
      </div>
    </div>
  );
};
