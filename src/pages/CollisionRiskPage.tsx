import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Database, Info, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { DEMO_CLOSE_APPROACHES } from '../data/mockData';
import { fetchCloseApproaches } from '../services/api';
import { CloseApproach } from '../types';
import { CollisionRiskOverview } from '../components/risk/CollisionRiskOverview';
import { CollisionGeometryCanvas } from '../components/risk/CollisionGeometryCanvas';
import { CollisionAnalysisTabs } from '../components/risk/CollisionAnalysisTabs';
import { useNavigate } from 'react-router-dom';

export const CollisionRiskPage: React.FC = () => {
  const [encounters, setEncounters] = useState<CloseApproach[]>(DEMO_CLOSE_APPROACHES);
  const [selectedEncounter, setSelectedEncounter] = useState<CloseApproach>(DEMO_CLOSE_APPROACHES[0]);
  const [scope, setScope] = useState<'all' | 'operational' | 'historical'>('all');
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const navigate = useNavigate();

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    setError(null);

    try {
      const data = await fetchCloseApproaches(scope);
      const nowStr = new Date().toLocaleTimeString('en-US', { hour12: false });
      setLastRefreshedAt(nowStr);

      if (data && data.length > 0) {
        setEncounters(data);
        setSelectedEncounter((prev) => {
          const match = data.find((e) => e.id === prev?.id);
          return match || data[0];
        });
        if (data !== DEMO_CLOSE_APPROACHES) {
          setIsLive(true);
        }
      }
    } catch (err: any) {
      console.error('Failed to retrieve collision risk encounters:', err);
      setError('Unable to fetch live risk calculations. Displaying cached telemetry.');
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodic polling every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const isCritical =
    selectedEncounter?.collisionProbability && selectedEncounter.collisionProbability > 1e-4;

  return (
    <div className="collision-page-container">
      {/* 1. Page Header */}
      <div className="page-header-bar">
        <div className="page-title-group">
          <div className="page-title-icon">
            <ShieldAlert
              size={18}
              style={{ color: isCritical ? 'var(--status-critical)' : 'var(--accent-cyan)' }}
            />
          </div>
          <div>
            <h1 className="page-heading">Collision Risk & Conjunction Assessment</h1>
            <p className="page-subheading">
              Foster 2D Covariance Ellipsoid Probability Integration, Quantile Uncertainty & Calibration
            </p>
          </div>
        </div>

        <div className="page-action-group">
          {/* Scope Selector: ALL / OPERATIONAL / HISTORICAL */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(3, 7, 18, 0.6)',
              border: '1px solid var(--space-border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
              gap: '2px',
            }}
          >
            {(['all', 'operational', 'historical'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  background: scope === s ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                  color: scope === s ? '#38bdf8' : 'var(--text-muted)',
                  borderBottom: scope === s ? '2px solid #38bdf8' : '2px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                {s === 'all' ? 'All Records' : s === 'operational' ? 'Live Operational' : 'Historical 2022'}
              </button>
            ))}
          </div>

          {/* Sync Button */}
          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="btn-aerospace"
            style={{
              padding: '4px 10px',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
            title="Refresh risk calculations from backend"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="badge badge-standby"
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.65rem',
              background: autoRefresh ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.2)',
              borderColor: autoRefresh ? 'rgba(16, 185, 129, 0.4)' : 'rgba(100, 116, 139, 0.3)',
              color: autoRefresh ? '#10b981' : 'var(--text-muted)',
            }}
            title="Toggle 30-second live polling interval"
          >
            <Clock size={10} />
            <span>{autoRefresh ? 'POLLING (30s)' : 'POLL OFF'}</span>
          </button>

          {isCritical ? (
            <span className="badge badge-critical">THRESHOLD EXCEEDED (Pc &gt; 1e-4)</span>
          ) : (
            <span className="badge badge-operational">MONITORING NOMINAL (Pc &lt; 1e-4)</span>
          )}
          <span className="badge badge-cyan" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={12} />
            {isLive ? 'LIVE DATA' : 'DEMO ENGINE'}
          </span>
        </div>
      </div>

      {/* Error notification banner if applicable */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.74rem',
            color: '#fca5a5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={15} style={{ color: '#ef4444' }} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadData()}
            style={{
              padding: '3px 8px',
              fontSize: '0.68rem',
              background: 'rgba(239, 68, 68, 0.3)',
              border: '1px solid #ef4444',
              borderRadius: '3px',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 2. Top Encounter Selector & High-Level Metrics */}
      {encounters.length > 0 && selectedEncounter && (
        <CollisionRiskOverview
          encounters={encounters}
          selectedEncounter={selectedEncounter}
          onSelectEncounter={setSelectedEncounter}
          onNavigateToCloseApproaches={() => navigate('/close-approaches')}
        />
      )}

      {/* 3. Main Workspace: B-Plane Visualizer (Left) + Multi-Tab Analysis (Right) */}
      {encounters.length > 0 && selectedEncounter && (
        <div className="collision-workspace-grid">
          <CollisionGeometryCanvas encounter={selectedEncounter} />
          <CollisionAnalysisTabs encounter={selectedEncounter} />
        </div>
      )}

      {/* 4. Astrodynamics Operational Advisory Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: 'rgba(3, 7, 18, 0.45)',
          border: '1px solid var(--space-border-subtle)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span>
            <strong>Aerospace Operational Notice:</strong> Collision probability ($P_c$) represents the covariance integration over the encounter disk. Fresh orbital elements alone do not constitute official warnings or certified collision avoidance guarantees.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {lastRefreshedAt && <span>Last Synced: <strong>{lastRefreshedAt} UTC</strong></span>}
          <span>•</span>
          <span>Selected: {selectedEncounter ? selectedEncounter.id.toUpperCase() : 'None'}</span>
          <span>•</span>
          <span style={{ color: 'var(--accent-cyan)' }}>Alfriend-Akella / Foster Integrator</span>
        </div>
      </div>
    </div>
  );
};
