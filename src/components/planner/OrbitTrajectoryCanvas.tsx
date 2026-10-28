import React, { useState } from 'react';
import { Orbit, Eye, Layers } from 'lucide-react';
import { ManeuverRecommendation, CloseApproach } from '../../types';

interface OrbitTrajectoryCanvasProps {
  conjunction: CloseApproach;
  maneuver: ManeuverRecommendation;
  currentDeltaV: number;
}

export const OrbitTrajectoryCanvas: React.FC<OrbitTrajectoryCanvasProps> = ({
  conjunction,
  maneuver,
  currentDeltaV,
}) => {
  const [viewMode, setViewMode] = useState<'orbital' | 'bplane'>('orbital');
  const [showNominal, setShowNominal] = useState<boolean>(true);
  const [showManeuver, setShowManeuver] = useState<boolean>(true);
  const [showThrustVector, setShowThrustVector] = useState<boolean>(true);

  // Trajectory canvas center
  const cx = 320;
  const cy = 200;

  // Scale of orbit ellipse (nominal)
  const nominalRx = 190;
  const nominalRy = 115;

  // Perturbed orbit based on delta-v and burn direction
  // Retrograde lowers orbit near encounter; Posigrade raises it; Radial alters tilt
  const deltaFactor = currentDeltaV / 0.45; // normalized to 0.45 m/s
  let perturbedRy = nominalRy;
  let perturbedRotation = -18;
  let thrustVectorAngle = 0;

  if (maneuver.burnDirection === 'RETROGRADE') {
    perturbedRy = nominalRy - 16 * deltaFactor;
    thrustVectorAngle = 180; // against velocity
  } else if (maneuver.burnDirection === 'POSIGRADE') {
    perturbedRy = nominalRy + 18 * deltaFactor;
    thrustVectorAngle = 0; // with velocity
  } else if (maneuver.burnDirection === 'RADIAL_OUT') {
    perturbedRotation = -18 + 14 * deltaFactor;
    thrustVectorAngle = 90; // radial outward
  } else if (maneuver.burnDirection === 'CROSS_TRACK') {
    perturbedRy = nominalRy - 6 * deltaFactor;
    thrustVectorAngle = 270;
  }

  // Impulse burn point location along the orbit (T-half orbit, ~200 degrees)
  const burnAngleRad = (210 * Math.PI) / 180;
  const burnX = cx + nominalRx * Math.cos(burnAngleRad);
  const burnY = cy + nominalRy * Math.sin(burnAngleRad);

  // Encounter point (TCA) along nominal orbit (~30 degrees)
  const encAngleRad = (30 * Math.PI) / 180;
  const tcaNominalX = cx + nominalRx * Math.cos(encAngleRad);
  const tcaNominalY = cy + nominalRy * Math.sin(encAngleRad);

  // Cleared post-maneuver point at TCA
  const tcaManeuverX = cx + nominalRx * Math.cos(encAngleRad);
  const tcaManeuverY = cy + perturbedRy * Math.sin(encAngleRad);

  return (
    <div className="trajectory-canvas-card">
      {/* 1. Header with View Toggle */}
      <div className="trajectory-canvas-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Orbit size={16} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em' }}>
            ORBITAL TRAJECTORY PROPAGATION & CAM DEFLECTION
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'rgba(3, 7, 18, 0.7)', borderRadius: '4px', border: '1px solid var(--space-border)', padding: '2px' }}>
            <button
              className={`bplane-toggle-btn ${viewMode === 'orbital' ? 'active' : ''}`}
              onClick={() => setViewMode('orbital')}
              style={{ padding: '3px 8px', fontSize: '0.67rem' }}
            >
              <Orbit size={12} />
              <span>Orbital View</span>
            </button>
            <button
              className={`bplane-toggle-btn ${viewMode === 'bplane' ? 'active' : ''}`}
              onClick={() => setViewMode('bplane')}
              style={{ padding: '3px 8px', fontSize: '0.67rem' }}
            >
              <Layers size={12} />
              <span>B-Plane Miss Shift</span>
            </button>
          </div>

          <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>
            DETERMINISTIC SIMULATION
          </span>
        </div>
      </div>

      {/* 2. Layer Toggle Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(3, 7, 18, 0.55)', borderBottom: '1px solid var(--space-border-subtle)', fontSize: '0.7rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>Display Layers:</span>
        <button
          className={`bplane-toggle-btn ${showNominal ? 'active' : ''}`}
          onClick={() => setShowNominal(!showNominal)}
        >
          <Eye size={12} />
          <span>Nominal Orbit</span>
        </button>
        <button
          className={`bplane-toggle-btn ${showManeuver ? 'active' : ''}`}
          onClick={() => setShowManeuver(!showManeuver)}
        >
          <Eye size={12} />
          <span>Post-CAM Trajectory</span>
        </button>
        <button
          className={`bplane-toggle-btn ${showThrustVector ? 'active' : ''}`}
          onClick={() => setShowThrustVector(!showThrustVector)}
        >
          <Eye size={12} />
          <span>Thrust Vector (Δv)</span>
        </button>
      </div>

      {/* 3. SVG Trajectory Canvas */}
      <div style={{ flex: 1, minHeight: '340px', position: 'relative' }}>
        {viewMode === 'orbital' ? (
          <svg viewBox="0 0 640 400" width="100%" height="100%" style={{ display: 'block' }}>
            <defs>
              <radialGradient id="earthGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#0369a1" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#082f49" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="burnFlameGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Earth Center Sphere */}
            <circle cx={cx} cy={cy} r="65" fill="#0c4a6e" />
            <circle cx={cx} cy={cy} r="75" fill="url(#earthGlow)" />
            {/* Continental landmass approximations */}
            <path
              d={`M ${cx - 30} ${cy - 20} Q ${cx - 10} ${cy - 45} ${cx + 25} ${cy - 20} Q ${cx + 10} ${cy + 30} ${cx - 20} ${cy + 15} Z`}
              fill="#065f46"
              opacity="0.4"
            />
            <text x={cx} y={cy + 4} fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
              EARTH
            </text>
            <text x={cx} y={cy + 16} fill="var(--text-muted)" fontSize="7" fontFamily="var(--font-mono)" textAnchor="middle">
              R_E = 6,378 km
            </text>

            {/* 1. Nominal Orbit (Solid Cyan Ellipse) */}
            {showNominal && (
              <g transform={`rotate(-18 ${cx} ${cy})`}>
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={nominalRx}
                  ry={nominalRy}
                  fill="none"
                  stroke="#00e5ff"
                  strokeWidth="1.8"
                  opacity="0.75"
                />
              </g>
            )}

            {/* 2. Proposed Post-Maneuver Orbit (Orange / Electric Dashed) */}
            {showManeuver && (
              <g transform={`rotate(${perturbedRotation} ${cx} ${cy})`}>
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={nominalRx}
                  ry={perturbedRy}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.2"
                  strokeDasharray="6,4"
                />
              </g>
            )}

            {/* Threat Object Orbit Track (Segment crossing at TCA) */}
            <line
              x1={tcaNominalX - 45}
              y1={tcaNominalY - 60}
              x2={tcaNominalX + 45}
              y2={tcaNominalY + 60}
              stroke="rgba(239, 68, 68, 0.6)"
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />

            {/* 3. Thrust Vector & Impulse Burn Point */}
            {showThrustVector && (
              <g>
                <circle cx={burnX} cy={burnY} r="18" fill="url(#burnFlameGlow)" />
                <circle cx={burnX} cy={burnY} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                {/* Burn Direction Arrow */}
                <line
                  x1={burnX}
                  y1={burnY}
                  x2={burnX + 35 * Math.cos((thrustVectorAngle * Math.PI) / 180)}
                  y2={burnY + 35 * Math.sin((thrustVectorAngle * Math.PI) / 180)}
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                />
                <text x={burnX - 10} y={burnY - 12} fill="#f59e0b" fontSize="9" fontWeight="bold">
                  Δv Burn Point ({maneuver.deltaVMs} m/s)
                </text>
                <text x={burnX - 10} y={burnY + 22} fill="var(--text-muted)" fontSize="7" fontFamily="var(--font-mono)">
                  T-{maneuver.hoursBeforeTca}h ({maneuver.scheduledBurnUtc.split(' ')[1]})
                </text>
              </g>
            )}

            {/* 4. Baseline Collision Risk Point (TCA) */}
            <circle cx={tcaNominalX} cy={tcaNominalY} r="4" fill="var(--status-critical)" />
            <text x={tcaNominalX + 10} y={tcaNominalY - 4} fill="var(--status-critical)" fontSize="8" fontWeight="bold">
              Baseline Conflict (Miss: {conjunction.missDistanceKm} km)
            </text>

            {/* 5. Post-CAM Cleared Asset Point */}
            <circle cx={tcaManeuverX} cy={tcaManeuverY} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
            <text x={tcaManeuverX + 10} y={tcaManeuverY + 12} fill="#10b981" fontSize="9" fontWeight="bold">
              Cleared Position (Miss: {maneuver.postManeuverMissDistanceKm} km)
            </text>

            {/* Separation line showing clearance delta */}
            <line
              x1={tcaNominalX}
              y1={tcaNominalY}
              x2={tcaManeuverX}
              y2={tcaManeuverY}
              stroke="#ffffff"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          </svg>
        ) : (
          /* B-Plane Miss Vector Shift View */
          <svg viewBox="0 0 640 400" width="100%" height="100%" style={{ display: 'block' }}>
            {/* Grid */}
            <line x1="60" y1="200" x2="580" y2="200" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="320" y1="40" x2="320" y2="360" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" strokeDasharray="3,3" />

            {/* Target Asset at Center */}
            <circle cx="320" cy="200" r="16" fill="rgba(56, 189, 248, 0.2)" stroke="#00e5ff" strokeWidth="2" />
            <text x="320" y="225" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
              {conjunction.targetObject} (Primary)
            </text>

            {/* Baseline TCA Point (Red) */}
            <circle cx="345" cy="180" r="8" fill="rgba(239, 68, 68, 0.3)" stroke="#ef4444" strokeWidth="2" />
            <text x="360" y="180" fill="#ef4444" fontSize="8" fontWeight="bold">
              Baseline TCA: {conjunction.missDistanceKm} km (Critical Risk)
            </text>

            {/* Post-CAM Deflected TCA Point (Green) */}
            <circle cx="510" cy="140" r="10" fill="rgba(16, 185, 129, 0.3)" stroke="#10b981" strokeWidth="2" />
            <text x="525" y="140" fill="#10b981" fontSize="9" fontWeight="bold">
              Post-CAM TCA: {maneuver.postManeuverMissDistanceKm} km (Safe Clearance)
            </text>

            {/* Deflection Vector */}
            <line x1="345" y1="180" x2="510" y2="140" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,2" />
            <text x="410" y="150" fill="#f59e0b" fontSize="8" fontFamily="var(--font-mono)">
              CAM Displacement Vector (+{(maneuver.postManeuverMissDistanceKm - conjunction.missDistanceKm).toFixed(2)} km)
            </text>
          </svg>
        )}
      </div>

      {/* 4. Legend */}
      <div className="trajectory-legend-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '14px', height: '2px', background: '#00e5ff' }}></div>
          <span>Nominal Orbit</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '14px', height: '2px', background: '#f59e0b', borderBottom: '1px dashed #f59e0b' }}></div>
          <span>Post-CAM Trajectory</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></div>
          <span>Thrust Burn (Δv)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-critical)' }}></div>
          <span>Threat Conflict Point</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
          <span>Cleared Safe Miss</span>
        </div>
      </div>
    </div>
  );
};
