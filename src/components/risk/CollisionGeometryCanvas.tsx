import React, { useState } from 'react';
import { Crosshair, Eye, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { CloseApproach } from '../../types';

interface CollisionGeometryCanvasProps {
  encounter: CloseApproach;
}

export const CollisionGeometryCanvas: React.FC<CollisionGeometryCanvasProps> = ({ encounter }) => {
  const [zoom, setZoom] = useState<number>(1);
  const [showEllipses, setShowEllipses] = useState<boolean>(true);
  const [showHbr, setShowHbr] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);

  const isHighRisk = encounter.riskLevel === 'HIGH' || encounter.riskLevel === 'CRITICAL';
  const hbrMeters = encounter.hbrMeters || 15;

  // Center coordinate of SVG canvas (viewBox 600x420)
  const cx = 300;
  const cy = 210;

  // Dynamic scaling based on miss distance and zoom
  // Target is at center (cx, cy)
  // Chaser passes near center
  const scale = (65 / Math.max(0.2, encounter.missDistanceKm)) * zoom;
  const clampedScale = Math.min(180, Math.max(30, scale));

  // Offset coordinates for Chaser at TCA
  // Using radial distance as X component and in-track / cross-track for Y
  const dx = encounter.radialDistanceKm * clampedScale;
  const dy = -encounter.crossTrackDistanceKm * clampedScale * 0.8;

  // Hard Body Radius representation (pixels)
  const hbrRadiusPx = Math.max(8, (hbrMeters / 1000) * clampedScale * 4);

  // Covariance ellipse radii (pixels)
  const sigma1RadiusX = Math.max(25, (encounter.sigmaRadialMeters || 45) * 0.45 * zoom);
  const sigma1RadiusY = Math.max(16, (encounter.sigmaCrossTrackMeters || 24) * 0.45 * zoom);
  const sigma3RadiusX = sigma1RadiusX * 3;
  const sigma3RadiusY = sigma1RadiusY * 3;

  return (
    <div className="bplane-canvas-container">
      {/* 1. Header */}
      <div className="bplane-canvas-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Crosshair size={16} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em' }}>
            B-PLANE ENCOUNTER GEOMETRY & COLLISION REGION
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
            ILLUSTRATIVE ENCOUNTER-PLANE MODEL
          </span>
        </div>
      </div>

      {/* 2. Interactive Controls Strip */}
      <div className="bplane-controls-strip">
        <span style={{ color: 'var(--text-muted)' }}>Layer Toggles:</span>
        <button
          className={`bplane-toggle-btn ${showEllipses ? 'active' : ''}`}
          onClick={() => setShowEllipses(!showEllipses)}
        >
          <Eye size={12} />
          <span>1σ / 3σ Covariance</span>
        </button>

        <button
          className={`bplane-toggle-btn ${showHbr ? 'active' : ''}`}
          onClick={() => setShowHbr(!showHbr)}
        >
          <Eye size={12} />
          <span>Hard-Body Radius ({hbrMeters}m)</span>
        </button>

        <button
          className={`bplane-toggle-btn ${showVectors ? 'active' : ''}`}
          onClick={() => setShowVectors(!showVectors)}
        >
          <Eye size={12} />
          <span>RIC Projections</span>
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Zoom:</span>
          <button
            className="bplane-toggle-btn"
            onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
            title="Zoom In"
          >
            <ZoomIn size={12} />
          </button>
          <span className="font-mono" style={{ fontSize: '0.7rem', color: '#fff' }}>{zoom.toFixed(1)}x</span>
          <button
            className="bplane-toggle-btn"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))}
            title="Zoom Out"
          >
            <ZoomOut size={12} />
          </button>
          <button
            className="bplane-toggle-btn"
            onClick={() => setZoom(1)}
            title="Reset Zoom"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* 3. SVG Visualization Area */}
      <div style={{ flex: 1, position: 'relative', minHeight: '340px' }}>
        <svg viewBox="0 0 600 380" width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="chaserGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isHighRisk ? '#ef4444' : '#f59e0b'} stopOpacity="0.5" />
              <stop offset="100%" stopColor={isHighRisk ? '#ef4444' : '#f59e0b'} stopOpacity="0" />
            </radialGradient>
            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width="600" height="380" fill="url(#gridPattern)" />

          {/* Coordinate Axes in B-Plane (Radial vs Cross-Track) */}
          <line x1="40" y1={cy} x2="560" y2={cy} stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1" strokeDasharray="4,4" />
          <line x1={cx} y1="20" x2={cx} y2="360" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1" strokeDasharray="4,4" />
          <text x="540" y={cy - 6} fill="rgba(56, 189, 248, 0.6)" fontSize="9" fontFamily="var(--font-mono)">
            +Radial (ΔR)
          </text>
          <text x={cx + 6} y="32" fill="rgba(56, 189, 248, 0.6)" fontSize="9" fontFamily="var(--font-mono)">
            +Cross-Track (ΔC)
          </text>

          {/* 3-Sigma Covariance Ellipse */}
          {showEllipses && (
            <g transform={`rotate(-22 ${cx + dx} ${cy + dy})`}>
              <ellipse
                cx={cx + dx}
                cy={cy + dy}
                rx={sigma3RadiusX}
                ry={sigma3RadiusY}
                fill={isHighRisk ? 'rgba(239, 68, 68, 0.06)' : 'rgba(245, 158, 11, 0.05)'}
                stroke={isHighRisk ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.35)'}
                strokeWidth="1.2"
                strokeDasharray="4,3"
              />
              <text
                x={cx + dx + sigma3RadiusX * 0.7}
                y={cy + dy - sigma3RadiusY * 0.7}
                fill={isHighRisk ? 'rgba(239, 68, 68, 0.6)' : 'rgba(245, 158, 11, 0.6)'}
                fontSize="8"
                fontFamily="var(--font-mono)"
              >
                3σ Covariance
              </text>

              {/* 1-Sigma Covariance Ellipse */}
              <ellipse
                cx={cx + dx}
                cy={cy + dy}
                rx={sigma1RadiusX}
                ry={sigma1RadiusY}
                fill={isHighRisk ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.12)'}
                stroke={isHighRisk ? '#ef4444' : 'var(--accent-cyan)'}
                strokeWidth="1.5"
              />
              <text
                x={cx + dx - sigma1RadiusX * 0.9}
                y={cy + dy + sigma1RadiusY + 12}
                fill="#ffffff"
                fontSize="8"
                fontFamily="var(--font-mono)"
              >
                1σ Positional Error
              </text>
            </g>
          )}

          {/* Hard-Body Radius Collision Boundary at Target Center */}
          {showHbr && (
            <g>
              <circle
                cx={cx}
                cy={cy}
                r={hbrRadiusPx}
                fill="rgba(239, 68, 68, 0.18)"
                stroke="var(--status-critical)"
                strokeWidth="1.5"
                strokeDasharray="2,2"
              />
              <text x={cx - hbrRadiusPx - 4} y={cy - hbrRadiusPx - 4} fill="var(--status-critical)" fontSize="8" fontFamily="var(--font-mono)" textAnchor="end">
                Hard-Body Boundary ({hbrMeters}m)
              </text>
            </g>
          )}

          {/* RIC Vector Projections */}
          {showVectors && (
            <g>
              {/* Radial component */}
              <line x1={cx} y1={cy} x2={cx + dx} y2={cy} stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
              {/* Cross-track component */}
              <line x1={cx + dx} y1={cy} x2={cx + dx} y2={cy + dy} stroke="#a855f7" strokeWidth="1" strokeDasharray="2,2" />
              {/* Total Miss Distance Vector */}
              <line x1={cx} y1={cy} x2={cx + dx} y2={cy + dy} stroke="#ffffff" strokeWidth="1.8" />
              <text
                x={(cx + cx + dx) / 2 - 10}
                y={(cy + cy + dy) / 2 - 8}
                fill="#ffffff"
                fontSize="9"
                fontWeight="bold"
                fontFamily="var(--font-mono)"
              >
                Miss: {encounter.missDistanceKm} km
              </text>
            </g>
          )}

          {/* Primary Asset Marker at Center */}
          <circle cx={cx} cy={cy} r="22" fill="url(#targetGlow)" />
          <circle cx={cx} cy={cy} r="5" fill="#00e5ff" />
          <circle cx={cx} cy={cy} r="7" fill="none" stroke="#ffffff" strokeWidth="1" />
          <text x={cx} y={cy + 18} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
            {encounter.targetObject}
          </text>
          <text x={cx} y={cy + 28} fill="var(--text-muted)" fontSize="7" fontFamily="var(--font-mono)" textAnchor="middle">
            NORAD #{encounter.targetNoradId}
          </text>

          {/* Chaser / Debris Object Marker at TCA Point */}
          <circle cx={cx + dx} cy={cy + dy} r="22" fill="url(#chaserGlow)" />
          <circle cx={cx + dx} cy={cy + dy} r="5" fill={isHighRisk ? '#ef4444' : '#f59e0b'} />
          <text
            x={cx + dx}
            y={cy + dy - 10}
            fill={isHighRisk ? '#ef4444' : '#f59e0b'}
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            {encounter.chaserObject.split(' ')[0]} (TCA)
          </text>
          <text
            x={cx + dx}
            y={cy + dy + 18}
            fill="var(--text-secondary)"
            fontSize="7"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
          >
            v_rel: {encounter.relativeVelocityKmS} km/s
          </text>
        </svg>
      </div>

      {/* 4. Legend */}
      <div className="bplane-legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#00e5ff' }}></div>
          <span>Primary Target (Center)</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: isHighRisk ? '#ef4444' : '#f59e0b' }}></div>
          <span>Chaser TCA Point</span>
        </div>
        <div className="legend-item">
          <div className="legend-line" style={{ background: '#ffffff' }}></div>
          <span>Total Miss Vector</span>
        </div>
        <div className="legend-item">
          <div className="legend-line" style={{ background: isHighRisk ? '#ef4444' : 'var(--accent-cyan)' }}></div>
          <span>1σ Error Ellipse</span>
        </div>
        <div className="legend-item">
          <div className="legend-line" style={{ background: 'var(--status-critical)', borderBottom: '1px dashed red' }}></div>
          <span>Combined Hard-Body Radius</span>
        </div>
      </div>
    </div>
  );
};
