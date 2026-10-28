import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  Check,
  Eye,
  Rocket,
  Shield,
  Clock,
  ArrowRight,
  CheckSquare,
  Square,
  X,
  Radio,
  Satellite,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AlertNotification } from '../../types';

interface AlertCardProps {
  alert: AlertNotification;
  onToggleAcknowledge: (id: string) => void;
  onToggleRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onInspect: (alert: AlertNotification) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onToggleAcknowledge,
  onToggleRead,
  onDismiss,
  onInspect,
}) => {
  const navigate = useNavigate();

  const isCritical = alert.severity === 'CRITICAL';
  const isHigh = alert.severity === 'HIGH';
  const isWarning = alert.severity === 'WARNING';
  const isMedium = alert.severity === 'MEDIUM';
  const isLow = alert.severity === 'LOW';

  const severityBadgeClass = isCritical
    ? 'badge-critical'
    : isHigh
    ? 'badge-high'
    : isWarning
    ? 'badge-warning'
    : isMedium
    ? 'badge-cyan'
    : isLow
    ? 'badge-low'
    : 'badge-operational';

  return (
    <div
      className={`alert-card-item ${alert.severity.toLowerCase()} ${
        alert.acknowledged ? 'acknowledged' : ''
      } ${!alert.read ? 'unread' : ''}`}
    >
      {/* 1. Header Row */}
      <div className="alert-header-row">
        <div className="alert-title-block">
          {/* Unread indicator */}
          {!alert.read && <div className="unread-dot" title="Unread Alert" />}

          {/* Severity Badge */}
          <span className={`badge ${severityBadgeClass} ${isCritical && !alert.acknowledged ? 'pulse-critical' : ''}`}>
            {isCritical && <ShieldAlert size={12} style={{ marginRight: '3px' }} />}
            {(isHigh || isWarning) && <AlertTriangle size={12} style={{ marginRight: '3px' }} />}
            {(!isCritical && !isHigh && !isWarning) && <Info size={12} style={{ marginRight: '3px' }} />}
            {alert.severity}
          </span>

          {/* Category Badge */}
          {alert.category && (
            <span className="badge badge-cyan" style={{ fontSize: '0.66rem', padding: '1px 6px' }}>
              {alert.category.replace('_', ' ')}
            </span>
          )}

          {/* Title */}
          <h3 className="alert-title-text">{alert.title}</h3>

          {/* Acknowledged Badge */}
          {alert.acknowledged && (
            <span className="badge badge-operational" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
              <Check size={10} style={{ marginRight: '2px' }} />
              ACKNOWLEDGED
            </span>
          )}
        </div>

        {/* Timestamp & Dismiss */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {alert.timestampUtc}
          </span>
          <button
            className="icon-button"
            onClick={() => onDismiss(alert.id)}
            style={{ padding: '2px', color: 'var(--text-muted)' }}
            title="Dismiss Alert"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* 2. Message Body */}
      <div className="alert-body-content">{alert.message}</div>

      {/* 3. Conjunction & Telemetry Context Strip (if available) */}
      {(alert.targetSatelliteName || alert.missDistanceKm !== undefined || alert.collisionProbability !== undefined) && (
        <div className="alert-encounter-strip">
          {alert.targetSatelliteName && (
            <div className="alert-encounter-item">
              <Satellite size={12} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Asset:</span>
              <strong style={{ color: '#fff' }}>{alert.targetSatelliteName}</strong>
              {alert.targetNoradId && (
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                  (#{alert.targetNoradId})
                </span>
              )}
            </div>
          )}

          {alert.chaserObjectName && (
            <div className="alert-encounter-item">
              <span style={{ color: 'var(--text-muted)' }}>vs:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{alert.chaserObjectName}</span>
              {alert.chaserNoradId && (
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                  (#{alert.chaserNoradId})
                </span>
              )}
            </div>
          )}

          {alert.missDistanceKm !== undefined && (
            <div className="alert-encounter-item">
              <span style={{ color: 'var(--text-muted)' }}>Miss Distance:</span>
              <span
                className="font-mono"
                style={{
                  fontWeight: 700,
                  color: alert.missDistanceKm < 1 ? 'var(--status-critical)' : 'var(--accent-cyan)',
                }}
              >
                {alert.missDistanceKm < 1
                  ? `${(alert.missDistanceKm * 1000).toFixed(0)} m`
                  : `${alert.missDistanceKm.toFixed(2)} km`}
              </span>
            </div>
          )}

          {alert.relativeVelocityKmS !== undefined && (
            <div className="alert-encounter-item">
              <span style={{ color: 'var(--text-muted)' }}>Rel. Velocity:</span>
              <span className="font-mono" style={{ color: '#ffffff', fontWeight: 600 }}>
                {alert.relativeVelocityKmS.toFixed(2)} km/s
              </span>
            </div>
          )}

          {alert.collisionProbability !== undefined && (
            <div className="alert-encounter-item">
              <span style={{ color: 'var(--text-muted)' }}>
                {alert.calibratedProbability !== undefined ? 'Raw Pc:' : 'Probability (Pc):'}
              </span>
              <span
                className="font-mono"
                style={{
                  fontWeight: 700,
                  color: alert.collisionProbability > 1e-4 ? 'var(--status-critical)' : 'var(--status-warning)',
                }}
              >
                {alert.collisionProbability.toExponential(2)}
              </span>
            </div>
          )}

          {alert.calibratedProbability !== undefined && (
            <div className="alert-encounter-item">
              <span style={{ color: 'var(--accent-cyan)' }}>Calibrated Pc:</span>
              <span className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {alert.calibratedProbability.toExponential(2)}
              </span>
            </div>
          )}

          {alert.modelConfidence !== undefined && (
            <div className="alert-encounter-item">
              <span style={{ color: 'var(--text-muted)' }}>Confidence:</span>
              <span className="font-mono" style={{ color: '#ffffff' }}>
                {(alert.modelConfidence * 100).toFixed(1)}%
              </span>
            </div>
          )}

          {/* Uncertainty Display: 1-sigma covariance or explicit missing status */}
          <div className="alert-encounter-item">
            <span style={{ color: 'var(--text-muted)' }}>Uncertainty:</span>
            {alert.sigmaRadialMeters !== undefined && alert.sigmaInTrackMeters !== undefined ? (
              <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                1σ RIC: ±{alert.sigmaRadialMeters}m R / ±{alert.sigmaInTrackMeters}m T
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Covariance unmodeled / missing
              </span>
            )}
          </div>

          {alert.tcaUtc && (
            <div className="alert-encounter-item">
              <Clock size={12} style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)' }}>TCA:</span>
              <span className="font-mono" style={{ color: '#fff' }}>
                {alert.tcaUtc}
              </span>
            </div>
          )}

          {alert.tleEpochUtc && (
            <div className="alert-encounter-item">
              <span style={{ color: 'var(--text-muted)' }}>Epoch:</span>
              <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                {alert.tleEpochUtc}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 4. Astrodynamic Operational Disclaimer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: 'rgba(3, 7, 18, 0.35)',
          borderRadius: '4px',
          fontSize: '0.64rem',
          color: 'var(--text-muted)',
          margin: '2px 0',
        }}
      >
        <Info size={11} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
        <span>
          Advisory estimate: fresh orbital elements alone do not constitute official conjunction warnings or operational safety certification.
        </span>
      </div>

      {/* 5. Footer & Action Buttons */}
      <div className="alert-footer-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Source:</span>
          <span className="badge badge-cyan" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
            <Radio size={10} style={{ marginRight: '3px' }} />
            {alert.source}
          </span>
          {alert.dataFreshness && (
            <span
              className={`badge ${
                alert.dataFreshness === 'FRESH'
                  ? 'badge-operational'
                  : alert.dataFreshness === 'AGING'
                  ? 'badge-warning'
                  : 'badge-critical'
              }`}
              style={{ fontSize: '0.64rem', padding: '1px 6px' }}
            >
              {alert.dataFreshness}
            </span>
          )}
        </div>

        <div className="alert-actions-group">
          {/* Related Action Route Button */}
          {alert.actionRoute && (
            <button
              className="btn-aerospace"
              onClick={() => navigate(alert.actionRoute!)}
              style={{ padding: '3px 9px', fontSize: '0.7rem' }}
              title={`Navigate to ${alert.actionRoute}`}
            >
              {alert.actionRoute.includes('maneuver') ? (
                <Rocket size={12} style={{ color: 'var(--accent-cyan)' }} />
              ) : alert.actionRoute.includes('collision') ? (
                <Shield size={12} style={{ color: 'var(--status-critical)' }} />
              ) : (
                <ArrowRight size={12} />
              )}
              <span>{alert.actionLabel || 'View Analysis'}</span>
            </button>
          )}

          {/* Inspect Details */}
          <button
            className="btn-aerospace"
            onClick={() => onInspect(alert)}
            style={{ padding: '3px 8px', fontSize: '0.7rem' }}
            title="Inspect Alert Details"
          >
            <Eye size={12} />
            <span>Inspect</span>
          </button>

          {/* Read / Unread toggle */}
          <button
            className="btn-aerospace"
            onClick={() => onToggleRead(alert.id)}
            style={{ padding: '3px 8px', fontSize: '0.7rem' }}
            title={alert.read ? 'Mark as Unread' : 'Mark as Read'}
          >
            {alert.read ? <CheckSquare size={12} /> : <Square size={12} />}
            <span>{alert.read ? 'Mark Unread' : 'Mark Read'}</span>
          </button>

          {/* Acknowledge toggle */}
          <button
            className="btn-aerospace"
            onClick={() => onToggleAcknowledge(alert.id)}
            style={{
              padding: '3px 10px',
              fontSize: '0.7rem',
              background: alert.acknowledged ? 'rgba(16, 185, 129, 0.15)' : undefined,
              borderColor: alert.acknowledged ? 'var(--status-operational)' : undefined,
              color: alert.acknowledged ? 'var(--status-operational)' : undefined,
            }}
          >
            <Check size={12} />
            <span>{alert.acknowledged ? 'Acknowledged' : 'Acknowledge'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
