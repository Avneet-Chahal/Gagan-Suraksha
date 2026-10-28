import React, { useRef, useEffect, useState } from 'react';
import { ShieldAlert, Crosshair, AlertTriangle } from 'lucide-react';

interface DebrisCluster {
  name: string;
  altitudeMin: number;
  altitudeMax: number;
  incMin: number;
  incMax: number;
  objectCount: number;
  fluxLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';
  activeSatellites: string[];
}

const NOTABLE_CLUSTERS: DebrisCluster[] = [
  {
    name: 'Fengyun-1C ASAT Debris Field',
    altitudeMin: 800,
    altitudeMax: 900,
    incMin: 96,
    incMax: 101,
    objectCount: 2840,
    fluxLevel: 'EXTREME',
    activeSatellites: ['CARTOSAT-3', 'EOS-04 (RISAT-1A)'],
  },
  {
    name: 'Iridium 33 / Kosmos 2251 Collision Cloud',
    altitudeMin: 750,
    altitudeMax: 820,
    incMin: 84,
    incMax: 89,
    objectCount: 2150,
    fluxLevel: 'EXTREME',
    activeSatellites: ['ORBIT-02', 'OCEANSAT-3'],
  },
  {
    name: 'Commercial LEO Megaconstellation Shell',
    altitudeMin: 520,
    altitudeMax: 560,
    incMin: 51,
    incMax: 55,
    objectCount: 6420,
    fluxLevel: 'HIGH',
    activeSatellites: ['EOS-06 (OCEANSAT-3)'],
  },
  {
    name: 'SSO Earth Observation Corridor',
    altitudeMin: 600,
    altitudeMax: 720,
    incMin: 97,
    incMax: 99,
    objectCount: 3100,
    fluxLevel: 'HIGH',
    activeSatellites: ['CARTOSAT-3', 'RISAT-1A'],
  },
  {
    name: 'Low LEO Drag Cleaning Zone',
    altitudeMin: 300,
    altitudeMax: 450,
    incMin: 40,
    incMax: 60,
    objectCount: 890,
    fluxLevel: 'LOW',
    activeSatellites: ['LEO Testbed'],
  },
];

