import React from 'react';
import { ShieldAlert, Database, Rocket } from 'lucide-react';
import { CloseApproach } from '../../types';
import { EncounterGeometryVisualizer } from './EncounterGeometryVisualizer';
import { useNavigate } from 'react-router-dom';

interface EncounterDetailsPanelProps {
  encounter: CloseApproach;
}

export const EncounterDetailsPanel: React.FC<EncounterDetailsPanelProps> = ({ encounter }) => {
  const navigate = useNavigate();
  const isCritical = encounter.riskLevel === 'HIGH' || encounter.riskLevel === 'CRITICAL';

  return (
    <div className="encounter-details-card mission-card">
      {/* 1. Header with Risk Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--space-border-subtle)', paddingBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Conjunction Event ID</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
            {encounter.id.toUpperCase()}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
          <span
            className={`badge ${
              isCritical
                ? 'badge-critical'
                : encounter.riskLevel === 'MEDIUM'
                ? 'badge-warning'
                : 'badge-operational'
            }`}
          >
            {encounter.riskLevel} RISK
          </span>
          <span className="badge badge-standby" style={{ fontSize: '0.62rem' }}>
            STATUS: {encounter.status || 'ACTIVE'}
          </span>
        </div>
      </div>

      {/* 2. Primary Asset vs Secondary Chaser Comparison */}
      <div className="encounter-objects-comparison">
        <div className="object-box">
          <span className="object-box-role">Primary Asset</span>
          <span className="object-box-name">{encounter.targetObject}</span>
          <span className="object-box-id">NORAD #{encounter.targetNoradId}</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {encounter.targetType || 'Active Payload'}
          </span>
        </div>

        <div className="object-box" style={{ borderLeft: '1px solid var(--space-border-subtle)', paddingLeft: '10px' }}>
          <span className="object-box-role" style={{ color: isCritical ? 'var(--status-critical)' : 'inherit' }}>
            Chaser / Debris
          </span>
          <span className="object-box-name" style={{ color: isCritical ? 'var(--status-critical)' : 'var(--accent-cyan)' }}>
            {encounter.chaserObject}
          </span>
          <span className="object-box-id">NORAD #{encounter.chaserNoradId}</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {encounter.chaserType || 'Space Debris'}
          </span>
        </div>
      </div>

      {/* 3. Visual Encounter B-Plane Comparison */}
      <EncounterGeometryVisualizer encounter={encounter} />

      {/* 4. Miss Distance Vector Breakdown */}
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
          MISS VECTOR COMPONENTS (RIC FRAME)
        </div>
        <div className="miss-vector-grid">
          <div className="miss-vector-box">
            <span className="vector-label">Radial (ΔR)</span>
            <span className="vector-val font-mono">{encounter.radialDistanceKm} km</span>
          </div>
          <div className="miss-vector-box">
            <span className="vector-label">In-Track (ΔT)</span>
            <span className="vector-val font-mono">{encounter.inTrackDistanceKm} km</span>
          </div>
          <div className="miss-vector-box">
            <span className="vector-label">Cross-Track (ΔC)</span>
            <span className="vector-val font-mono">{encounter.crossTrackDistanceKm} km</span>
          </div>
        </div>
      </div>

      {/* 5. Key Astrodynamics Metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem' }}>
        <div className="profile-stat-row">
          <span className="profile-stat-label">Time of Closest Approach (TCA)</span>
          <span className="profile-stat-val font-mono" style={{ color: 'var(--accent-cyan)' }}>{encounter.tcaUtc}</span>
        </div>
        <div className="profile-stat-row">
          <span className="profile-stat-label">Total Miss Distance</span>
          <span className="profile-stat-val font-mono" style={{ color: isCritical ? 'var(--status-critical)' : '#ffffff', fontWeight: 700 }}>
            {encounter.missDistanceKm} km ({encounter.missDistanceKm * 1000} m)
          </span>
        </div>
        <div className="profile-stat-row">
          <span className="profile-stat-label">Relative Velocity (v_rel)</span>
          <span className="profile-stat-val font-mono">{encounter.relativeVelocityKmS} km/s</span>
        </div>
        <div className="profile-stat-row">
          <span className="profile-stat-label">Collision Probability (Pc)</span>
          <span className="profile-stat-val font-mono" style={{ color: isCritical ? 'var(--status-critical)' : 'inherit' }}>
            {encounter.collisionProbability > 0 ? encounter.collisionProbability.toExponential(2) : '< 1.00e-08'}
          </span>
        </div>
        <div className="profile-stat-row">
          <span className="profile-stat-label">Positional 1-Sigma Covariance</span>
          <span className="profile-stat-val font-mono">
            {encounter.sigmaPositionKm ? `±${(encounter.sigmaPositionKm * 1000).toFixed(0)} m` : 'Unavailable'}
          </span>
        </div>
      </div>

      {/* 6. Scientific Advisory Disclaimer */}
      <div style={{ padding: '8px 10px', background: 'rgba(3, 7, 18, 0.45)', borderLeft: '3px solid var(--accent-cyan)', borderRadius: '4px', fontSize: '0.67rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
        <strong>Astrodynamics Advisory:</strong> A predicted close approach indicates that two spatial state vectors will pass within proximity thresholds. It does not automatically signify a physical collision. Maneuver planning is initiated if Pc &gt; 1e-4.
      </div>

      {/* 7. Data Source & Timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.67rem', color: 'var(--text-muted)' }}>
        <Database size={13} style={{ color: 'var(--accent-cyan)' }} />
        <span>Source: {encounter.dataSource || 'Space-Track.org CDM Message'}</span>
        <span>•</span>
        <span>Updated: {encounter.lastUpdatedUtc || '08:00 UTC'}</span>
      </div>

      {/* 8. Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button
          className="btn-aerospace btn-primary"
          onClick={() => navigate('/collision-risk')}
          style={{ flex: 1, justifyContent: 'center', padding: '6px 12px' }}
        >
          <ShieldAlert size={14} />
          <span>Assess Collision Risk</span>
        </button>

        <button
          className="btn-aerospace"
          onClick={() => navigate('/maneuver-planner')}
          style={{ flex: 1, justifyContent: 'center', padding: '6px 12px' }}
        >
          <Rocket size={14} />
          <span>Plan Avoidance</span>
        </button>
      </div>
    </div>
  );
};
