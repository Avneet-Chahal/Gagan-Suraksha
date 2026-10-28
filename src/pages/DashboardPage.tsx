import React, { useState } from 'react';
import { EarthVisualization } from '../components/dashboard/EarthVisualization';
import { SatelliteIdentityCard } from '../components/dashboard/SatelliteIdentityCard';
import { TelemetryAttitudeCard } from '../components/dashboard/TelemetryAttitudeCard';
import { PassesAndConjunctionsCard } from '../components/dashboard/PassesAndConjunctionsCard';
import { LiveImageryCard } from '../components/dashboard/LiveImageryCard';
import { MissionStatusCard } from '../components/dashboard/MissionStatusCard';
import { SpaceWeatherAndRiskModal } from '../components/dashboard/SpaceWeatherAndRiskModal';
import { DEMO_PRIMARY_SATELLITE } from '../data/mockData';
import { Satellite } from '../types';
import { Sun, ShieldAlert, Database, Flame, Calendar as CalendarIcon } from 'lucide-react';
import { IridiumCollisionModal } from '../components/modals/IridiumCollisionModal';
import { HistoricalDateExplorer } from '../components/dashboard/HistoricalDateExplorer';

export const DashboardPage: React.FC = () => {
  const [selectedSatellite, setSelectedSatellite] = useState<Satellite>(DEMO_PRIMARY_SATELLITE);
  const [activeModal, setActiveModal] = useState<'weather' | 'risk' | 'sources' | null>(null);
  const [isIridiumModalOpen, setIsIridiumModalOpen] = useState<boolean>(false);
  const [isDateExplorerOpen, setIsDateExplorerOpen] = useState<boolean>(false);

  return (
    <div className="dashboard-root">
      {/* Quick Astrodynamics Action Strip */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '-4px', flexWrap: 'wrap' }}>
        <button
          className="btn-aerospace"
          onClick={() => setIsDateExplorerOpen(true)}
          style={{
            padding: '4px 12px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(16, 185, 129, 0.2))',
            borderColor: '#38bdf8',
            color: '#ffffff',
            boxShadow: '0 0 12px rgba(56, 189, 248, 0.3)',
            letterSpacing: '0.03em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
          title="Open Historical Date Explorer & Real-Life Incidents Library"
        >
          <CalendarIcon size={14} style={{ color: '#38bdf8' }} />
          <span>DATE EXPLORER / INCIDENTS</span>
        </button>

        <button
          className="btn-aerospace"
          onClick={() => setIsIridiumModalOpen(true)}
          style={{
            padding: '4px 12px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(56, 189, 248, 0.2))',
            borderColor: '#ef4444',
            color: '#ffffff',
            boxShadow: '0 0 12px rgba(239, 68, 68, 0.35)',
            letterSpacing: '0.03em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
          title="Open Historical Iridium 33 x Cosmos 2251 Collision Replay"
        >
          <Flame size={14} style={{ color: '#ef4444' }} />
          <span>IRIDIUM COLLISION REPLAY</span>
        </button>

        <button
          className="btn-aerospace"
          onClick={() => setActiveModal('weather')}
          style={{ padding: '3px 9px', fontSize: '0.7rem' }}
          title="Open Space Weather & Atmospheric Drag Analysis"
        >
          <Sun size={13} style={{ color: 'var(--status-warning)' }} />
          <span>Space Weather (Kp 2.3)</span>
        </button>

        <button
          className="btn-aerospace"
          onClick={() => setActiveModal('risk')}
          style={{ padding: '3px 9px', fontSize: '0.7rem', borderColor: 'rgba(239, 68, 68, 0.4)' }}
          title="Open Conjunction Risk CA-101 Assessment"
        >
          <ShieldAlert size={13} style={{ color: 'var(--status-critical)' }} />
          <span style={{ color: 'var(--status-critical)' }}>Collision Risk Alert</span>
        </button>

        <button
          className="btn-aerospace"
          onClick={() => setActiveModal('sources')}
          style={{ padding: '3px 9px', fontSize: '0.7rem' }}
          title="Inspect Data Source Locks & Health"
        >
          <Database size={13} style={{ color: 'var(--accent-cyan)' }} />
          <span>Data Sources</span>
        </button>
      </div>

      {/* 1. Upper Section Grid: Left (Identity), Center (3D Earth), Right (Telemetry) */}
      <div className="dashboard-top-grid">
        <SatelliteIdentityCard satellite={selectedSatellite} />
        <EarthVisualization
          satellite={selectedSatellite}
          onSelectSatellite={(sat) => setSelectedSatellite(sat)}
        />
        <TelemetryAttitudeCard satellite={selectedSatellite} />
      </div>

      {/* 2. Lower Section Grid: Left (Passes/Orbits), Center (Live Imagery), Right (Mission Status) */}
      <div className="dashboard-bottom-grid">
        <PassesAndConjunctionsCard />
        <LiveImageryCard />
        <MissionStatusCard />
      </div>

      {/* 3. Space Weather / Collision Risk / Data Sources Inspection Modal */}
      <SpaceWeatherAndRiskModal
        type={activeModal}
        onClose={() => setActiveModal(null)}
      />

      {/* 4. Dedicated Historical Iridium 33 x Cosmos 2251 Collision Replay Modal */}
      <IridiumCollisionModal
        isOpen={isIridiumModalOpen}
        onClose={() => setIsIridiumModalOpen(false)}
      />

      {/* 5. Historical Date Explorer & Incidents Library Modal */}
      <HistoricalDateExplorer
        isOpen={isDateExplorerOpen}
        onClose={() => setIsDateExplorerOpen(false)}
        onOpenIridiumReplay={() => {
          setIsDateExplorerOpen(false);
          setIsIridiumModalOpen(true);
        }}
      />
    </div>
  );
};
