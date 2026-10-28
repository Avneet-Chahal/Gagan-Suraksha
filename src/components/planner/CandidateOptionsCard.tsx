import React from 'react';
import { Flame, CheckCircle2 } from 'lucide-react';
import { ManeuverRecommendation } from '../../types';

interface CandidateOptionsCardProps {
  candidates: ManeuverRecommendation[];
  selectedCandidateId: string;
  onSelectCandidate: (candidate: ManeuverRecommendation) => void;
}

export const CandidateOptionsCard: React.FC<CandidateOptionsCardProps> = ({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700, color: '#ffffff' }}>
          <Flame size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span>CANDIDATE COLLISION AVOIDANCE STRATEGIES</span>
        </div>
        <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
          Select candidate to inspect trajectory & adjust delta-v
        </span>
      </div>

      <div className="candidate-solutions-grid">
        {candidates.map((cand) => {
          const isSelected = cand.id === selectedCandidateId;
          const isRecommended = cand.status === 'RECOMMENDED';

          return (
            <div
              key={cand.id}
              className={`candidate-card ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}`}
              onClick={() => onSelectCandidate(cand)}
            >
              <div>
                <div className="candidate-burn-type">
                  <span>{cand.title || `${cand.burnDirection} Burn`}</span>
                </div>
                <div style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', lineHeight: 1.3, marginBottom: '8px' }}>
                  {cand.description}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--space-border-subtle)', paddingTop: '8px' }}>
                <div className="candidate-metric-row">
                  <span style={{ color: 'var(--text-muted)' }}>Delta-V Req:</span>
                  <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                    {cand.deltaVMs.toFixed(2)} m/s
                  </span>
                </div>
                <div className="candidate-metric-row">
                  <span style={{ color: 'var(--text-muted)' }}>Propellant Cost:</span>
                  <span className="font-mono" style={{ color: '#ffffff' }}>{cand.fuelMassCostKg.toFixed(2)} kg</span>
                </div>
                <div className="candidate-metric-row">
                  <span style={{ color: 'var(--text-muted)' }}>Post Miss Dist:</span>
                  <span className="font-mono" style={{ color: 'var(--status-operational)', fontWeight: 700 }}>
                    {cand.postManeuverMissDistanceKm.toFixed(2)} km
                  </span>
                </div>
                <div className="candidate-metric-row">
                  <span style={{ color: 'var(--text-muted)' }}>Residual Pc:</span>
                  <span className="font-mono" style={{ color: 'var(--status-operational)' }}>
                    {cand.postManeuverCollisionProbability.toExponential(1)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="font-mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    T-{cand.hoursBeforeTca}h • {cand.scheduledBurnUtc.split(' ')[1]}
                  </span>
                  {isSelected && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.62rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      <CheckCircle2 size={12} />
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
