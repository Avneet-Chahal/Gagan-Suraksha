import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  Flame,
  Shield,
  Clock,
  Layers,
  Radio,
  Info,
} from 'lucide-react';

interface IridiumCollisionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IridiumCollisionModal: React.FC<IridiumCollisionModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Time scrub state: -10s (approach) to +10s (debris dispersion) relative to TCA
  const [sliderTime, setSliderTime] = useState<number>(-5.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animation playback loop
  useEffect(() => {
    let animFrame: number;
    if (isPlaying) {
      const step = () => {
        setSliderTime((prev) => {
          if (prev >= 10.0) {
            setIsPlaying(false);
            return 10.0;
          }
          return Math.min(10.0, prev + 0.1);
        });
        animFrame = requestAnimationFrame(step);
      };
      animFrame = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying]);

  // Canvas visualizer rendering illustrative simulation
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear background
    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, width, height);

    // Draw coordinate grid / range rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let r = 40; r <= 160; r += 40) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Grid crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX - 170, centerY);
    ctx.lineTo(centerX + 170, centerY);
    ctx.moveTo(centerX, centerY - 130);
    ctx.lineTo(centerX, centerY + 130);
    ctx.stroke();

    // Trajectory angles: Iridium 33 heading South-East (~102 deg crossing angle)
    const angleIridium = -Math.PI / 4; // ~ -45 deg
    const angleCosmos = Math.PI / 3; // ~ +60 deg

    // Trajectory guide lines
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.beginPath();
    ctx.moveTo(centerX - Math.cos(angleIridium) * 160, centerY - Math.sin(angleIridium) * 160);
    ctx.lineTo(centerX + Math.cos(angleIridium) * 160, centerY + Math.sin(angleIridium) * 160);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.beginPath();
    ctx.moveTo(centerX - Math.cos(angleCosmos) * 160, centerY - Math.sin(angleCosmos) * 160);
    ctx.lineTo(centerX + Math.cos(angleCosmos) * 160, centerY + Math.sin(angleCosmos) * 160);
    ctx.stroke();
    ctx.setLineDash([]);

    if (sliderTime <= 0) {
      // Approach Phase (-10s to 0s)
      const distScale = Math.abs(sliderTime) * 14; // pixels from center

      // Iridium 33 position
      const irX = centerX - Math.cos(angleIridium) * distScale;
      const irY = centerY - Math.sin(angleIridium) * distScale;

      // Cosmos 2251 position
      const cosX = centerX - Math.cos(angleCosmos) * distScale;
      const cosY = centerY - Math.sin(angleCosmos) * distScale;

      // Draw Iridium 33 (Cyan)
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(irX, irY, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Draw Cosmos 2251 (Red)
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cosX, cosY, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Labels
      ctx.font = '10px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('IRIDIUM 33 (Active)', irX + 8, irY - 6);
      ctx.fillStyle = '#ef4444';
      ctx.fillText('COSMOS 2251 (Defunct)', cosX + 8, cosY + 14);

      // Distance line
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(irX, irY);
      ctx.lineTo(cosX, cosY);
      ctx.stroke();

      // Range text
      const separationKm = Math.max(0.584, Math.abs(sliderTime) * 11.6);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`Rel Distance: ${separationKm.toFixed(2)} km`, (irX + cosX) / 2 + 10, (irY + cosY) / 2);
    } else {
      // Impact & Debris Phase (> 0s)
      const explosionRadius = sliderTime * 14;

      // Shockwave ring
      ctx.strokeStyle = `rgba(255, 100, 50, ${Math.max(0, 1 - sliderTime / 10)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, explosionRadius * 0.8, 0, 2 * Math.PI);
      ctx.stroke();

      // Center impact blast flash
      if (sliderTime < 1.5) {
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - sliderTime / 1.5})`;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 18 * (1.5 - sliderTime), 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Debris particles
      const particleCount = 48;
      for (let i = 0; i < particleCount; i++) {
        const seedAngle = (i * 137.5 * Math.PI) / 180;
        const speed = 0.5 + ((i * 7) % 10) / 10;
        const pDist = sliderTime * 12 * speed;
        const px = centerX + Math.cos(seedAngle) * pDist;
        const py = centerY + Math.sin(seedAngle) * pDist;

        ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#ef4444';
        ctx.beginPath();
        ctx.arc(px, py, i % 3 === 0 ? 2.2 : 1.5, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.font = '11px monospace';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('COLLISION IMPACT — DEBRIS CLOUD DISPERSAL', centerX - 120, centerY - 80);
      ctx.fillStyle = 'var(--text-muted)';
      ctx.fillText(`Dispersal Radius: ${(sliderTime * 11.6).toFixed(1)} km`, centerX - 60, centerY + 85);
    }
  }, [sliderTime, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        className="mission-card"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          background: 'rgba(9, 16, 33, 0.96)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          boxShadow: '0 0 32px rgba(56, 189, 248, 0.2), 0 0 4px rgba(239, 68, 68, 0.3)',
          borderRadius: '10px',
          padding: '20px 24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
            paddingBottom: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Flame size={12} />
                HISTORICAL COLLISION REPLAY
              </span>
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                }}
              >
                10 FEB 2009 • 16:56 UTC
              </span>
            </div>
            <h1
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#ffffff',
                marginTop: '6px',
                marginBottom: '2px',
                letterSpacing: '-0.01em',
              }}
            >
              Iridium 33 × Cosmos 2251 Hypervelocity Collision
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              The first accidental hypervelocity collision between two artificial satellites in Earth orbit.
            </p>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Dramatic Event Summary Banner */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            background: 'rgba(3, 7, 18, 0.6)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(56, 189, 248, 0.15)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Date & Time</div>
            <div className="font-mono" style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
              10 Feb 2009, ~16:56 UTC
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Collision Altitude</div>
            <div className="font-mono" style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
              789 km (LEO)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Relative Velocity</div>
            <div className="font-mono" style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>
              ~11.6 km/s (41,760 km/h)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Predicted Miss (Pre-Event)</div>
            <div className="font-mono" style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>
              584 metres
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Primary Outcome</div>
            <div className="font-mono" style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>
              Total Destruction
            </div>
          </div>
        </div>

        {/* 2. Two Satellite Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Iridium 33 Card */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '8px',
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={14} style={{ color: '#38bdf8' }} />
                <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.9rem' }}>IRIDIUM 33</span>
              </div>
              <span className="badge badge-operational" style={{ fontSize: '0.65rem' }}>
                OPERATIONAL (Pre-Collision)
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Country / Operator:</strong> United States / Iridium Communications</div>
              <div><strong>Role:</strong> Commercial voice/data constellation satellite</div>
              <div><strong>Spacecraft Wet Mass:</strong> ~556 kg</div>
              <div><strong>Orbit / Inclination:</strong> 780 km circular • 86.4° polar LEO</div>
              <div><strong>Operational State:</strong> Fully active and relaying commercial voice/data at time of impact.</div>
            </div>
          </div>

          {/* Cosmos 2251 Card */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={14} style={{ color: '#ef4444' }} />
                <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.9rem' }}>COSMOS 2251</span>
              </div>
              <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                DEFUNCT / DERELICT
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Country / Operator:</strong> Russia / Russian Space Forces</div>
              <div><strong>Role:</strong> Strela-2M military communications satellite</div>
              <div><strong>Spacecraft Mass:</strong> ~900 kg</div>
              <div><strong>Orbit / Inclination:</strong> 790 km circular • 74.0° LEO</div>
              <div><strong>Operational State:</strong> Decommissioned ~1995; drifting un-maneuverable and uncontrolled.</div>
            </div>
          </div>
        </div>

        {/* 3. Historical Event Replay Section */}
        <div
          style={{
            background: 'rgba(3, 7, 18, 0.65)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '8px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: '#38bdf8' }} />
              <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>
                Historical Event Replay
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                Illustrative visualization, NOT a verified orbital reconstruction
              </span>
            </div>

            <div className="font-mono" style={{ fontSize: '0.78rem', color: sliderTime === 0 ? '#ef4444' : '#38bdf8' }}>
              TCA offset: {sliderTime >= 0 ? `+${sliderTime.toFixed(1)}s` : `${sliderTime.toFixed(1)}s`}
            </div>
          </div>

          {/* Canvas Animation */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <canvas
              ref={canvasRef}
              width={640}
              height={220}
              style={{
                width: '100%',
                maxWidth: '640px',
                height: '220px',
                borderRadius: '6px',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                background: '#050b14',
              }}
            />
          </div>

          {/* Time Scrub Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn-aerospace"
              onClick={() => setIsPlaying(!isPlaying)}
              style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              className="btn-aerospace"
              onClick={() => {
                setSliderTime(-5.0);
                setIsPlaying(false);
              }}
              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
              title="Reset to 5 seconds before collision"
            >
              <RotateCcw size={12} />
            </button>

            <input
              type="range"
              min={-10.0}
              max={10.0}
              step={0.1}
              value={sliderTime}
              onChange={(e) => {
                setIsPlaying(false);
                setSliderTime(parseFloat(e.target.value));
              }}
              style={{ flex: 1, accentColor: '#38bdf8', cursor: 'pointer' }}
            />

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="btn-aerospace"
                onClick={() => setSliderTime(-1.0)}
                style={{ padding: '2px 6px', fontSize: '0.68rem' }}
              >
                -1s
              </button>
              <button
                className="btn-aerospace"
                onClick={() => setSliderTime(0.0)}
                style={{ padding: '2px 6px', fontSize: '0.68rem', borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444' }}
              >
                TCA (0s)
              </button>
              <button
                className="btn-aerospace"
                onClick={() => setSliderTime(2.0)}
                style={{ padding: '2px 6px', fontSize: '0.68rem' }}
              >
                +2s
              </button>
            </div>
          </div>
        </div>

        {/* 4. Timeline: Predicted Close Approach → Collision → Debris Generation */}
        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} style={{ color: '#38bdf8' }} />
            Event Chronology Timeline
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', fontSize: '0.72rem' }}>
            <div style={{ borderLeft: '2px solid #f59e0b', paddingLeft: '8px' }}>
              <div style={{ color: '#f59e0b', fontWeight: 600 }}>1. Pre-Event Predicted Close Approach</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                Prior screening identified a predicted close approach of 584 m. With large covariance positional uncertainties for uncooperative defunct satellites and dozens of similar daily conjunctions, no avoidance burn was performed.
              </div>
            </div>

            <div style={{ borderLeft: '2px solid #ef4444', paddingLeft: '8px' }}>
              <div style={{ color: '#ef4444', fontWeight: 600 }}>2. Hypervelocity Impact (16:56 UTC)</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                Both spacecraft collided at ~102° angle above northern Siberia (789 km altitude) at ~11.6 km/s. The kinetic energy instantaneously shattered both structures.
              </div>
            </div>

            <div style={{ borderLeft: '2px solid #38bdf8', paddingLeft: '8px' }}>
              <div style={{ color: '#38bdf8', fontWeight: 600 }}>3. Debris Generation & Dispersion</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                Produced over 2,000 catalogued fragments (&gt;10 cm) and hundreds of thousands of smaller lethal fragments that rapidly dispersed into a persistent toroidal debris belt.
              </div>
            </div>
          </div>
        </div>

        {/* 5. Debris Impact Section */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px 14px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 700, marginBottom: '6px' }}>
            <AlertTriangle size={15} />
            Long-Term Orbital Impact & Spaceflight Danger
          </div>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Because the collision occurred at an altitude of 789 km where atmospheric drag is very low, fragments take decades to centuries to decay. The event increased the tracked catalog in Low Earth Orbit by approximately 15%, significantly elevating collision risk for the International Space Station (ISS) and Sun-Synchronous Earth observation satellites. It became a watershed moment that prompted global deployment of automated conjunction assessment systems like NASA CARA and ISRO NETRA.
          </p>
        </div>

        {/* 6. Data Sources & Provenance Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            borderTop: '1px solid rgba(56, 189, 248, 0.15)',
            paddingTop: '12px',
            fontSize: '0.72rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Data Sources:</span>
            <a
              href="https://celestrak.org/events/collision/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>CelesTrak Collision Report</span>
              <ExternalLink size={11} />
            </a>
            <a
              href="https://ntrs.nasa.gov/citations/20100008433"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>NASA Technical Report (NTRS 20100008433)</span>
              <ExternalLink size={11} />
            </a>
          </div>

          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={12} style={{ color: '#38bdf8' }} />
            <span>Historical facts sourced from CelesTrak and NASA. Live backend connection is not implied.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