export const DebrisFluxDensityHeatmap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    alt: number;
    inc: number;
    cluster?: DebrisCluster;
    estimatedFlux: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    const padLeft = 55;
    const padRight = 20;
    const padTop = 15;
    const padBottom = 35;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    ctx.clearRect(0, 0, width, height);

    // Altitude range: 200 km to 1400 km
    const altMin = 200;
    const altMax = 1400;

    // Inclination range: 0 deg to 110 deg
    const incMin = 0;
    const incMax = 110;

    const cols = 22;
    const rows = 12;
    const cellW = plotW / cols;
    const cellH = plotH / rows;

    // Draw Heatmap grid cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const alt = altMax - ((r + 0.5) / rows) * (altMax - altMin);
        const inc = incMin + ((c + 0.5) / cols) * (incMax - incMin);

        // Calculate synthetic flux density based on proximity to known clusters
        let intensity = 0.05; // baseline space background
        NOTABLE_CLUSTERS.forEach((cluster) => {
          if (
            alt >= cluster.altitudeMin &&
            alt <= cluster.altitudeMax &&
            inc >= cluster.incMin &&
            inc <= cluster.incMax
          ) {
            intensity += cluster.fluxLevel === 'EXTREME' ? 0.85 : 0.55;
          } else {
            // Distance decay
            const dAlt = Math.min(Math.abs(alt - cluster.altitudeMin), Math.abs(alt - cluster.altitudeMax));
            const dInc = Math.min(Math.abs(inc - cluster.incMin), Math.abs(inc - cluster.incMax));
            if (dAlt < 120 && dInc < 10) {
              intensity += (1 - dAlt / 120) * (1 - dInc / 10) * 0.35;
            }
          }
        });

        intensity = Math.min(1.0, intensity);

        // Color mapper: dark blue -> cyan -> emerald -> orange -> red
        let color = 'rgba(11, 19, 41, 0.4)';
        if (intensity > 0.75) {
          color = `rgba(239, 68, 68, ${0.45 + intensity * 0.45})`;
        } else if (intensity > 0.5) {
          color = `rgba(245, 158, 11, ${0.4 + intensity * 0.4})`;
        } else if (intensity > 0.25) {
          color = `rgba(16, 185, 129, ${0.35 + intensity * 0.35})`;
        } else if (intensity > 0.1) {
          color = `rgba(0, 229, 255, ${0.2 + intensity * 0.3})`;
        }

        const x = padLeft + c * cellW;
        const y = padTop + r * cellH;

        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);
      }
    }

    // Y-Axis Labels (Altitude km)
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const altTicks = [1400, 1100, 800, 500, 200];
    altTicks.forEach((tickAlt) => {
      const yRatio = (altMax - tickAlt) / (altMax - altMin);
      const y = padTop + yRatio * plotH;
      ctx.fillText(`${tickAlt} km`, padLeft - 6, y);
    });

    // X-Axis Labels (Inclination deg)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const incTicks = [0, 28, 53, 70, 86, 98, 110];
    incTicks.forEach((tickInc) => {
      const xRatio = (tickInc - incMin) / (incMax - incMin);
      const x = padLeft + xRatio * plotW;
      ctx.fillText(`${tickInc}°`, x, height - padBottom + 6);
    });

    // Label Axes
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = '9px "Inter", sans-serif';
    ctx.fillText('Orbital Inclination (i)', padLeft + plotW / 2, height - padBottom + 20);

  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const padLeft = 55;
    const padRight = 20;
    const padTop = 15;
    const padBottom = 35;
    const plotW = rect.width - padLeft - padRight;
    const plotH = rect.height - padTop - padBottom;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (mx >= padLeft && mx <= rect.width - padRight && my >= padTop && my <= rect.height - padBottom) {
      const colFrac = (mx - padLeft) / plotW;
      const rowFrac = (my - padTop) / plotH;

      const inc = 0 + colFrac * 110;
      const alt = 1400 - rowFrac * 1200;

      // Find if matches a known cluster
      const matched = NOTABLE_CLUSTERS.find(
        (c) => alt >= c.altitudeMin - 40 && alt <= c.altitudeMax + 40 && inc >= c.incMin - 3 && inc <= c.incMax + 3
      );

      setHoveredCell({
        alt: Math.round(alt),
        inc: Math.round(inc * 10) / 10,
        cluster: matched,
        estimatedFlux: matched ? (matched.fluxLevel === 'EXTREME' ? 4.8e-6 : 2.1e-6) : 3.5e-7,
      });
    } else {
      setHoveredCell(null);
    }
  };

  return (
    <div className="chart-container-card">
      <div className="chart-header-row">
        <div className="chart-title-area">
          <ShieldAlert size={16} style={{ color: 'var(--status-critical)' }} />
          <div>
            <div className="chart-title-text">
              LEO Spatial Debris Flux Density Heatmap (Altitude vs. Inclination)
            </div>
            <div className="chart-subtitle-text">
              Trackable space debris density catalog (Objects &gt; 10 cm, MASTER-8 & DISCOS Models)
            </div>
          </div>
        </div>

        {/* Legend Bar */}
        <div className="heatmap-legend-scale">
          <span>Low (10⁻⁷ / km³)</span>
          <div className="heatmap-gradient-bar" />
          <span style={{ color: 'var(--status-critical)' }}>Extreme (10⁻⁵ / km³)</span>
        </div>
      </div>

      {/* Heatmap Canvas */}
      <div className="canvas-wrapper" style={{ height: '220px' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredCell(null)}
        />

        {hoveredCell && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '10px',
              background: 'rgba(7, 13, 27, 0.94)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '0.72rem',
              backdropFilter: 'blur(8px)',
              boxShadow: 'var(--shadow-glow-cyan)',
              zIndex: 10,
              minWidth: '220px',
            }}
          >
            <div style={{ color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Crosshair size={13} />
              <span>Alt: {hoveredCell.alt} km • Inc: {hoveredCell.inc}°</span>
            </div>

            {hoveredCell.cluster ? (
              <>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.74rem', marginBottom: '2px' }}>
                  {hoveredCell.cluster.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Cataloged Fragments:</span>
                  <span className="font-mono" style={{ color: 'var(--status-critical)', fontWeight: 700 }}>
                    {hoveredCell.cluster.objectCount.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>ISRO Assets Crossing:</span>
                  <span style={{ color: '#fff' }}>{hoveredCell.cluster.activeSatellites.join(', ')}</span>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-secondary)' }}>
                Nominal orbital background flux density. Low collision hazard for circular orbits.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', borderTop: '1px solid var(--space-border-subtle)', paddingTop: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Spatial Flux:</span>
              <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                {hoveredCell.estimatedFlux.toExponential(1)} obj/km³
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Cluster Quick Badges */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.7rem' }}>
        <span className="badge badge-critical" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertTriangle size={11} /> Fengyun-1C Debris (850km, 98°)
        </span>
        <span className="badge badge-critical" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertTriangle size={11} /> Iridium-Kosmos Belt (780km, 86°)
        </span>
        <span className="badge badge-warning">
          Megaconstellation Shell (550km, 53°)
        </span>
        <span className="badge badge-cyan">
          SSO Earth Observation Corridor (650km, 98°)
        </span>
      </div>
    </div>
  );
};
