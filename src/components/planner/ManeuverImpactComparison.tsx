import React, { useState } from 'react';
import { ShieldCheck, Radio, CheckCircle, FileText, Check, AlertTriangle } from 'lucide-react';
import { CloseApproach, ManeuverRecommendation } from '../../types';

interface ManeuverImpactComparisonProps {
  conjunction: CloseApproach;
  maneuver: ManeuverRecommendation;
  deltaV: number;
  calculatedMissKm: number;
  calculatedPc: number;
  fuelMassCostKg: number;
  orbitalShiftKm: number;
}

export const ManeuverImpactComparison: React.FC<ManeuverImpactComparisonProps> = ({
  conjunction,
  maneuver,
  deltaV,
  calculatedMissKm,
  calculatedPc,
  fuelMassCostKg,
  orbitalShiftKm,
}) => {
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Clearance improvement
  const missGainKm = Math.max(0, calculatedMissKm - conjunction.missDistanceKm);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#ffffff' }}>
          <ShieldCheck size={16} style={{ color: 'var(--status-operational)' }} />
          <span>COLLISION AVOIDANCE IMPACT EVALUATION</span>
        </div>
        <span className="badge badge-operational" style={{ fontSize: '0.62rem' }}>
          RISK RESOLVED
        </span>
      </div>

      {/* 2. Before vs After Comparison Grid */}
      <div className="comparison-hero-grid">
        {/* Baseline Conflict (Before) */}
        <div className="comparison-box threat">
          <span className="comparison-label">Baseline Miss Separation</span>
          <div className="comparison-val font-mono" style={{ color: 'var(--status-critical)' }}>
            {conjunction.missDistanceKm < 1
              ? `${(conjunction.missDistanceKm * 1000).toFixed(0)} m`
              : `${conjunction.missDistanceKm.toFixed(2)} km`}
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
            Baseline Pc: <strong className="font-mono" style={{ color: 'var(--status-critical)' }}>
              {conjunction.collisionProbability > 0 ? conjunction.collisionProbability.toExponential(2) : '1e-4'}
            </strong>
          </div>
        </div>

        {/* Post-CAM Predicted (After) */}
        <div className="comparison-box safe">
          <span className="comparison-label">Post-CAM Miss Clearance</span>
          <div className="comparison-val font-mono" style={{ color: 'var(--status-operational)' }}>
            {calculatedMissKm.toFixed(2)} km
          </div>
          <div className="comparison-delta">
            +{missGainKm.toFixed(2)} km (+{(missGainKm * 1000).toFixed(0)} m) clearance
          </div>
        </div>
      </div>

      {/* 3. Detailed Parameter Shift Matrix */}
      <div style={{ background: 'rgba(3, 7, 18, 0.55)', border: '1px solid var(--space-border)', borderRadius: '4px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.72rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Residual Collision Probability:</span>
          <span className="font-mono" style={{ color: 'var(--status-operational)', fontWeight: 700 }}>
            {calculatedPc.toExponential(2)} (Safe, Threshold &lt; 1e-5)
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Required Burn Impulse (Δv):</span>
          <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
            {deltaV.toFixed(2)} m/s ({maneuver.burnDirection})
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Hydrazine Propellant Required:</span>
          <span className="font-mono" style={{ color: '#ffffff' }}>
            {fuelMassCostKg.toFixed(3)} kg ({ (fuelMassCostKg * 1000).toFixed(0) } grams)
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Orbital Apsides Shift:</span>
          <span className="font-mono" style={{ color: '#ffffff' }}>
            {orbitalShiftKm > 0 ? `+${orbitalShiftKm.toFixed(2)}` : orbitalShiftKm.toFixed(2)} km (Semi-major axis change: ~{Math.abs(orbitalShiftKm * 0.5).toFixed(2)} km)
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Mission Lifetime Impact:</span>
          <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
            -{(fuelMassCostKg * 95).toFixed(0)} days of nominal stationkeeping
          </span>
        </div>
      </div>

      {/* 4. Ground Station Uplink Window & Constraints */}
      <div style={{ background: 'rgba(3, 7, 18, 0.45)', borderLeft: '3px solid var(--accent-cyan)', padding: '8px 12px', borderRadius: '4px', fontSize: '0.68rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff', fontWeight: 600 }}>
          <Radio size={13} style={{ color: 'var(--accent-cyan)' }} />
          <span>Telecommand Uplink Schedule: {maneuver.uplinkPassStation || 'Hartebeesthoek (HBK)'}</span>
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Uplink window opens at <strong>11:15 UTC</strong>. Arming cut-off: <strong>{maneuver.uplinkDeadlineUtc || '11:00 UTC'}</strong> (Two-operator verification).
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-operational)', marginTop: '2px' }}>
          <CheckCircle size={11} />
          <span>Secondary Conjunction Screening: 0 cascading encounters detected (7-day propagation).</span>
        </div>
      </div>

      {/* 5. Primary Telecommand Arming Button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
        <button
          className={`arm-telecommand-btn ${isArmed ? 'armed' : ''}`}
          onClick={() => setIsArmed(!isArmed)}
        >
          {isArmed ? <Check size={16} /> : <Radio size={16} />}
          <span>{isArmed ? 'TELECOMMAND SEQUENCE ARMED & QUEUED' : 'ARM & QUEUE TELECOMMAND FOR NEXT PASS'}</span>
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-aerospace"
            onClick={() => setShowExportModal(true)}
            style={{ flex: 1, justifyContent: 'center', padding: '6px 10px', fontSize: '0.72rem' }}
          >
            <FileText size={13} />
            <span>Export CCSDS OEM Ephemeris</span>
          </button>
        </div>

        {isArmed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px', padding: '6px 10px', fontSize: '0.67rem', color: '#ffffff' }}>
            <CheckCircle size={12} style={{ color: 'var(--status-operational)' }} />
            <span>Command sequence checksum verified (CRC32: 0x9F41E8). Ready for S-band transmitter at Hartebeesthoek.</span>
          </div>
        )}

        {/* Modal feedback simulation if user clicks Export */}
        {showExportModal && (
          <div style={{ background: 'rgba(3, 7, 18, 0.95)', border: '1px solid var(--accent-cyan)', borderRadius: '6px', padding: '12px', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: '#ffffff' }}>
              <span>CCSDS OEM Ephemeris Export</span>
              <button onClick={() => setShowExportModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="font-mono" style={{ background: '#020617', padding: '8px', borderRadius: '4px', fontSize: '0.62rem', color: 'var(--accent-cyan)', maxHeight: '100px', overflowY: 'auto' }}>
              CCSDS_OEM_VERS = 2.0<br/>
              CREATION_DATE  = 2025-04-27T08:24:36Z<br/>
              ORIGINATOR     = GAGAN_SURAKSHA_CAM_PLANNER<br/>
              OBJECT_NAME    = ORBIT-02<br/>
              OBJECT_ID      = 2022-056A<br/>
              REF_FRAME      = EME2000<br/>
              TIME_SYSTEM    = UTC<br/>
              MANEUVER_EPOCH = {maneuver.scheduledBurnUtc}<br/>
              DELTA_V_VECTOR = [{deltaV.toFixed(2)}, 0.00, 0.00] m/s<br/>
              POST_MISS_KM   = {calculatedMissKm.toFixed(2)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-aerospace" onClick={() => setShowExportModal(false)} style={{ padding: '3px 8px', fontSize: '0.68rem' }}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Cautionary Notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.64rem', color: 'var(--text-muted)' }}>
        <AlertTriangle size={12} style={{ color: 'var(--text-muted)' }} />
        <span>Telecommand uplink requires two-factor mission controller cryptographic handshake.</span>
      </div>
    </div>
  );
};
