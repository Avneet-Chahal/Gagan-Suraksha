import React from 'react';
import { AlertTriangle, Info, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import { AlertNotification } from '../../types';

interface AlertStatisticsBarProps {
  alerts: AlertNotification[];
  isMuted: boolean;
  onToggleMute: () => void;
  onTestSound: () => void;
}

export const AlertStatisticsBar: React.FC<AlertStatisticsBarProps> = ({
  alerts,
  isMuted,
  onToggleMute,
  onTestSound,
}) => {
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && !a.acknowledged).length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING' && !a.acknowledged).length;
  const acknowledgedCount = alerts.filter((a) => a.acknowledged).length;

  return (
    <div className="alerts-stats-strip">
      {/* 1. Critical Conjunction Alerts */}
      <div className={`alert-stat-card ${criticalCount > 0 ? 'critical' : ''}`}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Unacknowledged Critical
          </div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--status-critical)' }}>
            {criticalCount}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--status-critical)' }}>
            {criticalCount > 0 ? 'Immediate CAM review needed' : 'Zero unacknowledged critical'}
          </div>
        </div>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--status-critical)',
          }}
          className={criticalCount > 0 ? 'pulse-critical' : ''}
        >
          <ShieldAlert size={18} />
        </div>
      </div>

      {/* 2. Warnings */}
      <div className={`alert-stat-card ${warningCount > 0 ? 'warning' : ''}`}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Warnings
          </div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--status-warning)' }}>
            {warningCount}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Space weather & drag adjustments
          </div>
        </div>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--status-warning)',
          }}
        >
          <AlertTriangle size={18} />
        </div>
      </div>

      {/* 3. Acknowledged Alarms */}
      <div className="alert-stat-card operational">
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Acknowledged / Logged
          </div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--status-operational)' }}>
            {acknowledgedCount}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--status-operational)' }}>
            Archived in mission telemetry log
          </div>
        </div>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--status-operational)',
          }}
        >
          <Info size={18} />
        </div>
      </div>

      {/* 4. Acoustic Warning Engine State */}
      <div className="alert-stat-card">
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Acoustic Alarm Engine
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isMuted ? 'var(--text-muted)' : 'var(--accent-cyan)' }}>
            {isMuted ? 'AUDIO MUTED' : 'LIVE MONITORING'}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <button
              onClick={onToggleMute}
              className="btn-aerospace"
              style={{ padding: '2px 8px', fontSize: '0.68rem' }}
            >
              {isMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button
              onClick={onTestSound}
              className="btn-aerospace"
              style={{ padding: '2px 8px', fontSize: '0.68rem' }}
              title="Test Web Audio API acoustic alarm chime"
            >
              Test Ping
            </button>
          </div>
        </div>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: isMuted ? 'rgba(100, 116, 139, 0.15)' : 'rgba(0, 229, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isMuted ? 'var(--text-muted)' : 'var(--accent-cyan)',
          }}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </div>
      </div>
    </div>
  );
};
