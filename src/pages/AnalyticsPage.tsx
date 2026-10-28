import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, Download, Database } from 'lucide-react';
import { TrajectoryDivergenceCanvas } from '../components/analytics/TrajectoryDivergenceCanvas';
import { CatalogPopulationStats } from '../components/analytics/CatalogPopulationStats';
import { DebrisFluxDensityHeatmap } from '../components/analytics/DebrisFluxDensityHeatmap';
import { SpaceWeatherCorrelationCard } from '../components/analytics/SpaceWeatherCorrelationCard';
import { ConjunctionHistoricalTrends } from '../components/analytics/ConjunctionHistoricalTrends';
import { PropellantBudgetEstimator } from '../components/analytics/PropellantBudgetEstimator';
import { AnalyticsConjunctionsTable } from '../components/analytics/AnalyticsConjunctionsTable';
import { DEMO_SATELLITES_LIST, DEMO_CLOSE_APPROACHES } from '../data/mockData';
import { fetchCloseApproaches, fetchSatellitesList } from '../services/api';
import { CloseApproach, Satellite } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [selectedHorizonHours, setSelectedHorizonHours] = useState<number>(48);
  const [selectedSatId, setSelectedSatId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PROPAGATOR' | 'CATALOG' | 'DEBRIS_FLUX' | 'WEATHER' | 'TABLE'>('ALL');
  const [conjunctions, setConjunctions] = useState<CloseApproach[]>(DEMO_CLOSE_APPROACHES);
  const [satellites, setSatellites] = useState<Satellite[]>(DEMO_SATELLITES_LIST);

  useEffect(() => {
    let isMounted = true;
    fetchCloseApproaches('all').then((data) => {
      if (isMounted && data && data.length > 0) {
        setConjunctions(data);
      }
    });
    fetchSatellitesList().then((data) => {
      if (isMounted && data && data.length > 0) {
        setSatellites(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered Conjunctions
  const filteredEncounters = useMemo(() => {
    if (selectedSatId === 'ALL') return conjunctions;
    const sat = satellites.find((s) => s.id === selectedSatId);
    if (!sat) return conjunctions;
    return conjunctions.filter(
      (ca) => ca.targetObject.toLowerCase().includes(sat.name.toLowerCase()) || ca.targetNoradId === sat.noradId
    );
  }, [selectedSatId, conjunctions, satellites]);

  // Dynamic Conjunction Count based on horizon
  const horizonEncountersCount =
    selectedHorizonHours === 24
      ? 4
      : selectedHorizonHours === 48
      ? 6
      : selectedHorizonHours === 168
      ? 14
      : 38;

  const handleExportTelemetry = () => {
    const reportData = {
      mission: 'GAGAN SURAKSHA - Space Situational Awareness Analytics',
      generatedUtc: new Date().toISOString(),
      datasetType: 'Demo / Simulated Astrodynamics Benchmark',
      screeningHorizonHours: selectedHorizonHours,
      selectedSatelliteFilter: selectedSatId,
      summaryMetrics: {
        propagatorError24hRmsM: 18.4,
        totalScreenedCatalogObjects: 27419,
        conjunctionAlertsInHorizon: horizonEncountersCount,
        criticalCAMRequired: 2,
        propellantReserveRatioPct: 82.4,
        usableDeltaVMs: 142.8,
      },
      screenedEncounters: filteredEncounters,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GaganSuraksha_Analytics_${selectedSatId}_${selectedHorizonHours}h.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="analytics-page-container">
      {/* 1. Page Header */}
      <div className="page-header-bar">
        <div className="page-title-group">
          <div className="page-title-icon">
            <BarChart3 size={18} />
          </div>
          <div>
            <h1 className="page-heading">Orbital Analytics & Propagator Benchmarks</h1>
            <p className="page-subheading">
              Ephemeris divergence comparisons, close-approach frequency trends, collision-risk distributions, and propellant expenditure
            </p>
          </div>
        </div>

        <div className="page-action-group">
          <button className="btn-aerospace" onClick={handleExportTelemetry} title="Export Telemetry JSON Benchmark Report">
            <Download size={13} />
            <span>Export Analytics JSON</span>
          </button>
          <span className="badge badge-cyan" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={12} />
            DEMO / SIMULATED DATASET
          </span>
        </div>
      </div>

      {/* 2. Interactive Filter Toolbar */}
      <div className="analytics-filter-toolbar">
        {/* Satellite Target Filter */}
        <div className="analytics-filter-group">
          <span className="analytics-filter-label">Asset:</span>
          <button
            className={`analytics-pill-btn ${selectedSatId === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedSatId('ALL')}
          >
            All Fleet ({DEMO_SATELLITES_LIST.length})
          </button>
          {DEMO_SATELLITES_LIST.map((sat) => (
            <button
              key={sat.id}
              className={`analytics-pill-btn ${selectedSatId === sat.id ? 'active' : ''}`}
              onClick={() => setSelectedSatId(sat.id)}
            >
              {sat.name}
            </button>
          ))}
        </div>

        {/* Time Horizon Filter */}
        <div className="analytics-filter-group">
          <span className="analytics-filter-label">Horizon:</span>
          {[
            { label: '24 Hours', hours: 24 },
            { label: '48 Hours', hours: 48 },
            { label: '7 Days', hours: 168 },
            { label: '30 Days', hours: 720 },
          ].map((h) => (
            <button
              key={h.hours}
              className={`analytics-pill-btn ${selectedHorizonHours === h.hours ? 'active' : ''}`}
              onClick={() => setSelectedHorizonHours(h.hours)}
            >
              {h.label}
            </button>
          ))}
        </div>

        {/* Section View Tabs */}
        <div className="analytics-filter-group">
          <span className="analytics-filter-label">Section:</span>
          {(['ALL', 'PROPAGATOR', 'CATALOG', 'DEBRIS_FLUX', 'WEATHER', 'TABLE'] as const).map((tab) => (
            <button
              key={tab}
              className={`analytics-pill-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={{ fontSize: '0.68rem', padding: '3px 8px' }}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Top Metric Cards Strip */}
      <div className="analytics-metric-grid">
        <div className="metric-card">
          <span className="metric-label">Propagator Error (24h RMS)</span>
          <span className="metric-value font-mono">18.4 m</span>
          <span className="metric-trend" style={{ color: 'var(--status-operational)' }}>
            Within 0.05% tolerance
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Screened Space Objects</span>
          <span className="metric-value font-mono">27,419</span>
          <span className="metric-trend" style={{ color: 'var(--accent-cyan)' }}>
            Active Space Track Catalog
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Conjunction Alerts ({selectedHorizonHours <= 48 ? `${selectedHorizonHours}h` : `${Math.round(selectedHorizonHours / 24)}d`})</span>
          <span className="metric-value font-mono">{horizonEncountersCount}</span>
          <span className="metric-trend" style={{ color: 'var(--status-warning)' }}>
            2 requiring CAM evaluation
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Propellant Reserve Ratio</span>
          <span className="metric-value font-mono" style={{ color: 'var(--status-operational)' }}>
            82.4%
          </span>
          <span className="metric-trend" style={{ color: 'var(--text-muted)' }}>
            142.8 m/s remaining Δv
          </span>
        </div>
      </div>

      {/* 4. Propagator Trajectory Divergence Canvas */}
      {(activeTab === 'ALL' || activeTab === 'PROPAGATOR') && (
        <TrajectoryDivergenceCanvas timeHorizonHours={Math.min(168, selectedHorizonHours)} />
      )}

      {/* 5. Catalog Population & Orbit Regimes Breakdown */}
      {(activeTab === 'ALL' || activeTab === 'CATALOG') && (
        <CatalogPopulationStats />
      )}

      {/* 6. Heatmap & Space Weather Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'ALL' ? '1fr 1fr' : '1fr', gap: '14px' }}>
        {(activeTab === 'ALL' || activeTab === 'DEBRIS_FLUX') && (
          <DebrisFluxDensityHeatmap />
        )}

        {(activeTab === 'ALL' || activeTab === 'WEATHER') && (
          <SpaceWeatherCorrelationCard />
        )}
      </div>

      {/* 7. Historical Trends & Propellant Budget */}
      {(activeTab === 'ALL' || activeTab === 'PROPAGATOR') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <ConjunctionHistoricalTrends />
          <PropellantBudgetEstimator />
        </div>
      )}

      {/* 8. Supporting Conjunction Events Data Table */}
      {(activeTab === 'ALL' || activeTab === 'TABLE') && (
        <AnalyticsConjunctionsTable
          encounters={filteredEncounters}
          timeRangeLabel={selectedHorizonHours <= 48 ? `${selectedHorizonHours} Hours` : `${Math.round(selectedHorizonHours / 24)} Days`}
        />
      )}
    </div>
  );
};
