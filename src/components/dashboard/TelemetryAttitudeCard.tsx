import React, { useState } from 'react';
import { Satellite } from '../../types';


interface TelemetryAttitudeCardProps {
  satellite: Satellite;
}

export const TelemetryAttitudeCard: React.FC<TelemetryAttitudeCardProps> = ({ satellite }) => {
  const [activeTab, setActiveTab] = useState<'Telemetry' | 'Attitude' | 'Thermal' | 'Power' | 'Comm'>('Telemetry');

  return (
    <div className="telemetry-card mission-card">
      {/* 1. Tabs Header Bar */}
      <div className="tabs-header-bar">
        {(['Telemetry', 'Attitude', 'Thermal', 'Power', 'Comm'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab-pill-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 2. Main Parameters Area */}
      <div className="telemetry-grid-dual">
        {/* Left Column: Orbital Telemetry */}
        <div className="telemetry-col-left">
          <div className="param-row">
            <span className="param-name">Altitude (mean)</span>
            <span className="param-val">{satellite.altitudeKm} km</span>
          </div>
          <div className="param-row">
            <span className="param-name">Velocity</span>
            <span className="param-val">{satellite.velocityKmS} km/s</span>
          </div>
          <div className="param-row">
            <span className="param-name">Inclination</span>
            <span className="param-val">{satellite.inclination}°</span>
          </div>
          <div className="param-row">
            <span className="param-name">Eccentricity</span>
            <span className="param-val">{satellite.eccentricity}</span>
          </div>
          <div className="param-row">
            <span className="param-name">Period</span>
            <span className="param-val">{satellite.periodMin} min</span>
          </div>
          <div className="param-row">
            <span className="param-name">Latitude</span>
            <span className="param-val">{satellite.latitude.toFixed(3)}° N</span>
          </div>
          <div className="param-row">
            <span className="param-name">Longitude</span>
            <span className="param-val">{satellite.longitude.toFixed(3)}° E</span>
          </div>
          <div className="param-row">
            <span className="param-name">Ground Track Rate</span>
            <span className="param-val">{satellite.groundTrackRateKmS} km/s</span>
          </div>
        </div>

        {/* Right Column: Attitude & Power Systems */}
        <div className="telemetry-col-right">
          {/* Attitude (ECI) */}
          <div>
            <div className="sub-section-title">Attitude (ECI)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div className="param-row">
                <span className="param-name">Roll</span>
                <span className="param-val">0.12°</span>
              </div>
              <div className="param-row">
                <span className="param-name">Pitch</span>
                <span className="param-val">-0.08°</span>
              </div>
              <div className="param-row">
                <span className="param-name">Yaw</span>
                <span className="param-val">0.03°</span>
              </div>
              <div style={{ marginTop: '3px' }}>
                <span className="param-name" style={{ fontSize: '0.67rem' }}>Angular Rate</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '6px', marginTop: '2px' }}>
                  <div className="param-row">
                    <span className="param-name" style={{ fontSize: '0.66rem' }}>Roll</span>
                    <span className="param-val" style={{ fontSize: '0.68rem' }}>0.0002 °/s</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name" style={{ fontSize: '0.66rem' }}>Pitch</span>
                    <span className="param-val" style={{ fontSize: '0.68rem' }}>-0.0001 °/s</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name" style={{ fontSize: '0.66rem' }}>Yaw</span>
                    <span className="param-val" style={{ fontSize: '0.68rem' }}>0.0003 °/s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Power System */}
          <div>
            <div className="sub-section-title">Power System</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div className="param-row">
                <span className="param-name">Solar Array</span>
                <span className="param-val" style={{ color: 'var(--status-operational)' }}>98%</span>
              </div>
              <div className="param-row">
                <span className="param-name">Battery</span>
                <span className="param-val" style={{ color: 'var(--status-operational)' }}>86%</span>
              </div>
              <div className="param-row">
                <span className="param-name">Bus Voltage</span>
                <span className="param-val">28.4 V</span>
              </div>
              <div className="param-row">
                <span className="param-name">Bus Current</span>
                <span className="param-val">4.2 A</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Communication Section */}
      <div className="comm-section">
        <div className="comm-header">Communication</div>
        <div className="comm-row">
          <span className="param-name">Uplink</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="param-val">8.402 GHz (S-band)</span>
            <span className="badge badge-operational">LOCKED</span>
          </div>
        </div>
        <div className="comm-row">
          <span className="param-name">Downlink</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="param-val">8.255 GHz (S-band)</span>
            <span className="badge badge-operational">LOCKED</span>
          </div>
        </div>
        <div className="comm-row">
          <span className="param-name">Signal Strength (C/N₀)</span>
          <span className="param-val">45.2 dBHz</span>
        </div>
        <div className="comm-row">
          <span className="param-name">Data Rate</span>
          <span className="param-val">12.6 Mbps</span>
        </div>
      </div>
    </div>
  );
};
