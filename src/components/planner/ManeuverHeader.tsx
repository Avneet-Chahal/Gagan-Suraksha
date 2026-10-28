import React from 'react';
import { Satellite as SatelliteIcon, ShieldAlert, Fuel, RotateCcw, ArrowLeftRight } from 'lucide-react';
import { Satellite, CloseApproach } from '../../types';

interface ManeuverHeaderProps {
  satellite: Satellite;
  conjunction: CloseApproach;
  allConjunctions: CloseApproach[];
  onSelectConjunction: (ca: CloseApproach) => void;
  onResetPlan: () => void;
  onNavigateToRisk: () => void;
}

export const ManeuverHeader: React.FC<ManeuverHeaderProps> = ({
  satellite,
  conjunction,
  allConjunctions,
  onSelectConjunction,
  onResetPlan,
  onNavigateToRisk,
}) => {
  return (
    <div className="planner-context-bar">
      {/* 1. Primary Asset Metadata */}
      <div className="planner-asset-info">
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SatelliteIcon size={20} style={{ color: 'var(--accent-cyan)' }} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>{satellite.name}</span>
            <span className="badge badge-operational" style={{ fontSize: '0.62rem' }}>
              {satellite.status}
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>
              NORAD #{satellite.noradId}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            <span>Alt: <strong className="font-mono" style={{ color: '#fff' }}>{satellite.altitudeKm} km</strong></span>
            <span>•</span>
            <span>Inc: <strong className="font-mono" style={{ color: '#fff' }}>{satellite.inclination}°</strong></span>
            <span>•</span>
            <span>Period: <strong className="font-mono" style={{ color: '#fff' }}>{satellite.periodMin} min</strong></span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-cyan)' }}>
              <Fuel size={12} />
              <span>Fuel: <strong>34.2 kg / 45.0 kg</strong></span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Conjunction Threat Selector Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div className="planner-threat-pill">
          <ShieldAlert size={16} style={{ color: 'var(--status-critical)' }} />
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Threat Conjunction Target:
            </div>
            <select
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
              value={conjunction.id}
              onChange={(e) => {
                const found = allConjunctions.find((c) => c.id === e.target.value);
                if (found) onSelectConjunction(found);
              }}
            >
              {allConjunctions.map((c) => (
                <option key={c.id} value={c.id} style={{ background: '#060b19' }}>
                  {c.id.toUpperCase()}: {c.chaserObject.split(' ')[0]} (Miss: {c.missDistanceKm} km • Pc: {c.collisionProbability > 0 ? c.collisionProbability.toExponential(1) : 'Low'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <button
          className="btn-aerospace"
          onClick={onNavigateToRisk}
          style={{ padding: '6px 12px', fontSize: '0.72rem' }}
        >
          <ArrowLeftRight size={13} />
          <span>Assess Threat Risk</span>
        </button>

        <button
          className="btn-aerospace"
          onClick={onResetPlan}
          style={{ padding: '6px 12px', fontSize: '0.72rem' }}
          title="Restore baseline recommended burn configuration"
        >
          <RotateCcw size={13} />
          <span>Reset Plan</span>
        </button>
      </div>
    </div>
  );
};
