import React from 'react';
import { Sliders, Fuel, Clock, Compass, RotateCcw } from 'lucide-react';

interface ManeuverConfigControlsProps {
  deltaV: number;
  burnDirection: 'POSIGRADE' | 'RETROGRADE' | 'RADIAL_OUT' | 'CROSS_TRACK';
  hoursBeforeTca: number;
  thrusterIsp: number;
  fuelMassCostKg: number;
  onDeltaVChange: (val: number) => void;
  onDirectionChange: (dir: 'POSIGRADE' | 'RETROGRADE' | 'RADIAL_OUT' | 'CROSS_TRACK') => void;
  onHoursBeforeTcaChange: (hrs: number) => void;
  onThrusterIspChange: (isp: number) => void;
  onResetDefaults: () => void;
}

export const ManeuverConfigControls: React.FC<ManeuverConfigControlsProps> = ({
  deltaV,
  burnDirection,
  hoursBeforeTca,
  thrusterIsp,
  fuelMassCostKg,
  onDeltaVChange,
  onDirectionChange,
  onHoursBeforeTcaChange,
  onThrusterIspChange,
  onResetDefaults,
}) => {
  return (
    <div className="config-panel-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--space-border-subtle)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#ffffff' }}>
          <Sliders size={15} style={{ color: 'var(--accent-cyan)' }} />
          <span>MANEUVER PARAMETER CONFIGURATION</span>
        </div>
        <button
          className="btn-aerospace"
          onClick={onResetDefaults}
          style={{ padding: '3px 8px', fontSize: '0.67rem' }}
          title="Reset to recommended preset"
        >
          <RotateCcw size={11} />
          <span>Preset</span>
        </button>
      </div>

      {/* 1. Delta-V Slider & Controls */}
      <div className="slider-group">
        <div className="slider-header">
          <span style={{ color: 'var(--text-muted)' }}>Velocity Increment (Δv Magnitude)</span>
          <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontSize: '0.95rem', fontWeight: 700 }}>
            {deltaV.toFixed(2)} m/s
          </span>
        </div>
        <input
          type="range"
          min="0.05"
          max="2.50"
          step="0.05"
          value={deltaV}
          onChange={(e) => onDeltaVChange(parseFloat(e.target.value))}
          className="space-slider"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: 'var(--text-muted)' }}>
          <span>Min: 0.05 m/s</span>
          <span>Nominal CAM: ~0.45 m/s</span>
          <span>Max: 2.50 m/s</span>
        </div>
      </div>

      {/* 2. Burn Direction Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <Compass size={13} style={{ color: 'var(--accent-cyan)' }} />
          <span>Thrust Vector Direction</span>
        </div>
        <div className="direction-chips-row">
          {(['RETROGRADE', 'POSIGRADE', 'RADIAL_OUT', 'CROSS_TRACK'] as const).map((dir) => (
            <button
              key={dir}
              className={`direction-chip ${burnDirection === dir ? 'active' : ''}`}
              onClick={() => onDirectionChange(dir)}
            >
              {dir}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Execution Horizon Slider */}
      <div className="slider-group">
        <div className="slider-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
            <Clock size={13} style={{ color: 'var(--accent-cyan)' }} />
            <span>Execution Horizon (Time Prior to TCA)</span>
          </span>
          <span className="font-mono" style={{ color: '#ffffff', fontWeight: 700 }}>
            {hoursBeforeTca.toFixed(1)} hrs prior
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="6.0"
          step="0.1"
          value={hoursBeforeTca}
          onChange={(e) => onHoursBeforeTcaChange(parseFloat(e.target.value))}
          className="space-slider"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: 'var(--text-muted)' }}>
          <span>T-0.5h (Emergency)</span>
          <span>T-2.8h (Optimal Half-Orbit)</span>
          <span>T-6.0h (Early)</span>
        </div>
      </div>

      {/* 4. Thruster Specific Impulse (Isp) Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Fuel size={13} style={{ color: 'var(--accent-cyan)' }} />
            <span>Thruster System & Specific Impulse</span>
          </span>
          <span className="font-mono" style={{ color: '#ffffff' }}>I_sp: {thrusterIsp} s</span>
        </div>
        <div className="direction-chips-row">
          <button
            className={`direction-chip ${thrusterIsp === 220 ? 'active' : ''}`}
            onClick={() => onThrusterIspChange(220)}
          >
            Hydrazine Chemical (220s)
          </button>
          <button
            className={`direction-chip ${thrusterIsp === 70 ? 'active' : ''}`}
            onClick={() => onThrusterIspChange(70)}
          >
            Cold Gas (70s)
          </button>
          <button
            className={`direction-chip ${thrusterIsp === 1500 ? 'active' : ''}`}
            onClick={() => onThrusterIspChange(1500)}
          >
            Electric Ion (1500s)
          </button>
        </div>
      </div>

      {/* 5. Live Fuel Mass Cost Badge */}
      <div style={{ background: 'rgba(3, 7, 18, 0.6)', border: '1px solid var(--space-border)', borderRadius: '4px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tsiolkovsky Fuel Expenditure:</span>
        <span className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--status-operational)' }}>
          {fuelMassCostKg.toFixed(3)} kg ({ (fuelMassCostKg * 1000).toFixed(1) } g)
        </span>
      </div>
    </div>
  );
};
