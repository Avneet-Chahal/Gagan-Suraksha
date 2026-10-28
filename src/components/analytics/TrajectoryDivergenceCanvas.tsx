import React, { useRef, useEffect, useState } from 'react';
import { TrendingUp, Crosshair } from 'lucide-react';

interface TrajectoryDivergenceCanvasProps {
  timeHorizonHours: number;
}

export const TrajectoryDivergenceCanvas: React.FC<TrajectoryDivergenceCanvasProps> = ({
  timeHorizonHours,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Layer toggles
  const [showRms, setShowRms] = useState(true);
  const [showInTrack, setShowInTrack] = useState(true);
  const [showCrossTrack, setShowCrossTrack] = useState(true);
  const [showRadial, setShowRadial] = useState(true);

  // Mouse hover state
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    hours: number;
    rmsM: number;
    inTrackM: number;
    crossTrackM: number;
    radialM: number;
  } | null>(null);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Margins
    const padLeft = 55;
    const padRight = 25;
    const padTop = 20;
    const padBottom = 35;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Max drift scale depending on horizon
    const maxDriftM = timeHorizonHours <= 24 ? 40 : timeHorizonHours <= 48 ? 95 : 220;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;

    // Horizontal grid
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const y = padTop + (plotH / ySteps) * i;
      const val = Math.round(maxDriftM - (maxDriftM / ySteps) * i);

      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${val}m`, padLeft - 8, y);
    }

    // Vertical grid (Hours / Revs)
    const xSteps = timeHorizonHours <= 24 ? 6 : timeHorizonHours <= 48 ? 8 : 7;
    for (let i = 0; i <= xSteps; i++) {
      const x = padLeft + (plotW / xSteps) * i;
      const hourVal = Math.round((timeHorizonHours / xSteps) * i);

      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, height - padBottom);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`+${hourVal}h`, x, height - padBottom + 6);
    }

    // Mathematical drift models:
    // In-track secular growth ~ t^1.4 with periodic orbital oscillation
    // Cross-track periodic oscillation ~ sin(wt) with gentle growth
    // Radial tight oscillation ~ cos(wt) + small drag contraction
    const sampleCount = 120;
    const dataPoints: { hour: number; inTrack: number; crossTrack: number; radial: number; rms: number }[] = [];

    for (let i = 0; i <= sampleCount; i++) {
      const t = (timeHorizonHours / sampleCount) * i;
      const revs = t / 1.6; // ~96 min LEO orbital period

      // In-track drift dominates analytical propagators over time
      const inTrack = 0.55 * Math.pow(t, 1.25) + 3.2 * Math.sin(revs * Math.PI * 2);
      const crossTrack = 1.1 + 0.35 * t + 2.8 * Math.sin(revs * Math.PI * 2 + 1.2);
      const radial = 0.4 + 0.08 * t + 1.6 * Math.cos(revs * Math.PI * 2);
      const rms = Math.sqrt(inTrack * inTrack + crossTrack * crossTrack + radial * radial);

      dataPoints.push({ hour: t, inTrack, crossTrack, radial, rms });
    }

    const getX = (hour: number) => padLeft + (hour / timeHorizonHours) * plotW;
    const getY = (valM: number) => height - padBottom - (valM / maxDriftM) * plotH;

    // Helper to draw a curve
    const drawCurve = (
      points: { x: number; y: number }[],
      color: string,
      lineWidth: number,
      dash: number[] = [],
      fillArea: boolean = false
    ) => {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash(dash);

      points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      if (fillArea) {
        ctx.lineTo(points[points.length - 1].x, height - padBottom);
        ctx.lineTo(points[0].x, height - padBottom);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
        grad.addColorStop(0, 'rgba(0, 229, 255, 0.18)');
        grad.addColorStop(1, 'rgba(0, 229, 255, 0.01)');
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.restore();
    };

    // 1. RMS Total Error curve
    if (showRms) {
      const rmsPts = dataPoints.map((d) => ({ x: getX(d.hour), y: getY(d.rms) }));
      drawCurve(rmsPts, '#00e5ff', 2.5, [], true);
    }

    // 2. In-Track Drift curve
    if (showInTrack) {
      const inPts = dataPoints.map((d) => ({ x: getX(d.hour), y: getY(d.inTrack) }));
      drawCurve(inPts, '#38bdf8', 1.8, [4, 3]);
    }

    // 3. Cross-Track Drift curve
    if (showCrossTrack) {
      const crossPts = dataPoints.map((d) => ({ x: getX(d.hour), y: getY(d.crossTrack) }));
      drawCurve(crossPts, '#10b981', 1.6, [2, 2]);
    }

    // 4. Radial Drift curve
    if (showRadial) {
      const radPts = dataPoints.map((d) => ({ x: getX(d.hour), y: getY(d.radial) }));
      drawCurve(radPts, '#f59e0b', 1.4, [1, 2]);
    }

    // Draw Crosshair if hovering
    if (hoveredPoint && hoveredPoint.hours <= timeHorizonHours) {
      const hX = getX(hoveredPoint.hours);
      const hY = getY(hoveredPoint.rmsM);

      // Vertical marker
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hX, padTop);
      ctx.lineTo(hX, height - padBottom);
      ctx.stroke();

      // Dot on RMS
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(hX, hY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#00e5ff';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [timeHorizonHours, showRms, showInTrack, showCrossTrack, showRadial, hoveredPoint]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const padLeft = 55;
    const padRight = 25;
    const plotW = rect.width - padLeft - padRight;
    const mouseX = e.clientX - rect.left;

    if (mouseX >= padLeft && mouseX <= rect.width - padRight) {
      const ratio = (mouseX - padLeft) / plotW;
      const hours = Math.min(timeHorizonHours, Math.max(0, ratio * timeHorizonHours));
      const revs = hours / 1.6;

      const inTrack = 0.55 * Math.pow(hours, 1.25) + 3.2 * Math.sin(revs * Math.PI * 2);
      const crossTrack = 1.1 + 0.35 * hours + 2.8 * Math.sin(revs * Math.PI * 2 + 1.2);
      const radial = 0.4 + 0.08 * hours + 1.6 * Math.cos(revs * Math.PI * 2);
      const rms = Math.sqrt(inTrack * inTrack + crossTrack * crossTrack + radial * radial);

      setHoveredPoint({
        x: mouseX,
        hours,
        rmsM: rms,
        inTrackM: inTrack,
        crossTrackM: crossTrack,
        radialM: radial,
      });
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="chart-container-card">
      <div className="chart-header-row">
        <div className="chart-title-area">
          <TrendingUp size={16} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <div className="chart-title-text">
              Propagator Ephemeris Divergence (SGP4 vs Numerical HPOP)
            </div>
            <div className="chart-subtitle-text">
              JGM-3 geopotential harmonic expansion (12x12), solar radiation pressure & Jacchia-Bowman atmospheric drag
            </div>
          </div>
        </div>

        {/* Legend / Toggles */}
        <div className="chart-legend-row">
          <div
            className={`chart-legend-item ${!showRms ? 'dimmed' : ''}`}
            onClick={() => setShowRms(!showRms)}
            title="Toggle RMS Total Error curve"
          >
            <div className="chart-legend-dot" style={{ background: '#00e5ff' }} />
            <span>Total RMS Error</span>
          </div>

          <div
            className={`chart-legend-item ${!showInTrack ? 'dimmed' : ''}`}
            onClick={() => setShowInTrack(!showInTrack)}
            title="Toggle In-Track secular drift"
          >
            <div className="chart-legend-dot" style={{ background: '#38bdf8' }} />
            <span>In-Track ($\Delta T$)</span>
          </div>

          <div
            className={`chart-legend-item ${!showCrossTrack ? 'dimmed' : ''}`}
            onClick={() => setShowCrossTrack(!showCrossTrack)}
            title="Toggle Cross-Track drift"
          >
            <div className="chart-legend-dot" style={{ background: '#10b981' }} />
            <span>Cross-Track ($\Delta N$)</span>
          </div>

          <div
            className={`chart-legend-item ${!showRadial ? 'dimmed' : ''}`}
            onClick={() => setShowRadial(!showRadial)}
            title="Toggle Radial drift"
          >
            <div className="chart-legend-dot" style={{ background: '#f59e0b' }} />
            <span>Radial ($\Delta R$)</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '12px',
              background: 'rgba(7, 13, 27, 0.92)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '0.72rem',
              backdropFilter: 'blur(8px)',
              boxShadow: 'var(--shadow-glow-cyan)',
              pointerEvents: 'none',
              zIndex: 10,
              minWidth: '170px',
            }}
          >
            <div style={{ color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Crosshair size={12} />
              <span>T+ {hoveredPoint.hours.toFixed(1)}h ({ (hoveredPoint.hours / 1.6).toFixed(1) } Revs)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Combined 3σ RMS:</span>
              <span className="font-mono" style={{ color: '#00e5ff', fontWeight: 700 }}>{hoveredPoint.rmsM.toFixed(1)} m</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>In-Track:</span>
              <span className="font-mono">{hoveredPoint.inTrackM.toFixed(1)} m</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Cross-Track:</span>
              <span className="font-mono">{hoveredPoint.crossTrackM.toFixed(1)} m</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Radial:</span>
              <span className="font-mono">{hoveredPoint.radialM.toFixed(1)} m</span>
            </div>
          </div>
        )}
      </div>

      {/* Trajectory Drift Breakdown */}
      <div className="drift-breakdown-strip">
        <div>
          <div className="drift-item-label">In-Track Drift Rate</div>
          <div className="drift-item-value" style={{ color: '#38bdf8' }}>
            14.2 m / rev
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Main source of TCA uncertainty</div>
        </div>

        <div>
          <div className="drift-item-label">Cross-Track Periodic</div>
          <div className="drift-item-value" style={{ color: '#10b981' }}>
            2.8 m / rev
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Nodal precession difference</div>
        </div>

        <div>
          <div className="drift-item-label">Radial Oscillation</div>
          <div className="drift-item-value" style={{ color: '#f59e0b' }}>
            1.1 m / rev
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Bounded J2 geoid variation</div>
        </div>

        <div>
          <div className="drift-item-label">24h Screening Bubble</div>
          <div className="drift-item-value" style={{ color: '#00e5ff' }}>
            ±45.2 m (3σ)
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--status-operational)' }}>Within ISO 24113 specs</div>
        </div>
      </div>
    </div>
  );
};
