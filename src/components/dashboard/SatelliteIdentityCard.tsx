import React from 'react';
import { Orbit, Compass } from 'lucide-react';
import { Satellite } from '../../types';

interface SatelliteIdentityCardProps {
  satellite: Satellite;
}

export const SatelliteIdentityCard: React.FC<SatelliteIdentityCardProps> = ({ satellite }) => {
  return (
    <div className="sat-identity-card mission-card">
      {/* 1. Header & Identity Block */}
      <div className="sat-header-row">
        <div className="sat-3d-icon-box" title="Primary Active Asset">
          <Orbit size={24} />
        </div>
        <div className="sat-main-meta">
          <div className="sat-title-status">
            <span className="sat-name-text">{satellite.name}</span>
            <span className="badge badge-operational">OPERATIONAL</span>
          </div>
          <div className="sat-type-text">
            {satellite.type} • {satellite.orbitType === 'SSO' ? 'Sun-Synchronous' : satellite.orbitType} • {satellite.inclination}° inclination
          </div>
        </div>
        <div className="norad-metadata-block">
          <div>NORAD ID <span>{satellite.noradId}</span></div>
          <div>COSPAR <span>{satellite.cosparId}</span></div>
          <div>Launch <span>{satellite.launchDate}</span></div>
        </div>
      </div>

      {/* 2. Next Pass Subcard */}
      <div className="next-pass-subcard">
        <div className="next-pass-header">
          <span className="next-pass-title">Next Pass (HBK)</span>
          <span className="next-pass-countdown">in 12m 43s</span>
        </div>
        <div className="pass-stat-row">
          <span>AOS</span>
          <span className="stat-value">08:37:19 UTC</span>
        </div>
        <div className="pass-stat-row">
          <span>LOS</span>
          <span className="stat-value">08:48:02 UTC</span>
        </div>
        <div className="pass-stat-row">
          <span>Duration</span>
          <span className="stat-value">10m 43s</span>
        </div>
        <div className="pass-stat-row">
          <span>Max Elevation</span>
          <span className="stat-value">78.3°</span>
        </div>
      </div>

      {/* 3. Ground Track Subcard with 2D Visualizer */}
      <div className="ground-track-subcard">
        <div className="ground-track-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontWeight: 600, color: '#ffffff' }}>Ground Track</span>
          </div>
          <div className="ground-track-coords">
            <div>Lat {satellite.latitude.toFixed(3)}° N</div>
            <div>Lon {satellite.longitude.toFixed(3)}° E</div>
          </div>
        </div>

        {/* 2D Mini World Map Projection */}
        <div className="ground-track-canvas-container">
          <svg
            viewBox="0 0 280 110"
            width="100%"
            height="100%"
            style={{ display: 'block', background: '#040b1c' }}
          >
            {/* Equirectangular continent silhouettes */}
            <defs>
              <linearGradient id="orbitLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#00e5ff" stopOpacity="1" />
                <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.3" />
              </linearGradient>
              <pattern id="gridPattern" width="28" height="22" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 22" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="0.5" />
              </pattern>
            </defs>

            <rect width="280" height="110" fill="url(#gridPattern)" />

            {/* Stylized continent polygons */}
            <path
              d="M 30,22 Q 45,15 65,22 Q 80,35 70,55 Q 50,50 35,38 Z"
              fill="rgba(56, 189, 248, 0.12)"
              stroke="rgba(56, 189, 248, 0.22)"
              strokeWidth="0.8"
            />
            {/* South America */}
            <path
              d="M 60,60 Q 75,62 70,85 Q 60,100 55,80 Z"
              fill="rgba(56, 189, 248, 0.12)"
              stroke="rgba(56, 189, 248, 0.22)"
              strokeWidth="0.8"
            />
            {/* Eurasia & Africa */}
            <path
              d="M 120,18 Q 170,12 210,25 Q 190,50 160,42 Q 135,35 120,18 Z"
              fill="rgba(56, 189, 248, 0.12)"
              stroke="rgba(56, 189, 248, 0.22)"
              strokeWidth="0.8"
            />
            <path
              d="M 125,45 Q 155,46 150,75 Q 135,88 126,65 Z"
              fill="rgba(56, 189, 248, 0.12)"
              stroke="rgba(56, 189, 248, 0.22)"
              strokeWidth="0.8"
            />
            {/* Australia */}
            <path
              d="M 215,68 Q 240,65 240,85 Q 220,88 215,68 Z"
              fill="rgba(56, 189, 248, 0.12)"
              stroke="rgba(56, 189, 248, 0.22)"
              strokeWidth="0.8"
            />

            {/* Ground Track Wave Curve */}
            <path
              d="M 10,95 Q 60,20 120,35 T 220,95 T 275,30"
              fill="none"
              stroke="url(#orbitLineGrad)"
              strokeWidth="1.8"
            />

            {/* Coverage Radius Circle */}
            <circle
              cx="145"
              cy="48"
              r="22"
              fill="rgba(2, 132, 199, 0.18)"
              stroke="rgba(0, 229, 255, 0.4)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />

            {/* Satellite Current Position Marker */}
            <circle cx="145" cy="48" r="4.5" fill="#10b981" />
            <circle cx="145" cy="48" r="8" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.6">
              <animate attributeName="r" values="4;10;4" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="2.5s" repeatCount="indefinite" />
            </circle>

            {/* Ground Station Hartebeesthoek Marker */}
            <circle cx="140" cy="74" r="3" fill="#0284c7" />
            <text x="146" y="77" fill="#94a3b8" fontSize="6" fontFamily="var(--font-mono)">
              HBK
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="ground-track-legend">
          <div className="legend-item">
            <span className="legend-dot-green"></span>
            <span>Current Position</span>
          </div>
          <div className="legend-item">
            <span className="legend-line-cyan"></span>
            <span>Ground Track</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot-blue"></span>
            <span>Coverage</span>
          </div>
        </div>
      </div>
    </div>
  );
};
