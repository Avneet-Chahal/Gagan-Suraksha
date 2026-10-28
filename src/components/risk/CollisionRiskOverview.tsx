import React from 'react';
import { Target, Zap, Clock, ShieldAlert, ArrowLeftRight, ChevronRight, HelpCircle } from 'lucide-react';
import { CloseApproach } from '../../types';

interface CollisionRiskOverviewProps {
  encounters: CloseApproach[];
  selectedEncounter: CloseApproach;
  onSelectEncounter: (enc: CloseApproach) => void;
  onNavigateToCloseApproaches: () => void;
}

export const CollisionRiskOverview: React.FC<CollisionRiskOverviewProps> = ({
  encounters,
  selectedEncounter,
  onSelectEncounter,
  onNavigateToCloseApproaches,
}) => {
  const enc = selectedEncounter;
  const isHighRisk = enc.riskLevel === 'HIGH' || enc.riskLevel === 'CRITICAL';
  const isMediumRisk = enc.riskLevel === 'MEDIUM';
  const isLowRisk = enc.riskLevel === 'LOW';

  // Format collision probability or show "Unavailable"
  const formattedPc =
    enc.collisionProbability && enc.collisionProbability > 0
      ? enc.collisionProbability.toExponential(2)
      : 'Unavailable';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* 1. Encounter Selector & Navigation Bar */}
      <div className="encounter-selector-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em' }}>
              SELECT ENCOUNTER TARGET:
            </span>
          </div>

          <select
            className="encounter-select-dropdown"
            value={enc.id}
            onChange={(e) => {
              const found = encounters.find((item) => item.id === e.target.value);
              if (found) onSelectEncounter(found);
            }}
          >
            {encounters.map((item) => (
              <option key={item.id} value={item.id}>
                [{item.id.toUpperCase()}] {item.targetObject} vs {item.chaserObject.split(' ')[0]} ({item.riskLevel} Risk • Miss: {item.missDistanceKm} km)
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn-aerospace"
          onClick={onNavigateToCloseApproaches}
          style={{ padding: '5px 12px', fontSize: '0.72rem' }}
        >
          <ArrowLeftRight size={13} />
          <span>View All Screening Events</span>
          <ChevronRight size={13} />
        </button>
      </div>

      {/* 2. Top Metric Strip with Prominent Pc Hero Card */}
      <div className="collision-metric-strip">
        {/* Prominent Pc Hero Card */}
        <div
          className={`pc-hero-card ${
            isHighRisk
              ? 'high-risk'
              : isMediumRisk
              ? 'medium-risk'
              : isLowRisk
              ? 'low-risk'
              : 'neutral-risk'
          }`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              COLLISION PROBABILITY (Pc)
            </span>
            <span
              className={`badge ${
                isHighRisk
                  ? 'badge-critical'
                  : isMediumRisk
                  ? 'badge-warning'
                  : isLowRisk
                  ? 'badge-operational'
                  : 'badge-standby'
              }`}
            >
              {enc.riskLevel} RISK
            </span>
          </div>

          <div
            className="pc-hero-value"
            style={{
              color:
                formattedPc === 'Unavailable'
                  ? 'var(--text-muted)'
                  : isHighRisk
                  ? 'var(--status-critical)'
                  : isMediumRisk
                  ? 'var(--status-warning)'
                  : 'var(--status-operational)',
            }}
          >
            {formattedPc}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            <span>Model: Foster 2D Circular Disc</span>
            <span className="badge badge-standby" style={{ fontSize: '0.6rem' }}>
              STATUS: {enc.status || 'ACTIVE'}
            </span>
          </div>
        </div>

        {/* Metric 2: Total Miss Distance & RIC Breakdown */}
        <div className="metric-card-detailed">
          <div>
            <div className="metric-title">
              <ShieldAlert size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>Predicted Miss Distance</span>
            </div>
            <div
              className="metric-primary-val"
              style={{ color: enc.missDistanceKm < 1 ? 'var(--status-critical)' : '#ffffff' }}
            >
              {enc.missDistanceKm < 1
                ? `${(enc.missDistanceKm * 1000).toFixed(0)} meters`
                : `${enc.missDistanceKm.toFixed(2)} km`}
            </div>
          </div>
          <div className="metric-sub-note">
            Predicted minimum separation between centers of mass at TCA.
          </div>
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.67rem', color: 'var(--text-muted)', borderTop: '1px solid var(--space-border-subtle)', paddingTop: '4px' }}>
            <span>ΔR: <strong className="font-mono" style={{ color: '#fff' }}>{enc.radialDistanceKm}km</strong></span>
            <span>ΔT: <strong className="font-mono" style={{ color: '#fff' }}>{enc.inTrackDistanceKm}km</strong></span>
            <span>ΔC: <strong className="font-mono" style={{ color: '#fff' }}>{enc.crossTrackDistanceKm}km</strong></span>
          </div>
        </div>

        {/* Metric 3: Relative Velocity */}
        <div className="metric-card-detailed">
          <div>
            <div className="metric-title">
              <Zap size={14} style={{ color: 'var(--status-warning)' }} />
              <span>Encounter Relative Velocity</span>
            </div>
            <div className="metric-primary-val">
              {enc.relativeVelocityKmS} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>km/s</span>
            </div>
          </div>
          <div className="metric-sub-note">
            Relative speed at encounter determining hypervelocity impact kinetic energy ({ (enc.relativeVelocityKmS * 3600).toFixed(0) } km/h).
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.67rem', color: 'var(--text-muted)', borderTop: '1px solid var(--space-border-subtle)', paddingTop: '4px' }}>
            <HelpCircle size={11} style={{ color: 'var(--accent-cyan)' }} />
            <span>Approach Angle: {enc.encounterAngleDeg || 78.5}°</span>
          </div>
        </div>

        {/* Metric 4: TCA */}
        <div className="metric-card-detailed">
          <div>
            <div className="metric-title">
              <Clock size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>Time of Closest Approach</span>
            </div>
            <div className="metric-primary-val font-mono" style={{ fontSize: '1.05rem', color: 'var(--accent-cyan)' }}>
              {enc.tcaUtc.split(' ')[1] || enc.tcaUtc}
            </div>
          </div>
          <div className="metric-sub-note">
            Epoch: {enc.tcaUtc}
          </div>
          <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', borderTop: '1px solid var(--space-border-subtle)', paddingTop: '4px' }}>
            Screening Window: <strong>72h Operational Horizon</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
