import React from 'react';
import { ChevronRight } from 'lucide-react';

export const MissionStatusCard: React.FC = () => {
  return (
    <div className="mission-status-card mission-card">
      {/* 1. Header & Stepper */}
      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
          Mission Status
        </div>

        <div className="mission-timeline-stepper">
          <div className="stepper-line"></div>
          <div className="stepper-line-active"></div>

          {/* Node 1 */}
          <div className="stepper-node">
            <div className="node-bullet completed"></div>
            <span className="node-label">Acquisition</span>
            <span className="node-subtext">Completed<br />08:12</span>
          </div>

          {/* Node 2 */}
          <div className="stepper-node">
            <div className="node-bullet completed"></div>
            <span className="node-label">Tracking</span>
            <span className="node-subtext">Completed<br />08:15</span>
          </div>

          {/* Node 3 */}
          <div className="stepper-node">
            <div className="node-bullet in-progress"></div>
            <span className="node-label" style={{ color: 'var(--accent-cyan)' }}>Imaging</span>
            <span className="node-subtext" style={{ color: 'var(--accent-cyan)' }}>In Progress<br />08:21</span>
          </div>

          {/* Node 4 */}
          <div className="stepper-node">
            <div className="node-bullet"></div>
            <span className="node-label">Downlink</span>
            <span className="node-subtext">Pending<br />08:32</span>
          </div>
        </div>
      </div>

      {/* 2. Payloads & Sensors */}
      <div>
        <div className="sub-section-title" style={{ marginBottom: '6px' }}>Payloads & Sensors</div>
        <div className="payloads-list">
          <div className="payload-item">
            <div className="payload-meta">
              <span className="payload-name">Optical Camera (PAN)</span>
              <span className="payload-specs">Resolution 1.2 m | FOV 12.8 km</span>
            </div>
            <span className="badge badge-operational">ACTIVE</span>
          </div>

          <div className="payload-item">
            <div className="payload-meta">
              <span className="payload-name">Multispectral (MS)</span>
              <span className="payload-specs">Resolution 4.0 m | FOV 38.5 km</span>
            </div>
            <span className="badge badge-operational">ACTIVE</span>
          </div>

          <div className="payload-item">
            <div className="payload-meta">
              <span className="payload-name">SAR (Synthetic Aperture Radar)</span>
              <span className="payload-specs">Resolution 3.0 m | FOV 25.0 km</span>
            </div>
            <span className="badge badge-standby">STANDBY</span>
          </div>
        </div>
      </div>

      {/* 3. Recent Events */}
      <div>
        <div className="card-top-action-bar" style={{ marginBottom: '6px' }}>
          <div className="sub-section-title" style={{ margin: 0 }}>Recent Events</div>
          <a href="/alerts" className="section-link">
            <span>View All</span>
            <ChevronRight size={13} />
          </a>
        </div>

        <div className="recent-events-list">
          <div className="event-row">
            <span className="event-time">08:21:14</span>
            <span>Image capture completed (Mission: EO-2025-0417)</span>
          </div>
          <div className="event-row">
            <span className="event-time">08:19:03</span>
            <span>Attitude adjustment (ΔV: 0.002 m/s)</span>
          </div>
          <div className="event-row">
            <span className="event-time">08:15:22</span>
            <span>Downlink session started (8.255 GHz)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
