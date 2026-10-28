import React from 'react';
import { History, TrendingDown, AlertTriangle } from 'lucide-react';
import { CloseApproach } from '../../types';

interface CdmEvolutionHistoryPanelProps {
  encounter: CloseApproach;
}

export const CdmEvolutionHistoryPanel: React.FC<CdmEvolutionHistoryPanelProps> = ({ encounter }) => {
  const history = encounter.cdmHistory || [];

  if (history.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 16px', textAlign: 'center', gap: '8px' }}>
        <AlertTriangle size={28} style={{ color: 'var(--text-muted)' }} />
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
          No Prior CDM History Available
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: 1.4 }}>
          No previous Conjunction Data Messages (CDMs) are recorded for {encounter.chaserObject}. Only the current baseline update is tracked.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700, color: '#ffffff' }}>
          <History size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span>CDM TIME-SERIES EVOLUTION (APPROACH PROGRESSION)</span>
        </div>
        <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>
          {history.length} CDM Updates
        </span>
      </div>

      {/* Mini Visual Trend Chart (SVG) */}
      <div style={{ background: 'rgba(3, 7, 18, 0.6)', border: '1px solid var(--space-border)', borderRadius: '4px', padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingDown size={12} style={{ color: 'var(--status-critical)' }} />
            <span>Miss Distance Convergence (TCA Horizon)</span>
          </span>
          <span className="font-mono">T-72h → T-6h</span>
        </div>

        <svg viewBox="0 0 360 80" width="100%" height="80" style={{ display: 'block' }}>
          {/* Grid lines */}
          <line x1="20" y1="20" x2="340" y2="20" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="2,2" />
          <line x1="20" y1="50" x2="340" y2="50" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="2,2" />

          {/* Connect points */}
          {history.map((pt, idx) => {
            if (idx === 0) return null;
            const prev = history[idx - 1];
            const x1 = 30 + (idx - 1) * (280 / (history.length - 1));
            const y1 = 15 + (prev.missDistanceKm / 1.5) * 50;
            const x2 = 30 + idx * (280 / (history.length - 1));
            const y2 = 15 + (pt.missDistanceKm / 1.5) * 50;
            return (
              <line
                key={`line-${idx}`}
                x1={x1}
                y1={Math.min(68, y1)}
                x2={x2}
                y2={Math.min(68, y2)}
                stroke="#38bdf8"
                strokeWidth="2"
              />
            );
          })}

          {/* Dots and Labels */}
          {history.map((pt, idx) => {
            const x = 30 + idx * (280 / (history.length - 1));
            const y = Math.min(68, 15 + (pt.missDistanceKm / 1.5) * 50);
            return (
              <g key={`pt-${idx}`}>
                <circle cx={x} cy={y} r="4" fill="#00e5ff" stroke="#ffffff" strokeWidth="1" />
                <text x={x} y={y - 8} fill="#ffffff" fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
                  {pt.missDistanceKm}km
                </text>
                <text x={x} y="78" fill="var(--text-muted)" fontSize="7" fontFamily="var(--font-mono)" textAnchor="middle">
                  T-{pt.hoursBeforeTca}h
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* History Table */}
      <table className="cdm-history-table">
        <thead>
          <tr>
            <th>CDM Record</th>
            <th>Horizon</th>
            <th>Ingested (UTC)</th>
            <th>Miss Distance</th>
            <th>Collision Pc</th>
            <th>1σ Covariance</th>
          </tr>
        </thead>
        <tbody>
          {history.map((pt) => (
            <tr key={pt.cdmId}>
              <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{pt.cdmId}</td>
              <td className="font-mono">T-{pt.hoursBeforeTca}h</td>
              <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>{pt.timestampUtc}</td>
              <td className="font-mono" style={{ color: pt.missDistanceKm < 0.5 ? 'var(--status-critical)' : '#ffffff' }}>
                {pt.missDistanceKm} km
              </td>
              <td className="font-mono" style={{ color: pt.collisionProbability > 1e-4 ? 'var(--status-critical)' : 'inherit' }}>
                {pt.collisionProbability.toExponential(2)}
              </td>
              <td className="font-mono">±{(pt.sigmaPositionKm * 1000).toFixed(0)}m</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
