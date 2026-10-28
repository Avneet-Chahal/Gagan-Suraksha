import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, ShieldAlert, RotateCcw } from 'lucide-react';
import { CloseApproach } from '../../types';

interface EncountersTableProps {
  encounters: CloseApproach[];
  selectedEncounter: CloseApproach;
  onSelectEncounter: (enc: CloseApproach) => void;
}

type SortField = 'tca' | 'missDistance' | 'probability';
type SortOrder = 'asc' | 'desc';

export const EncountersTable: React.FC<EncountersTableProps> = ({
  encounters,
  selectedEncounter,
  onSelectEncounter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'MONITORING' | 'EVALUATED'>('ALL');
  const [sortField, setSortField] = useState<SortField>('missDistance');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Filter and Sort Logic
  const filteredAndSortedEncounters = useMemo(() => {
    return encounters
      .filter((enc) => {
        // Search Filter
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          enc.targetObject.toLowerCase().includes(q) ||
          enc.targetNoradId.toString().includes(q) ||
          enc.chaserObject.toLowerCase().includes(q) ||
          enc.chaserNoradId.toString().includes(q);

        if (!matchesSearch) return false;

        // Risk Filter
        if (riskFilter !== 'ALL') {
          if (riskFilter === 'HIGH' && enc.riskLevel !== 'HIGH' && enc.riskLevel !== 'CRITICAL') return false;
          if (riskFilter === 'MEDIUM' && enc.riskLevel !== 'MEDIUM') return false;
          if (riskFilter === 'LOW' && enc.riskLevel !== 'LOW') return false;
        }

        // Status Filter
        if (statusFilter !== 'ALL' && enc.status !== statusFilter) return false;

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
  }, [encounters, searchTerm, riskFilter, statusFilter, sortField, sortOrder]);

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="encounters-table-card mission-card">
      {/* 1. Filter & Search Toolbar */}
      <div className="encounters-toolbar">
        {/* Search */}
        <div className="toolbar-search">
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search object, debris, or NORAD..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="toolbar-filters">
          <Filter size={14} style={{ color: 'var(--text-muted)', marginRight: '4px' }} />
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((rf) => (
            <button
              key={rf}
              className={`filter-chip ${riskFilter === rf ? 'active' : ''}`}
              onClick={() => setRiskFilter(rf)}
            >
              {rf === 'ALL' ? 'All Risks' : rf}
            </button>
          ))}

          <span style={{ color: 'var(--space-border-strong)', margin: '0 4px' }}>|</span>

          {(['ALL', 'ACTIVE', 'MONITORING', 'EVALUATED'] as const).map((sf) => (
            <button
              key={sf}
              className={`filter-chip ${statusFilter === sf ? 'active' : ''}`}
              onClick={() => setStatusFilter(sf)}
            >
              {sf === 'ALL' ? 'All Statuses' : sf}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Structured Table */}
      <div style={{ overflowX: 'auto' }}>
        {filteredAndSortedEncounters.length === 0 ? (
          <div className="catalog-empty-state">
            <ShieldAlert size={28} style={{ color: 'var(--text-muted)' }} />
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>No Conjunctions Found</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              No predicted encounters match the current search or risk filters.
            </div>
            <button
              className="btn-aerospace"
              onClick={() => {
                setSearchTerm('');
                setRiskFilter('ALL');
                setStatusFilter('ALL');
              }}
              style={{ padding: '4px 10px', fontSize: '0.72rem', marginTop: '6px' }}
            >
              <RotateCcw size={12} />
              <span>Reset Search Filters</span>
            </button>
          </div>
        ) : (
          <table className="space-table">
            <thead>
              <tr>
                <th>Primary Asset</th>
                <th>Chaser / Secondary Object</th>
                <th className="th-sortable" onClick={() => handleSortToggle('tca')} title="Sort by TCA">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>TCA (UTC)</span>
                    <ArrowUpDown size={12} style={{ opacity: sortField === 'tca' ? 1 : 0.4 }} />
                  </div>
                </th>
                <th className="th-sortable" onClick={() => handleSortToggle('missDistance')} title="Sort by Miss Distance">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Miss Dist. (km)</span>
                    <ArrowUpDown size={12} style={{ opacity: sortField === 'missDistance' ? 1 : 0.4 }} />
                  </div>
                </th>
                <th>Rel. Vel</th>
                <th className="th-sortable" onClick={() => handleSortToggle('probability')} title="Sort by Collision Probability">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Prob (Pc)</span>
                    <ArrowUpDown size={12} style={{ opacity: sortField === 'probability' ? 1 : 0.4 }} />
                  </div>
                </th>
                <th>Risk Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedEncounters.map((enc) => {
                const isSelected = enc.id === selectedEncounter.id;
                return (
                  <tr
                    key={enc.id}
                    className={isSelected ? 'encounter-row-selected' : ''}
                    onClick={() => onSelectEncounter(enc)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{enc.targetObject}</div>
                      <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                        NORAD #{enc.targetNoradId}
                      </div>
                    </td>
                    <td>
                      <div style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{enc.chaserObject}</div>
                      <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                        {enc.chaserType || `NORAD #${enc.chaserNoradId}`}
                      </div>
                    </td>
                    <td className="font-mono">{enc.tcaUtc}</td>
                    <td className="font-mono" style={{ color: enc.missDistanceKm < 1 ? 'var(--status-critical)' : '#ffffff', fontWeight: 600 }}>
                      {enc.missDistanceKm < 1 ? `${(enc.missDistanceKm * 1000).toFixed(0)} m` : `${enc.missDistanceKm.toFixed(2)} km`}
                    </td>
                    <td className="font-mono">{enc.relativeVelocityKmS} km/s</td>
                    <td className="font-mono" style={{ color: enc.collisionProbability > 1e-4 ? 'var(--status-critical)' : 'inherit' }}>
                      {enc.collisionProbability > 0 ? enc.collisionProbability.toExponential(2) : '< 1e-8'}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          enc.riskLevel === 'HIGH' || enc.riskLevel === 'CRITICAL'
                            ? 'badge-critical'
                            : enc.riskLevel === 'MEDIUM'
                            ? 'badge-warning'
                            : 'badge-operational'
                        }`}
                      >
                        {enc.riskLevel}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-standby" style={{ fontSize: '0.65rem' }}>
                        {enc.status || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', paddingTop: '6px', borderTop: '1px solid var(--space-border-subtle)' }}>
        <div>
          Showing {filteredAndSortedEncounters.length} of {encounters.length} conjunction screening records
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Sorted by: <strong>{sortField}</strong> ({sortOrder.toUpperCase()})</span>
        </div>
      </div>
    </div>
  );
};
