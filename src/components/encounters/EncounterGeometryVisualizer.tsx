import React from 'react';
import { Crosshair } from 'lucide-react';
import { CloseApproach } from '../../types';

interface EncounterGeometryVisualizerProps {
  encounter: CloseApproach;
}

export const EncounterGeometryVisualizer: React.FC<EncounterGeometryVisualizerProps> = ({ encounter }) => {
  const isHighRisk = encounter.riskLevel === 'HIGH' || encounter.riskLevel === 'CRITICAL';

  // Normalize scale for visualization
  const missScale = Math.min(48, Math.max(12, encounter.missDistanceKm * 8));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <Crosshair size={13} style={{ color: 'var(--accent-cyan)' }} />
          <span>B-PLANE ENCOUNTER GEOMETRY (TCA CROSS-SECTION)</span>
        </div>
        <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>
          ILLUSTRATIVE
        </span>
      </div>

      <div className="b-plane-container">
        <svg viewBox="0 0 340 140" width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            <radialGradient id="targetHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="debrisHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grid Axes */}
          <line x1="20" y1="70" x2="320" y2="70" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" strokeDasharray="3,3" />
          <line x1="170" y1="10" x2="170" y2="130" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" strokeDasharray="3,3" />

          {/* Target Orbit Vector (Horizontal track) */}
          <line x1="40" y1="70" x2="300" y2="70" stroke="#00e5ff" strokeWidth="1.5" opacity="0.6" />
          <text x="250" y="64" fill="#00e5ff" fontSize="8" fontFamily="var(--font-mono)">
            {encounter.targetObject} Vector
          </text>

          {/* Chaser Vector (Inclined pass) */}
          <line x1="100" y1="125" x2="240" y2="15" stroke={isHighRisk ? '#ef4444' : '#f59e0b'} strokeWidth="1.5" strokeDasharray="4,2" />
          <text x="205" y="24" fill={isHighRisk ? '#ef4444' : '#f59e0b'} fontSize="8" fontFamily="var(--font-mono)">
            {encounter.chaserObject.split(' ')[0]} Vector
          </text>

          {/* 3-Sigma Combined Error Ellipse */}
          <ellipse
            cx="170"
            cy="70"
            rx="42"
            ry="24"
            fill="none"
            stroke={isHighRisk ? 'rgba(239, 68, 68, 0.45)' : 'rgba(56, 189, 248, 0.35)'}
            strokeWidth="1.2"
            strokeDasharray="2,2"
            transform="rotate(-25 170 70)"
          />
          <text x="180" y="98" fill="rgba(255, 255, 255, 0.4)" fontSize="7" fontFamily="var(--font-mono)">
            3σ Covariance Ellipse
          </text>

          {/* Target Position (Center) */}
          <circle cx="170" cy="70" r="14" fill="url(#targetHalo)" />
          <circle cx="170" cy="70" r="4.5" fill="#00e5ff" />
          <text x="178" y="74" fill="#ffffff" fontSize="9" fontWeight="bold">
            {encounter.targetObject}
          </text>

          {/* Chaser Position at TCA */}
          <circle cx={170 + missScale} cy={70 - missScale * 0.45} r="14" fill="url(#debrisHalo)" />
          <circle cx={170 + missScale} cy={70 - missScale * 0.45} r="4" fill={isHighRisk ? '#ef4444' : '#f59e0b'} />
          <text x={170 + missScale + 6} y={70 - missScale * 0.45 + 3} fill={isHighRisk ? '#ef4444' : '#f59e0b'} fontSize="8" fontWeight="bold">
            TCA Point
          </text>

          {/* Miss Distance Vector Line */}
          <line
            x1="170"
            y1="70"
            x2={170 + missScale}
            y2={70 - missScale * 0.45}
            stroke="#ffffff"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: 'var(--text-muted)' }}>
        <span>Approach Angle: <strong className="font-mono" style={{ color: '#fff' }}>{encounter.encounterAngleDeg || 78.5}°</strong></span>
        <span>Miss Vector: <strong className="font-mono" style={{ color: isHighRisk ? 'var(--status-critical)' : 'var(--accent-cyan)' }}>{encounter.missDistanceKm} km</strong></span>
      </div>
    </div>
  );
};
