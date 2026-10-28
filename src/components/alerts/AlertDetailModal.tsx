import React from 'react';
import { X, ShieldAlert, Rocket, ExternalLink, Check, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AlertNotification } from '../../types';

interface AlertDetailModalProps {
  alert: AlertNotification | null;
  onClose: () => void;
  onToggleAcknowledge: (id: string) => void;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alert,
  onClose,
  onToggleAcknowledge,
}) => {
  const navigate = useNavigate();

  if (!alert) return null;

  const isCritical = alert.severity === 'CRITICAL';
  const hasEncounterData =
    alert.targetSatelliteName || alert.missDistanceKm !== undefined || alert.collisionProbability !== undefined;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--space-bg-card)',
          border: `1px solid ${isCritical ? 'var(--status-critical)' : 'var(--space-border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          width: '100%',
          maxWidth: '620px',
          boxShadow: isCritical ? 'var(--shadow-glow-red)' : 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              className={`badge ${
                isCritical
                  ? 'badge-critical'
                  : alert.severity === 'HIGH'
                  ? 'badge-high'
                  : alert.severity === 'WARNING'
                  ? 'badge-warning'
                  : 'badge-cyan'
              }`}
            >
              {alert.severity}
            </span>

            {alert.category && (
              <span className="badge badge-cyan" style={{ fontSize: '0.66rem' }}>
                {alert.category.replace('_', ' ')}
              </span>
            )}

            <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              INCIDENT #{alert.id.toUpperCase()}
            </span>
          </div>

          <button className="icon-button" onClick={onClose} style={{ padding: '2px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Title & Metadata */}
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            {alert.title}
          </h2>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Timestamp: <span className="font-mono" style={{ color: '#fff' }}>{alert.timestampUtc}</span> • Source:{' '}
            <span style={{ color: 'var(--accent-cyan)' }}>{alert.source}</span>
          </div>
        </div>

        {/* Message Box */}
        <div
          style={{
            background: 'rgba(3, 7, 18, 0.65)',
            border: '1px solid var(--space-border-subtle)',
            borderRadius: '6px',
            padding: '14px',
            fontSize: '0.8rem',
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
          }}
        >
          {alert.message}
        </div>

        {/* Dynamic Astrodynamic Encounter Parameters */}
        {hasEncounterData && (
          <div
            style={{
              background: isCritical ? 'rgba(239, 68, 68, 0.08)' : 'rgba(3, 7, 18, 0.55)',
              border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.25)' : 'var(--space-border-subtle)'}`,
              borderRadius: '6px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '0.74rem',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: isCritical ? 'var(--status-critical)' : 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ShieldAlert size={14} />
              <span>Conjunction Assessment Incident Parameters:</span>
            </div>

            {alert.targetSatelliteName && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Primary Asset:</span>
                <span style={{ color: '#fff' }}>
                  {alert.targetSatelliteName} {alert.targetNoradId ? `(NORAD ${alert.targetNoradId})` : ''}
                </span>
              </div>
            )}

            {alert.chaserObjectName && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Chaser Object:</span>
                <span style={{ color: '#fff' }}>
                  {alert.chaserObjectName} {alert.chaserNoradId ? `(NORAD ${alert.chaserNoradId})` : ''}
                </span>
              </div>
            )}

            {alert.collisionProbability !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Collision Probability ($P_c$):</span>
                <span
                  className="font-mono"
                  style={{
                    color: alert.collisionProbability > 1e-4 ? 'var(--status-critical)' : 'var(--status-warning)',
                    fontWeight: 700,
                  }}
                >
                  {alert.collisionProbability.toExponential(2)}{' '}
                  {alert.collisionProbability > 1e-4 ? '(Exceeds Threshold 1e-4)' : '(Monitoring nominal)'}
                </span>
              </div>
            )}

            {alert.calibratedProbability !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--accent-cyan)' }}>Calibrated Pc:</span>
                <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                  {alert.calibratedProbability.toExponential(2)} (Held-out calibrated)
                </span>
              </div>
            )}

            {alert.modelConfidence !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Model Confidence:</span>
                <span className="font-mono" style={{ color: '#fff' }}>
                  {(alert.modelConfidence * 100).toFixed(1)}%
                </span>
              </div>
            )}

            {alert.missDistanceKm !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Miss Distance:</span>
                <span className="font-mono" style={{ color: '#fff', fontWeight: 700 }}>
                  {alert.missDistanceKm < 1
                    ? `${(alert.missDistanceKm * 1000).toFixed(0)} meters`
                    : `${alert.missDistanceKm.toFixed(2)} km`}
                </span>
              </div>
            )}

            {alert.relativeVelocityKmS !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Relative Velocity:</span>
                <span className="font-mono" style={{ color: '#fff', fontWeight: 600 }}>
                  {alert.relativeVelocityKmS.toFixed(2)} km/s
                </span>
              </div>
            )}

            {/* Uncertainty & Covariance Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Positional Uncertainty:</span>
              {alert.sigmaRadialMeters !== undefined && alert.sigmaInTrackMeters !== undefined ? (
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                  RIC 1σ: ±{alert.sigmaRadialMeters}m (R), ±{alert.sigmaInTrackMeters}m (T), ±{alert.sigmaCrossTrackMeters ?? 0}m (C)
                </span>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Covariance unmodeled / missing data
                </span>
              )}
            </div>

            {alert.tcaUtc && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Time of Closest Approach (TCA):</span>
                <span className="font-mono" style={{ color: '#fff' }}>
                  {alert.tcaUtc}
                </span>
              </div>
            )}

            {alert.tleEpochUtc && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Input Element Epoch:</span>
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                  {alert.tleEpochUtc} {alert.dataFreshness ? `[${alert.dataFreshness}]` : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Data Integrity & Scientific Disclaimer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--space-border-subtle)',
            paddingTop: '6px',
          }}
        >
          <Info size={12} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          <span>
            <strong>Aerospace Operational Disclaimer:</strong> Conjunction calculations are based on propagated orbital elements. Fresh orbital elements alone do not constitute official conjunction warnings or guaranteed collision avoidance certification.
          </span>
        </div>

        {/* Modal Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <button
            className="btn-aerospace"
            onClick={() => onToggleAcknowledge(alert.id)}
            style={{
              background: alert.acknowledged ? 'rgba(16, 185, 129, 0.15)' : undefined,
              borderColor: alert.acknowledged ? 'var(--status-operational)' : undefined,
              color: alert.acknowledged ? 'var(--status-operational)' : undefined,
            }}
          >
            <Check size={14} />
            <span>{alert.acknowledged ? 'Incident Acknowledged' : 'Mark as Acknowledged'}</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {alert.actionRoute && (
              <button
                className="btn-aerospace btn-primary"
                onClick={() => {
                  onClose();
                  navigate(alert.actionRoute!);
                }}
              >
                {alert.actionRoute.includes('planner') ? <Rocket size={13} /> : <ExternalLink size={13} />}
                <span>{alert.actionLabel || 'View Analysis'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
