import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, Database, HelpCircle, Flame, RefreshCw, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import { DEMO_CLOSE_APPROACHES } from '../data/mockData';
import { CloseApproach } from '../types';
import { fetchCloseApproaches } from '../services/api';
import { EncounterTimeline } from '../components/encounters/EncounterTimeline';
import { EncountersTable } from '../components/encounters/EncountersTable';
import { EncounterDetailsPanel } from '../components/encounters/EncounterDetailsPanel';
import { IridiumCollisionModal } from '../components/modals/IridiumCollisionModal';

export const CloseApproachesPage: React.FC = () => {
  const [encounters, setEncounters] = useState<CloseApproach[]>(DEMO_CLOSE_APPROACHES);
  const [selectedEncounter, setSelectedEncounter] = useState<CloseApproach>(DEMO_CLOSE_APPROACHES[0]);
  const [scope, setScope] = useState<'all' | 'operational' | 'historical'>('all');
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isIridiumModalOpen, setIsIridiumModalOpen] = useState<boolean>(false);

  // System States: Loading, Error, Stale, Auto-refresh
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const [isStaleData, setIsStaleData] = useState<boolean>(false);

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
        // Check if data is flagged as historical fallback or older than 6h
        const hasStale = data.some((e) => {
          if (!e.lastUpdatedUtc) return false;
          const ageHours = (Date.now() - new Date(e.lastUpdatedUtc).getTime()) / (1000 * 3600);
          return ageHours > 6.0;
        });
        setIsStaleData(hasStale);
      } else {
        setEncounters([]);
      }
    } catch (err: any) {
      console.error('Failed to retrieve conjunction screening data:', err);
      setError('Unable to reach telemetry backend. Please verify that the API server is operational.');
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [scope]);

  // Initial and Scope-change fetch
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodic background polling (every 30 seconds if auto-refresh is active)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Dynamic counts for status header
  const highRiskCount = encounters.filter(
    (e) => e.riskLevel === 'HIGH' || e.riskLevel === 'CRITICAL'
  ).length;
  const mediumRiskCount = encounters.filter((e) => e.riskLevel === 'MEDIUM').length;
  const lowRiskCount = encounters.filter((e) => e.riskLevel === 'LOW').length;

  return (
    <div className="encounters-page-container">
      {/* 1. Page Header Bar */}
      <div className="page-header-bar">
        <div className="page-title-group">
          <div className="page-title-icon">
            <ArrowLeftRight size={18} />
          </div>
          <div>
            <h1 className="page-heading">Conjunction Screening & Close Approaches</h1>
            <p className="page-subheading">
              Spacecraft encounter geometry, Time of Closest Approach (TCA), and miss-distance vectors
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
                {s === 'all' ? 'All Records' : s === 'operational' ? 'Operational (Live)' : 'Historical 2022'}
              </button>
            ))}
          </div>

          {/* Auto-Refresh Toggle & Manual Refresh Button */}
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
            title="Refresh screening data from backend"
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

          <button
            className="btn-aerospace"
            onClick={() => setIsIridiumModalOpen(true)}
            style={{
              padding: '4px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(56, 189, 248, 0.2))',
              borderColor: '#ef4444',
              color: '#ffffff',
              boxShadow: '0 0 12px rgba(239, 68, 68, 0.35)',
              letterSpacing: '0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            title="Open Historical Iridium 33 x Cosmos 2251 Collision Replay"
          >
            <Flame size={14} style={{ color: '#ef4444' }} />
            <span>IRIDIUM COLLISION REPLAY</span>
          </button>

          <span className="badge badge-critical">{highRiskCount} High Risk</span>
          <span className="badge badge-warning">{mediumRiskCount} Moderate Risk</span>
          <span className="badge badge-operational">{lowRiskCount} Low Risk</span>
          <span
            className={isLive ? 'badge badge-operational' : 'badge badge-cyan'}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Database size={12} />
            {isLive ? `LIVE BACKEND (${encounters.length})` : 'DEMO DATASET'}
          </span>
        </div>
      </div>

      {/* 2. System Status Banners (Stale Data, Error, Sync time) */}
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

      {isStaleData && !error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.72rem',
            color: '#fcd34d',
          }}
        >
          <Clock size={14} style={{ color: '#f59e0b' }} />
          <span>
            <strong>Data Freshness Notice:</strong> Some orbital records are in standby or pre-verified authentic cache. Displaying latest confirmed telemetry.
          </span>
        </div>
      )}

      {/* 3. Empty State if no records match */}
      {encounters.length === 0 && !isLoading && (
        <div
          className="mission-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center',
            gap: '12px',
          }}
        >
          <ShieldCheck size={36} style={{ color: 'var(--status-operational)' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
            No Conjunction Events Found for {scope.toUpperCase()} Scope
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '480px' }}>
            The current orbital screening window has no close-approach pairs violating the miss-distance proximity threshold ($d &lt; 10$ km). Catalog assets are maintaining safe orbital separation.
          </p>
          <button
            onClick={() => setScope('all')}
            className="btn-aerospace"
            style={{ padding: '6px 14px', fontSize: '0.75rem' }}
          >
            Switch to All Scope
          </button>
        </div>
      )}

      {/* 4. Chronological Encounter Timeline */}
      {encounters.length > 0 && (
        <EncounterTimeline
          encounters={encounters}
          selectedEncounter={selectedEncounter}
          onSelectEncounter={setSelectedEncounter}
        />
      )}

      {/* 5. Main Workspace: Encounters Table (Left) + Selected Details (Right) */}
      {encounters.length > 0 && (
        <div className="encounters-workspace-grid">
          <EncountersTable
            encounters={encounters}
            selectedEncounter={selectedEncounter}
            onSelectEncounter={setSelectedEncounter}
          />

          <EncounterDetailsPanel
            encounter={selectedEncounter}
          />
        </div>
      )}

      {/* 6. Astrodynamics & Operational Advisory Footer */}
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
          <HelpCircle size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span>
            <strong>Astrodynamics Notice:</strong> A predicted close approach signifies spatial proximity within the screening threshold. Fresh orbital elements alone do not constitute official conjunction warnings or guaranteed collision probabilities.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {lastRefreshedAt && <span>Last Synced: <strong>{lastRefreshedAt} UTC</strong></span>}
          <span>•</span>
          <span style={{ color: 'var(--accent-cyan)' }}>SGP4 / Foster 2D / Isotonic Calibration</span>
        </div>
      </div>

      {/* 7. Dedicated Historical Iridium 33 x Cosmos 2251 Collision Replay Modal */}
      <IridiumCollisionModal
        isOpen={isIridiumModalOpen}
        onClose={() => setIsIridiumModalOpen(false)}
      />
    </div>
  );
};
