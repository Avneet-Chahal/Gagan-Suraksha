import React from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Clock } from 'lucide-react';

interface TrackingTimelineProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  simSeconds: number; // 0 to 86400 (24 hours simulation window)
  onSeek: (seconds: number) => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onResetTime: () => void;
  playbackSpeed: number;
  onSelectSpeed: (speed: number) => void;
  baseEpoch: Date;
}

export const TrackingTimeline: React.FC<TrackingTimelineProps> = ({
  isPlaying,
  onTogglePlay,
  simSeconds,
  onSeek,
  onStepBackward,
  onStepForward,
  onResetTime,
  playbackSpeed,
  onSelectSpeed,
  baseEpoch,
}) => {
  // Compute simulated timestamp
  const simDate = new Date(baseEpoch.getTime() + simSeconds * 1000);
  const year = simDate.getUTCFullYear();
  const month = String(simDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(simDate.getUTCDate()).padStart(2, '0');
  const hours = String(simDate.getUTCHours()).padStart(2, '0');
  const minutes = String(simDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(simDate.getUTCSeconds()).padStart(2, '0');
  const formattedSimTime = `UTC ${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  // Compute offset string (e.g. +02h 15m 30s)
  const offsetHours = Math.floor(simSeconds / 3600);
  const offsetMins = Math.floor((simSeconds % 3600) / 60);
  const offsetSecs = Math.floor(simSeconds % 60);
  const formattedOffset = `+${String(offsetHours).padStart(2, '0')}h ${String(offsetMins).padStart(2, '0')}m ${String(offsetSecs).padStart(2, '0')}s`;

  return (
    <div className="tracking-timeline-bar">
      {/* 1. Playback Controls Group */}
      <div className="timeline-playback-group">
        <button
          className="timeline-btn"
          onClick={onStepBackward}
          title="Step Backward (15 min)"
          aria-label="Step backward 15 minutes"
        >
          <SkipBack size={14} />
        </button>

        <button
          className={`timeline-btn ${isPlaying ? 'active' : ''}`}
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
        </button>

        <button
          className="timeline-btn"
          onClick={onStepForward}
          title="Step Forward (15 min)"
          aria-label="Step forward 15 minutes"
        >
          <SkipForward size={14} />
        </button>

        <button
          className="timeline-btn"
          onClick={onResetTime}
          title="Reset Simulation Epoch to T0"
          aria-label="Reset simulation epoch to initial time"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* 2. Central Scrubber & Readout */}
      <div className="timeline-scrubber-center">
        <div className="timeline-meta-row">
          <div className="timeline-sim-clock">
            <Clock size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span>Simulated Orbit Time: {formattedSimTime}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="timeline-epoch-offset">Epoch Offset: {formattedOffset}</span>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>SIMULATION KINEMATICS</span>
          </div>
        </div>

        <input
          type="range"
          className="timeline-slider-track"
          min={0}
          max={86400} // 24 hours in seconds
          step={1}
          value={simSeconds}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Simulation time slider"
        />
      </div>

      {/* 3. Playback Speed Selector */}
      <div className="timeline-speed-group">
        <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginRight: '2px' }}>Rate:</span>
        {([1, 5, 15, 60, 300, 1800] as const).map((spd) => (
          <button
            key={spd}
            className={`speed-chip-btn ${playbackSpeed === spd ? 'active' : ''}`}
            onClick={() => onSelectSpeed(spd)}
            title={`Run simulation at ${spd}x speed`}
          >
            {spd >= 60 ? `${spd / 60}m/s` : `${spd}x`}
          </button>
        ))}
      </div>
    </div>
  );
};
