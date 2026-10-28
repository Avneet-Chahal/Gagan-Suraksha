import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Info, ShieldAlert } from 'lucide-react';
import { DEMO_ALERTS } from '../data/mockData';
import { AlertNotification, AlertSeverity } from '../types';
import { AlertStatisticsBar } from '../components/alerts/AlertStatisticsBar';
import { AlertFiltersToolbar } from '../components/alerts/AlertFiltersToolbar';
import { AlertCard } from '../components/alerts/AlertCard';
import { AlertDetailModal } from '../components/alerts/AlertDetailModal';
import { audioAlarm } from '../services/audioAlarm';

const SEVERITY_WEIGHT: Record<AlertSeverity, number> = {
  CRITICAL: 6,
  HIGH: 5,
  WARNING: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

export const AlertsPage: React.FC = () => {
  // Load alerts from localStorage or fallback to DEMO_ALERTS
  const [alertsList, setAlertsList] = useState<AlertNotification[]>(() => {
    try {
      const saved = localStorage.getItem('gagan_alerts_state');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEMO_ALERTS;
  });

  // Filters & Search
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNACKNOWLEDGED' | 'UNREAD' | 'ACKNOWLEDGED'>('ALL');
  const [sortBy, setSortBy] = useState<'TIME_DESC' | 'TIME_ASC' | 'SEVERITY'>('TIME_DESC');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal & Audio
  const [inspectingAlert, setInspectingAlert] = useState<AlertNotification | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(audioAlarm.getIsMuted());

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('gagan_alerts_state', JSON.stringify(alertsList));
  }, [alertsList]);

  // Filter and Sort Alerts
  const filteredAndSortedAlerts = useMemo(() => {
    return alertsList
      .filter((alert) => {
        // Severity Filter
        if (filterSeverity !== 'ALL' && alert.severity !== filterSeverity) {
          return false;
        }

        // Category Filter
        if (filterCategory !== 'ALL' && alert.category !== filterCategory) {
          return false;
        }

        // Status Filter
        if (statusFilter === 'UNACKNOWLEDGED' && alert.acknowledged) return false;
        if (statusFilter === 'ACKNOWLEDGED' && !alert.acknowledged) return false;
        if (statusFilter === 'UNREAD' && alert.read) return false;

        // Search Query
        const q = searchQuery.toLowerCase().trim();
        if (q) {
          const matchTitle = alert.title.toLowerCase().includes(q);
          const matchMessage = alert.message.toLowerCase().includes(q);
          const matchSource = alert.source.toLowerCase().includes(q);
          const matchTarget = alert.targetSatelliteName?.toLowerCase().includes(q) || false;
          const matchTargetNorad = alert.targetNoradId?.toString().includes(q) || false;
          const matchChaser = alert.chaserObjectName?.toLowerCase().includes(q) || false;
          const matchChaserNorad = alert.chaserNoradId?.toString().includes(q) || false;

          if (
            !matchTitle &&
            !matchMessage &&
            !matchSource &&
            !matchTarget &&
            !matchTargetNorad &&
            !matchChaser &&
            !matchChaserNorad
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'TIME_DESC') {
          return (b.timestampEpochMs || 0) - (a.timestampEpochMs || 0);
        } else if (sortBy === 'TIME_ASC') {
          return (a.timestampEpochMs || 0) - (b.timestampEpochMs || 0);
        } else if (sortBy === 'SEVERITY') {
          return SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
        }
        return 0;
      });
  }, [alertsList, filterSeverity, filterCategory, statusFilter, searchQuery, sortBy]);

  // Handlers
  const handleToggleAcknowledge = (id: string) => {
    setAlertsList((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const nextAck = !a.acknowledged;
          if (nextAck) {
            audioAlarm.playSuccessChime();
          }
          return { ...a, acknowledged: nextAck, read: true };
        }
        return a;
      })
    );
  };

  const handleToggleRead = (id: string) => {
    setAlertsList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: !a.read } : a))
    );
  };

  const handleDismiss = (id: string) => {
    setAlertsList((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAcknowledgeAll = () => {
    const idsToAck = new Set(filteredAndSortedAlerts.map((a) => a.id));
    setAlertsList((prev) =>
      prev.map((a) => (idsToAck.has(a.id) ? { ...a, acknowledged: true, read: true } : a))
    );
    audioAlarm.playSuccessChime();
  };

  const handleMarkAllAsRead = () => {
    const idsToRead = new Set(filteredAndSortedAlerts.map((a) => a.id));
    setAlertsList((prev) =>
      prev.map((a) => (idsToRead.has(a.id) ? { ...a, read: true } : a))
    );
  };

  const handleResetDemoAlerts = () => {
    setAlertsList(DEMO_ALERTS);
    localStorage.removeItem('gagan_alerts_state');
    audioAlarm.playWarningChime();
  };

  const handleToggleMute = () => {
    const nextMuted = audioAlarm.toggleMute();
    setIsAudioMuted(nextMuted);
  };

  const handleTestSound = () => {
    audioAlarm.playCriticalAlarm();
  };

  const handleExportAlerts = () => {
    const exportData = {
      platform: 'GAGAN SURAKSHA - Operational Safety Alarms Log',
      exportedUtc: new Date().toISOString(),
      datasetType: 'Demo / Simulated Queue',
      totalActiveAlerts: alertsList.length,
      alerts: alertsList,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GaganSuraksha_Alarms_Log_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Dynamic counts for status header
  const unackCriticalCount = alertsList.filter((a) => a.severity === 'CRITICAL' && !a.acknowledged).length;
  const unreadTotalCount = alertsList.filter((a) => !a.read).length;

  return (
    <div className="alerts-page-container">
      {/* 1. Page Header */}
      <div className="page-header-bar">
        <div className="page-title-group">
          <div className="page-title-icon">
            <Bell size={18} style={{ color: 'var(--status-critical)' }} />
          </div>
          <div>
            <h1 className="page-heading">Mission Alerts & Conjunction Warnings</h1>
            <p className="page-subheading">
              Operational priority queue, orbital safety alarms, and autonomous notification triggers
            </p>
          </div>
        </div>

        <div className="page-action-group">
          {unackCriticalCount > 0 ? (
            <span className="badge badge-critical">
              <ShieldAlert size={12} style={{ marginRight: '3px' }} />
              {unackCriticalCount} Critical Action Required
            </span>
          ) : (
            <span className="badge badge-operational">Zero Critical Threats</span>
          )}
          <span className="badge badge-cyan">{unreadTotalCount} Unread</span>
        </div>
      </div>

      {/* 2. Top Statistics Strip */}
      <AlertStatisticsBar
        alerts={alertsList}
        isMuted={isAudioMuted}
        onToggleMute={handleToggleMute}
        onTestSound={handleTestSound}
      />

      {/* 3. Filter Toolbar with Search, Status, Category, Sort */}
      <AlertFiltersToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSeverity={filterSeverity}
        onSelectSeverity={setFilterSeverity}
        selectedCategory={filterCategory}
        onSelectCategory={setFilterCategory}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onAcknowledgeAll={handleAcknowledgeAll}
        onMarkAllAsRead={handleMarkAllAsRead}
        onResetDemoAlerts={handleResetDemoAlerts}
        onExportAlerts={handleExportAlerts}
        totalFiltered={filteredAndSortedAlerts.length}
        totalAll={alertsList.length}
      />

      {/* 4. Alerts Feed List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredAndSortedAlerts.length === 0 ? (
          <div className="placeholder-panel">
            <div className="placeholder-icon">
              <Bell size={24} />
            </div>
            <div style={{ fontWeight: 600, color: '#fff' }}>No Matching Alerts Found</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              No notifications match your current filter, search, or status selection.
            </div>
            <button className="btn-aerospace" onClick={handleResetDemoAlerts} style={{ marginTop: '8px' }}>
              Reset to Demo Alerts
            </button>
          </div>
        ) : (
          filteredAndSortedAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onToggleAcknowledge={handleToggleAcknowledge}
              onToggleRead={handleToggleRead}
              onDismiss={handleDismiss}
              onInspect={(a) => {
                setInspectingAlert(a);
                // Auto mark as read on inspect
                if (!a.read) handleToggleRead(a.id);
              }}
            />
          ))
        )}
      </div>

      {/* 5. Data Integrity Footer Note */}
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
            <strong>Operational Advisory:</strong> Alerts in this demonstration interface reflect simulated conjunction and telemetry triggers stored in local session state. Dismissing or acknowledging an alert logs operator acknowledgement without modifying celestial trajectories.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Demo Queue: {alertsList.length} Events</span>
          <span>•</span>
          <span style={{ color: 'var(--accent-cyan)' }}>Web Audio Alarm Engine Connected</span>
        </div>
      </div>

      {/* 6. Detailed Inspection Modal */}
      <AlertDetailModal
        alert={inspectingAlert}
        onClose={() => setInspectingAlert(null)}
        onToggleAcknowledge={handleToggleAcknowledge}
      />
    </div>
  );
};
