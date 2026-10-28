import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { DEMO_GROUND_PASSES, DEMO_CLOSE_APPROACHES } from '../../data/mockData';
import { fetchCloseApproaches, fetchGroundPasses } from '../../services/api';
import { CloseApproach, GroundPass } from '../../types';

export const PassesAndConjunctionsCard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Orbit' | 'Passes' | 'Conjunctions' | 'TLE' | 'Ephemeris'>('Passes');
  const [conjunctions, setConjunctions] = useState<CloseApproach[]>(DEMO_CLOSE_APPROACHES);
  const [passes, setPasses] = useState<GroundPass[]>(DEMO_GROUND_PASSES);

  useEffect(() => {
    let isMounted = true;
    fetchCloseApproaches('all').then((data) => {
      if (isMounted && data && data.length > 0) {
        setConjunctions(data);
      }
    });
    fetchGroundPasses('43111').then((data) => {
      if (isMounted && data && data.length > 0) {
        setPasses(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="passes-card mission-card">
      <div>
        {/* Top Header with Tabs & View All */}
        <div className="card-top-action-bar">
          <div className="tabs-header-bar" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            {(['Orbit', 'Passes', 'Conjunctions', 'TLE', 'Ephemeris'] as const).map((tab) => (
              <button
                key={tab}
                className={`tab-pill-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'Conjunctions' ? 'Close Approaches' : tab}
              </button>
            ))}
          </div>

          <a href="/close-approaches" className="section-link">
            <span>View All</span>
            <ChevronRight size={13} />
          </a>
        </div>

        {/* Section Title */}
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
          {activeTab === 'Passes' && 'Upcoming Passes (next 24 hours)'}
          {activeTab === 'Conjunctions' && 'Upcoming Close Approaches & Conjunction Risks'}
          {activeTab === 'Orbit' && 'Orbital Track Prediction Comparison'}
          {activeTab === 'TLE' && 'Two-Line Element Set (TLE) - Epoch 2025-04-27'}
          {activeTab === 'Ephemeris' && 'OEM Ephemeris State Vectors (J2000)'}
        </div>

        {/* 1. Passes Tab Table matching screenshot */}
        {activeTab === 'Passes' && (
          <table className="space-table">
            <thead>
              <tr>
                <th>AOS (UTC)</th>
                <th>LOS (UTC)</th>
                <th>Duration</th>
                <th>Max Elev.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((pass) => (
                <tr key={pass.id}>
                  <td className="font-mono">{pass.aosUtc}</td>
                  <td className="font-mono">{pass.losUtc}</td>
                  <td className="font-mono">{pass.duration}</td>
                  <td className="font-mono">{pass.maxElevationDeg}°</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        className="status-dot"
                        style={{
                          backgroundColor: pass.status === 'Upcoming' ? 'var(--status-operational)' : '#64748b',
                          boxShadow: pass.status === 'Upcoming' ? '0 0 6px var(--status-operational)' : 'none',
                        }}
                      ></span>
                      <span style={{ color: pass.status === 'Upcoming' ? '#ffffff' : 'var(--text-muted)', fontSize: '0.72rem' }}>
                        {pass.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 2. Conjunctions / Close Approaches Tab Table */}
        {activeTab === 'Conjunctions' && (
          <table className="space-table">
            <thead>
              <tr>
                <th>Chaser Debris</th>
                <th>TCA (UTC)</th>
                <th>Miss Distance</th>
                <th>Relative Vel</th>
                <th>Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {conjunctions.slice(0, 10).map((ca) => (
                <tr key={ca.id}>
                  <td style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{ca.chaserObject}</td>
                  <td className="font-mono">{ca.tcaUtc}</td>
                  <td className="font-mono" style={{ color: ca.missDistanceKm < 1 ? 'var(--status-critical)' : 'inherit', fontWeight: 600 }}>
                    {ca.missDistanceKm.toFixed(2)} km
                  </td>
                  <td className="font-mono">{ca.relativeVelocityKmS} km/s</td>
                  <td>
                    <span
                      className={`badge ${
                        ca.riskLevel === 'HIGH' || ca.riskLevel === 'CRITICAL'
                          ? 'badge-critical'
                          : ca.riskLevel === 'MEDIUM'
                          ? 'badge-warning'
                          : 'badge-operational'
                      }`}
                    >
                      {ca.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 3. Orbit Prediction Comparison Chart view */}
        {activeTab === 'Orbit' && (
          <div style={{ background: 'rgba(3, 7, 18, 0.4)', borderRadius: '6px', padding: '12px', fontSize: '0.72rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Propagator Residual Deviation:</span>
              <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>SGP4 vs Numerical (RMS: 18.4 m)</span>
            </div>
            <div style={{ height: '70px', display: 'flex', alignItems: 'flex-end', gap: '4px', paddingBottom: '4px' }}>
              {[12, 16, 14, 18, 22, 19, 25, 28, 24, 30, 27, 32, 29, 35, 31, 38, 34, 40].map((val, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: `${val * 1.6}px`,
                    background: idx > 12 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(0, 229, 255, 0.65)',
                    borderRadius: '2px',
                  }}
                  title={`Step ${idx}: Residual ${val}m`}
                ></div>
              ))}
            </div>
          </div>
        )}

        {/* 4. TLE View */}
        {activeTab === 'TLE' && (
          <pre
            className="font-mono"
            style={{
              background: 'rgba(3, 7, 18, 0.75)',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '0.67rem',
              color: 'var(--accent-cyan)',
              overflowX: 'auto',
              lineHeight: 1.4,
              border: '1px solid var(--space-border-subtle)',
            }}
          >
            {`1 43218U 22056A   25117.35020833  .00001420  00000-0  85420-4 0  9991\n2 43218  98.7124  45.2180 0012000  84.2150 276.1240 15.20590000124803`}
          </pre>
        )}

        {/* 5. Ephemeris View */}
        {activeTab === 'Ephemeris' && (
          <div className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', background: 'rgba(3, 7, 18, 0.75)', padding: '10px', borderRadius: '6px' }}>
            <div>EPOCH: 2025-04-27T08:24:36.000Z</div>
            <div>X: +4281.421 km | VX: -2.412 km/s</div>
            <div>Y: -3120.184 km | VY: +5.892 km/s</div>
            <div>Z: +4102.942 km | VZ: +4.108 km/s</div>
          </div>
        )}
      </div>

      {/* 6. Orbital Parameters Bottom Strip matching reference */}
      <div className="orbital-params-strip">
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Orbital Parameters</div>
        <div className="orbital-params-values">
          <div className="orbital-param-box">
            <span className="param-tiny-label">Semi-major axis</span>
            <span className="param-tiny-val">6,878.1 km</span>
          </div>
          <div className="orbital-param-box">
            <span className="param-tiny-label">Apogee</span>
            <span className="param-tiny-val">548.7 km</span>
          </div>
          <div className="orbital-param-box">
            <span className="param-tiny-label">Perigee</span>
            <span className="param-tiny-val">536.4 km</span>
          </div>
          <div className="orbital-param-box">
            <span className="param-tiny-label">Period</span>
            <span className="param-tiny-val">94.7 min</span>
          </div>
        </div>
      </div>
    </div>
  );
};
