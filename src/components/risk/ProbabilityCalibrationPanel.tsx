import React from 'react';
import { Sliders, Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CloseApproach } from '../../types';

interface ProbabilityCalibrationPanelProps {
  encounter: CloseApproach;
}

export const ProbabilityCalibrationPanel: React.FC<ProbabilityCalibrationPanelProps> = ({ encounter }) => {
  const rawPc = encounter.rawCollisionProbability;
  const calPc = encounter.calibratedCollisionProbability;
  const method = encounter.calibrationMethod || 'Uncalibrated';
  const isHeldOutEvaluated = encounter.calibrationEvaluatedOnHeldOut || false;

  const hasProbabilities = rawPc !== undefined && calPc !== undefined;

  if (!hasProbabilities) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 16px', textAlign: 'center', gap: '8px' }}>
        <AlertCircle size={28} style={{ color: 'var(--text-muted)' }} />
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
          Probability Calibration Unavailable
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: 1.4 }}>
          No probability calibration model or raw Pc data is available for this encounter record.
        </p>
      </div>
    );
  }

  // Calculate shift delta
  const delta = calPc - rawPc;
  const deltaPct = ((delta / rawPc) * 100).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Header with Method Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700, color: '#ffffff' }}>
          <Sliders size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span>PROBABILITY CALIBRATION ANALYSIS</span>
        </div>
        <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>
          {method}
        </span>
      </div>

      {/* 2. Side-by-Side Raw vs Calibrated Comparison Cards */}
      <div className="calibration-comparison-grid">
        {/* Raw Pc Card */}
        <div className="calibration-card">
          <span className="calibration-card-title">Raw Collision Probability</span>
          <div className="calibration-card-val font-mono" style={{ color: rawPc > 1e-4 ? 'var(--status-critical)' : '#ffffff' }}>
            {rawPc.toExponential(2)}
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Computed via 2D Foster Hard-Body Integration over relative covariance ellipse.
          </div>
        </div>

        {/* Calibrated Pc Card */}
        <div className="calibration-card" style={{ borderLeft: '2px solid var(--accent-cyan)' }}>
          <span className="calibration-card-title">Calibrated Probability</span>
          <div className="calibration-card-val font-mono" style={{ color: 'var(--accent-cyan)' }}>
            {calPc.toExponential(2)}
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Empirical monotonic mapping: <strong>{deltaPct}%</strong> shift relative to raw estimate.
          </div>
        </div>
      </div>

      {/* 3. Provenance & Validation Metadata */}
      <div style={{ background: 'rgba(3, 7, 18, 0.55)', border: '1px solid var(--space-border)', borderRadius: '4px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.7rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Data Provenance:</span>
          <span className="font-mono" style={{ color: '#ffffff' }}>{encounter.dataSource || 'Space-Track CDM'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>CDM Ingestion Timestamp:</span>
          <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{encounter.lastUpdatedUtc || '2025-04-27 08:00 UTC'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>Held-Out Test Validation:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isHeldOutEvaluated ? 'var(--status-operational)' : 'var(--text-secondary)' }}>
            {isHeldOutEvaluated ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {isHeldOutEvaluated ? 'Validated on Held-Out Set' : 'Demonstration / Not Yet Validated on Held-Out Data'}
          </span>
        </div>
      </div>

      {/* 4. Astrodynamics Caution Banner */}
      <div style={{ padding: '8px 10px', background: 'rgba(3, 7, 18, 0.45)', borderLeft: '3px solid var(--accent-cyan)', borderRadius: '4px', fontSize: '0.67rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
        <strong>Calibration Method Disclaimer:</strong> Isotonic regression outputs are presented for analytical comparison. Calibrated values are not claimed to improve operational flight safety unless thoroughly evaluated on appropriate held-out space surveillance datasets. Universal threshold guarantees are not assumed; mission decisions must integrate operator flight-dynamics rules.
      </div>

      {/* 5. Data Source Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.67rem', color: 'var(--text-muted)' }}>
        <Database size={13} style={{ color: 'var(--accent-cyan)' }} />
        <span>Algorithm: Foster 1992 (Raw) • Non-parametric Isotonic Regression (Calibrated)</span>
      </div>
    </div>
  );
};
