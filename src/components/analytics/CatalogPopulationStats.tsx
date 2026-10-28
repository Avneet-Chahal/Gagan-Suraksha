import React from 'react';
import { Globe2, Rocket, Satellite, Trash2 } from 'lucide-react';

export const CatalogPopulationStats: React.FC = () => {
  const catalogStats = [
    { label: 'Active Payloads', count: 5820, pct: 21.2, icon: Satellite, color: 'var(--accent-cyan)' },
    { label: 'Debris Fragments', count: 19459, pct: 71.0, icon: Trash2, color: 'var(--status-critical)' },
    { label: 'Rocket Bodies', count: 2140, pct: 7.8, icon: Rocket, color: 'var(--status-warning)' },
  ];

  const orbitDistribution = [
    { name: 'Low Earth Orbit (LEO, <2000 km)', count: 22840, pct: 83.3, color: 'var(--accent-cyan)' },
    { name: 'Geostationary (GEO, ~35786 km)', count: 3210, pct: 11.7, color: 'var(--accent-blue)' },
    { name: 'Medium Earth Orbit (MEO)', count: 1369, pct: 5.0, color: 'var(--accent-purple)' },
  ];

  return (
    <div className="chart-container-card">
      <div className="chart-header-row">
        <div className="chart-title-area">
          <Globe2 size={16} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <div className="chart-title-text">
              Tracked Space Object Population & Catalog Distribution
            </div>
            <div className="chart-subtitle-text">
              US Space Command (18th SDS) & ISRO NETRA SSA Catalog Census
            </div>
          </div>
        </div>

        <span className="badge badge-cyan">27,419 TOTAL TRACKED OBJECTS</span>
      </div>

      {/* Population Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {catalogStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              style={{
                background: 'rgba(3, 7, 18, 0.55)',
                border: '1px solid var(--space-border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{stat.label}</div>
                <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                  {stat.count.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.65rem', color: stat.color }}>{stat.pct}% of space catalog</div>
              </div>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stat.color,
                }}
              >
                <Icon size={16} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Orbit Regime Breakdown Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Distribution by Orbital Regime
        </div>
        <div style={{ height: '10px', width: '100%', background: 'rgba(3, 7, 18, 0.8)', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
          {orbitDistribution.map((regime) => (
            <div
              key={regime.name}
              style={{
                width: `${regime.pct}%`,
                background: regime.color,
                height: '100%',
              }}
              title={`${regime.name}: ${regime.count} (${regime.pct}%)`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '8px' }}>
          {orbitDistribution.map((regime) => (
            <div key={regime.name} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: regime.color }} />
              <span>{regime.name}: <strong className="font-mono" style={{ color: '#fff' }}>{regime.count.toLocaleString()}</strong> ({regime.pct}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
