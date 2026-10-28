import React from 'react';
import { Search, CheckCheck, Download, CheckSquare, RotateCcw, ArrowUpDown } from 'lucide-react';

interface AlertFiltersToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSeverity: string;
  onSelectSeverity: (sev: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  statusFilter: 'ALL' | 'UNACKNOWLEDGED' | 'UNREAD' | 'ACKNOWLEDGED';
  onStatusFilterChange: (status: 'ALL' | 'UNACKNOWLEDGED' | 'UNREAD' | 'ACKNOWLEDGED') => void;
  sortBy: 'TIME_DESC' | 'TIME_ASC' | 'SEVERITY';
  onSortByChange: (sort: 'TIME_DESC' | 'TIME_ASC' | 'SEVERITY') => void;
  onAcknowledgeAll: () => void;
  onMarkAllAsRead: () => void;
  onResetDemoAlerts: () => void;
  onExportAlerts: () => void;
  totalFiltered: number;
  totalAll: number;
}

export const AlertFiltersToolbar: React.FC<AlertFiltersToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedSeverity,
  onSelectSeverity,
  selectedCategory,
  onSelectCategory,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  onAcknowledgeAll,
  onMarkAllAsRead,
  onResetDemoAlerts,
  onExportAlerts,
  totalFiltered,
  totalAll,
}) => {
  return (
    <div className="alerts-toolbar">
      {/* Top Row: Search, Severity, Status, Sort */}
      <div className="alerts-toolbar-top">
        {/* Search */}
        <div className="alerts-search-box">
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by satellite, NORAD ID, object, or message..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Severity Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Severity:</span>
          {(['ALL', 'CRITICAL', 'HIGH', 'WARNING', 'MEDIUM', 'LOW', 'INFO'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => onSelectSeverity(sev)}
              className="btn-aerospace"
              style={{
                padding: '3px 8px',
                fontSize: '0.68rem',
                background: selectedSeverity === sev ? 'var(--accent-blue)' : undefined,
                borderColor: selectedSeverity === sev ? 'var(--accent-cyan)' : undefined,
                color: selectedSeverity === sev ? '#ffffff' : undefined,
              }}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Status Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
          {(['ALL', 'UNACKNOWLEDGED', 'UNREAD', 'ACKNOWLEDGED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => onStatusFilterChange(st)}
              className="btn-aerospace"
              style={{
                padding: '3px 8px',
                fontSize: '0.68rem',
                background: statusFilter === st ? 'var(--accent-blue)' : undefined,
                borderColor: statusFilter === st ? 'var(--accent-cyan)' : undefined,
                color: statusFilter === st ? '#ffffff' : undefined,
              }}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Sort Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <ArrowUpDown size={13} style={{ color: 'var(--text-muted)' }} />
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as 'TIME_DESC' | 'TIME_ASC' | 'SEVERITY')}
            style={{
              background: 'rgba(3, 7, 18, 0.7)',
              border: '1px solid var(--space-border)',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontSize: '0.7rem',
              padding: '3px 6px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="TIME_DESC">Newest First</option>
            <option value="TIME_ASC">Oldest First</option>
            <option value="SEVERITY">Highest Severity</option>
          </select>
        </div>
      </div>

      {/* Bottom Row: Category Pills and Batch Action Buttons */}
      <div className="alerts-toolbar-bottom">
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Category:</span>
          {(['ALL', 'CONJUNCTION', 'COLLISION_RISK', 'MANEUVER', 'TRACKING', 'CONNECTIVITY', 'SYSTEM'] as const).map(
            (cat) => (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className="btn-aerospace"
                style={{
                  padding: '2px 7px',
                  fontSize: '0.66rem',
                  background: selectedCategory === cat ? 'rgba(0, 229, 255, 0.15)' : undefined,
                  borderColor: selectedCategory === cat ? 'var(--accent-cyan)' : undefined,
                  color: selectedCategory === cat ? 'var(--accent-cyan)' : undefined,
                }}
              >
                {cat.replace('_', ' ')}
              </button>
            )
          )}
        </div>

        {/* Batch Actions & Counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '6px' }}>
            Showing {totalFiltered} of {totalAll}
          </span>

          <button
            className="btn-aerospace"
            onClick={onMarkAllAsRead}
            style={{ padding: '3px 8px', fontSize: '0.68rem' }}
            title="Mark all filtered alerts as read"
          >
            <CheckSquare size={12} style={{ color: 'var(--accent-cyan)' }} />
            <span>Mark All Read</span>
          </button>

          <button
            className="btn-aerospace"
            onClick={onAcknowledgeAll}
            style={{ padding: '3px 8px', fontSize: '0.68rem' }}
            title="Acknowledge all filtered alerts"
          >
            <CheckCheck size={12} style={{ color: 'var(--status-operational)' }} />
            <span>Acknowledge All</span>
          </button>

          <button
            className="btn-aerospace"
            onClick={onResetDemoAlerts}
            style={{ padding: '3px 8px', fontSize: '0.68rem' }}
            title="Reset alerts state to initial demo queue"
          >
            <RotateCcw size={12} />
            <span>Reset Demo</span>
          </button>

          <button
            className="btn-aerospace"
            onClick={onExportAlerts}
            style={{ padding: '3px 8px', fontSize: '0.68rem' }}
            title="Export alerts incident log JSON"
          >
            <Download size={12} />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};
