import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import { CloseApproach } from '../../types';

interface EncounterTimelineProps {
  encounters: CloseApproach[];
  selectedEncounter: CloseApproach;
  onSelectEncounter: (enc: CloseApproach) => void;
}

export const EncounterTimeline: React.FC<EncounterTimelineProps> = ({
  encounters,
  selectedEncounter,
  onSelectEncounter,
}) => {
  // Sort encounters chronologically by TCA
  const sortedEncounters = [...encounters].sort((a, b) => {
    return new Date(a.tcaDate || a.tcaUtc).getTime() - new Date(b.tcaDate || b.tcaUtc).getTime();
  });

  // Calculate approximate countdown from demo reference epoch (2025-04-27 08:24:36 UTC)
  const baseEpochMs = new Date('2025-04-27T08:24:36Z').getTime();

  return (
    <div className="encounter-timeline-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em' }}>
            CHRONOLOGICAL ENCOUNTER TIMELINE (NEXT 72 HOURS)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
            DEMONSTRATION SIMULATION
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Select marker to inspect geometry
          </span>
        </div>
      </div>

      <div className="timeline-nodes-track">
        <div className="timeline-connector-bar"></div>

        {sortedEncounters.map((enc) => {
          const isSelected = enc.id === selectedEncounter.id;
          const encDateMs = new Date(enc.tcaDate || enc.tcaUtc).getTime();
          const diffHours = Math.max(0, (encDateMs - baseEpochMs) / (1000 * 3600));
          const hoursInt = Math.floor(diffHours);
          const minsInt = Math.floor((diffHours - hoursInt) * 60);

          return (
            <div
              key={enc.id}
              className={`encounter-node-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectEncounter(enc)}
            >
              <div
                className={`encounter-node-marker ${
                  enc.riskLevel === 'HIGH' || enc.riskLevel === 'CRITICAL'
                    ? 'risk-high'
                    : enc.riskLevel === 'MEDIUM'
                    ? 'risk-medium'
                    : 'risk-low'
                }`}
                title={`Miss Distance: ${enc.missDistanceKm} km | Pc: ${enc.collisionProbability.toExponential(1)}`}
              >
                {enc.riskLevel === 'HIGH' || enc.riskLevel === 'CRITICAL' ? (
                  <ShieldAlert size={14} />
                ) : (
                  `${enc.missDistanceKm < 1 ? '<1' : enc.missDistanceKm.toFixed(0)}k`
                )}
              </div>

              <span className="encounter-node-label">
                {enc.targetObject} vs {enc.chaserObject.split(' ')[0]}
              </span>

              <span className="encounter-node-time">
                in {hoursInt}h {minsInt}m • {enc.tcaUtc.split(' ')[1]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
