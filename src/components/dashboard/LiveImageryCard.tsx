import React, { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export const LiveImageryCard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Live Imagery' | 'Recent Images' | 'Analysis'>('Live Imagery');
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="live-imagery-card mission-card">
      <div>
        {/* Tabs Bar */}
        <div className="card-top-action-bar">
          <div className="tabs-header-bar" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            {(['Live Imagery', 'Recent Images', 'Analysis'] as const).map((tab) => (
              <button
                key={tab}
                className={`tab-pill-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
              RGB
            </span>
            <button
              className="icon-button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'View Full Image'}
              style={{ padding: '2px' }}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>

        {/* Optical Imagery Frame */}
        <div className="imagery-preview-frame">
          <img
            src="/satellite_optical_capture.jpg"
            alt="Live Optical Earth Observation Sensor Capture"
          />
        </div>
      </div>

      {/* Imagery Footer Strip */}
      <div className="imagery-footer-strip">
        <div>Captured: <span>08:21:14 UTC</span></div>
        <div>Resolution: <span>1.2 m / px</span></div>
        <div>Swath: <span>12.8 km</span></div>
      </div>

      {/* Fullscreen Modal if toggled */}
      {isFullscreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(3, 7, 18, 0.95)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setIsFullscreen(false)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--accent-cyan)', boxShadow: 'var(--shadow-glow-cyan)' }}>
            <img
              src="/satellite_optical_capture.jpg"
              alt="High Resolution Satellite Capture Full View"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 18px', background: 'rgba(7, 13, 27, 0.85)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <div>Mission: <strong>EO-2025-0417</strong> • Primary Multispectral Imager</div>
              <div>Click anywhere to close</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
