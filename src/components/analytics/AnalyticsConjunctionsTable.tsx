import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CloseApproach } from '../../types';

interface AnalyticsConjunctionsTableProps {
  encounters: CloseApproach[];
  timeRangeLabel: string;
}

type SortField = 'tca' | 'missDistance' | 'probability';
type SortOrder = 'asc' | 'desc';

export const AnalyticsConjunctionsTable: React.FC<AnalyticsConjunctionsTableProps> = ({
  encounters,
  timeRangeLabel,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [sortField, setSortField] = useState<SortField>('probability');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter and sort encounters
  const filteredAndSorted = useMemo(() => {
    return encounters
      .filter((enc) => {
        // Search term
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          enc.targetObject.toLowerCase().includes(q) ||
          enc.targetNoradId.toString().includes(q) ||
          enc.chaserObject.toLowerCase().includes(q) ||
          enc.chaserNoradId.toString().includes(q);

        if (!matchesSearch) return false;

        // Risk filter
        if (riskFilter !== 'ALL' && enc.riskLevel !== riskFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;

        if (sortField === 'tca') {
          valA = new Date(a.tcaDate || a.tcaUtc).getTime();
          valB = new Date(b.tcaDate || b.tcaUtc).getTime();
        } else if (sortField === 'missDistance') {
          valA = a.missDistanceKm;
          valB = b.missDistanceKm;
        } else if (sortField === 'probability') {
          valA = a.collisionProbability;
          valB = b.collisionProbability;
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [encounters, searchTerm, riskFilter, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="chart-container-card">
      {/* Table Header & Controls */}
      <div className="chart-header-row">
        <div>
          <div className="chart-title-text">
            Historical & Screened Conjunction Events ({timeRangeLabel})
          </div>
          <div className="chart-subtitle-text">
            Screened close approaches with covariance-derived collision probability ($P_c$) and propagator deviations
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(3, 7, 18, 0.6)',
              border: '1px solid var(--space-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              minWidth: '200px',
            }}
          >
            <Search size={13} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search asset or chaser..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '0.74rem',
                width: '100%',
              }}
            />
          </div>

          {/* Risk Pills */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((r) => (
              <button
                key={r}
                className={`analytics-pill-btn ${riskFilter === r ? 'active' : ''}`}
                onClick={() => setRiskFilter(r)}
                style={{ fontSize: '0.68rem', padding: '2px 8px' }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div style={{ overflowX: 'auto', maxHeight: '340px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--space-border)', color: 'var(--text-muted)', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px' }}>Event ID</th>
              <th style={{ padding: '8px 10px' }}>Target Asset</th>
              <th style={{ padding: '8px 10px' }}>Chaser Object</th>
              <th
                style={{ padding: '8px 10px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggleSort('tca')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>TCA (UTC)</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                style={{ padding: '8px 10px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggleSort('missDistance')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Miss Distance</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                style={{ padding: '8px 10px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggleSort('probability')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Max Probability ($P_c$)</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th style={{ padding: '8px 10px' }}>Risk Level</th>
              <th style={{ padding: '8px 10px' }}>Status</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No conjunction events match the current filter criteria.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((enc) => {
                const isCrit = enc.riskLevel === 'CRITICAL';
                const isHigh = enc.riskLevel === 'HIGH';
                const isMed = enc.riskLevel === 'MEDIUM';

                return (
                  <tr
                    key={enc.id}
                    style={{
                      borderBottom: '1px solid var(--space-border-subtle)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(11, 19, 41, 0.45)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="font-mono" style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                      {enc.id.toUpperCase()}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#fff' }}>
                      {enc.targetObject}
                      <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', display: 'block' }}>
                        NORAD {enc.targetNoradId}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                      {enc.chaserObject}
                      <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', display: 'block' }}>
                        NORAD {enc.chaserNoradId}
                      </span>
                    </td>
                    <td className="font-mono" style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                      {enc.tcaUtc}
                    </td>
                    <td className="font-mono" style={{ padding: '8px 10px', fontWeight: 700, color: isCrit ? 'var(--status-critical)' : '#fff' }}>
                      {enc.missDistanceKm < 1 ? `${(enc.missDistanceKm * 1000).toFixed(0)} m` : `${enc.missDistanceKm.toFixed(2)} km`}
                    </td>
                    <td
                      className="font-mono"
                      style={{
                        padding: '8px 10px',
                        fontWeight: 700,
                        color: isCrit ? 'var(--status-critical)' : isHigh ? 'var(--status-warning)' : 'var(--status-operational)',
                      }}
                    >
                      {enc.collisionProbability > 0 ? enc.collisionProbability.toExponential(2) : '< 1e-9'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span
                        className={`badge ${
                          isCrit ? 'badge-critical' : isHigh ? 'badge-warning' : isMed ? 'badge-cyan' : 'badge-operational'
                        }`}
                        style={{ fontSize: '0.65rem' }}
                      >
                        {enc.riskLevel}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span className="badge badge-standby" style={{ fontSize: '0.65rem' }}>
                        {enc.status || 'MONITORING'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <button
                        className="btn-aerospace"
                        onClick={() => navigate('/collision-risk')}
                        style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                        title="Inspect in Collision Geometry Visualizer"
                      >
                        <span>Analyze</span>
                        <ArrowRight size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Dataset Label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', borderTop: '1px solid var(--space-border-subtle)', paddingTop: '6px' }}>
        <span>Showing {filteredAndSorted.length} screened encounters</span>
        <span style={{ color: 'var(--accent-cyan)' }}>Simulated Astrodynamics Engine • Demo Dataset</span>
      </div>
    </div>
  );
};
