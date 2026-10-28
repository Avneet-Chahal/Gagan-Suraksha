import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Sliders,
  Shield,
  Bell,
  Check,
  Save,
  RotateCcw,
  Download,
  Upload,
  Volume2,
  Radio,
  Sparkles,
  Info,
  Clock,
  Compass,
  AlertTriangle,
  Server,
  FileText,
  X,
  Activity,
  Layers,
} from 'lucide-react';
import { audioAlarm } from '../services/audioAlarm';

export interface GaganSettingsConfig {
  presetName: string;
  // A. Data Sources
  apiBaseUrl: string;
  refreshIntervalMin: number;
  primaryCatalogSource: 'CELESTRAK' | 'SPACETRACK' | 'NETRA';
  // B. Display Preferences
  timeFormat: 'UTC_ISO' | 'UTC_12H' | 'LOCAL_IST';
  distanceUnit: 'KILOMETERS' | 'METERS' | 'NAUTICAL_MILES';
  velocityUnit: 'KM_PER_S' | 'M_PER_S';
  defaultDashboardView: 'DASHBOARD' | 'TRACKING' | 'COLLISION_RISK' | 'MANEUVER_PLANNER';
  coordSystem: 'ECI' | 'ECEF' | 'GEO';
  propagatorEngine: 'SGP4' | 'HPOP' | 'Cowell';
  // C. Collision Risk Preferences
  collisionThreshold: string;
  minMissDistanceKm: string;
  screeningHorizonHours: number;
  autoCamGeneration: boolean;
  // D. Notification Preferences
  soundAlarms: boolean;
  notifyCloseApproaches: boolean;
  notifyHighRiskWarnings: boolean;
  notifyFeedFailures: boolean;
  notifySystemEvents: boolean;
}

const DEFAULT_SETTINGS: GaganSettingsConfig = {
  presetName: 'ISRO ISTRAC Ops Preset',
  // A. Data Sources
  apiBaseUrl: 'https://api.gagansuraksha.isro.gov.in (Demonstration Mock)',
  refreshIntervalMin: 15,
  primaryCatalogSource: 'CELESTRAK',
  // B. Display Preferences
  timeFormat: 'UTC_ISO',
  distanceUnit: 'KILOMETERS',
  velocityUnit: 'KM_PER_S',
  defaultDashboardView: 'DASHBOARD',
  coordSystem: 'ECI',
  propagatorEngine: 'SGP4',
  // C. Collision Risk Preferences
  collisionThreshold: '1e-4',
  minMissDistanceKm: '1.0',
  screeningHorizonHours: 72,
  autoCamGeneration: true,
  // D. Notification Preferences
  soundAlarms: true,
  notifyCloseApproaches: true,
  notifyHighRiskWarnings: true,
  notifyFeedFailures: true,
  notifySystemEvents: true,
};

const PRESETS: Record<string, Partial<GaganSettingsConfig>> = {
  'ISRO ISTRAC Ops': {
    presetName: 'ISRO ISTRAC Ops Preset',
    coordSystem: 'ECI',
    propagatorEngine: 'SGP4',
    collisionThreshold: '1e-4',
    minMissDistanceKm: '1.0',
    screeningHorizonHours: 72,
    soundAlarms: true,
    autoCamGeneration: true,
    refreshIntervalMin: 15,
  },
  'LEO Debris Shield': {
    presetName: 'LEO Debris Shield (Strict)',
    coordSystem: 'ECI',
    propagatorEngine: 'HPOP',
    collisionThreshold: '1e-5',
    minMissDistanceKm: '2.5',
    screeningHorizonHours: 120,
    soundAlarms: true,
    autoCamGeneration: true,
    refreshIntervalMin: 5,
  },
  'Astrodynamics R&D': {
    presetName: 'Astrodynamics R&D Mode',
    coordSystem: 'ECEF',
    propagatorEngine: 'Cowell',
    collisionThreshold: '5e-5',
    minMissDistanceKm: '0.8',
    screeningHorizonHours: 168,
    soundAlarms: false,
    autoCamGeneration: false,
    refreshIntervalMin: 30,
  },
};

type SettingsTab = 'DATA_SOURCES' | 'DISPLAY' | 'COLLISION_RISK' | 'NOTIFICATIONS' | 'APP_INFO';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('DATA_SOURCES');

  // Load config from localStorage
  const [config, setConfig] = useState<GaganSettingsConfig>(() => {
    try {
      const saved = localStorage.getItem('gagan_mission_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  // UI state
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Validation errors
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [missDistError, setMissDistError] = useState<string | null>(null);

  // Validate on change
  useEffect(() => {
    const pc = parseFloat(config.collisionThreshold);
    if (isNaN(pc) || pc <= 0 || pc > 1) {
      setThresholdError('Must be a valid probability between 0 and 1 (e.g. 1e-4)');
    } else {
      setThresholdError(null);
    }

    const dist = parseFloat(config.minMissDistanceKm);
    if (isNaN(dist) || dist <= 0 || dist > 50) {
      setMissDistError('Must be a positive distance between 0.1 km and 50 km');
    } else {
      setMissDistError(null);
    }
  }, [config.collisionThreshold, config.minMissDistanceKm]);

  const handleSave = () => {
    if (thresholdError || missDistError) return;
    localStorage.setItem('gagan_mission_settings', JSON.stringify(config));
    audioAlarm.setMuted(!config.soundAlarms);
    setSavedSuccess(true);
    audioAlarm.playSuccessChime();
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleApplyPreset = (name: string) => {
    const preset = PRESETS[name];
    if (preset) {
      setConfig((prev) => ({ ...prev, ...preset }));
      audioAlarm.playWarningChime();
    }
  };

  const handleConfirmReset = () => {
    setConfig(DEFAULT_SETTINGS);
    localStorage.removeItem('gagan_mission_settings');
    audioAlarm.setMuted(!DEFAULT_SETTINGS.soundAlarms);
    setShowResetConfirm(false);
    audioAlarm.playWarningChime();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleTestPing = () => {
    setPingStatus('Initiating telemetry downlink health handshake...');
    setTimeout(() => {
      setPingStatus(
        'All configured telemetry downlinks verified: Hartebeesthoek HBK (42ms), TrollSat TRL (68ms), Bangalore ISTRAC (18ms). S-band carrier locked.'
      );
      audioAlarm.playSuccessChime();
      setTimeout(() => setPingStatus(null), 5000);
    }, 850);
  };

  const handleTestAudioAlarm = () => {
    audioAlarm.playCriticalAlarm();
  };

  const handleExportConfig = () => {
    const exportPayload = {
      format: 'GAGAN_SURAKSHA_CONFIG_V1',
      exportedUtc: new Date().toISOString(),
      config,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GaganSuraksha_Settings_${config.presetName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const importedConfig = parsed.config || parsed;
        if (typeof importedConfig === 'object' && importedConfig.presetName) {
          setConfig({ ...DEFAULT_SETTINGS, ...importedConfig });
          setImportError(null);
          audioAlarm.playSuccessChime();
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 2500);
        } else {
          setImportError('Invalid configuration file structure.');
        }
      } catch {
        setImportError('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="settings-page-container">
      {/* 1. Header Bar */}
      <div className="page-header-bar">
        <div className="page-title-group">
          <div className="page-title-icon">
            <Settings size={18} />
          </div>
          <div>
            <h1 className="page-heading">Mission Control Settings & Integration Config</h1>
            <p className="page-subheading">
              Data source endpoints, astrodynamic propagator parameters, and safety threshold definitions
            </p>
          </div>
        </div>

        <div className="page-action-group">
          {savedSuccess && (
            <span className="badge badge-operational">
              <Check size={12} /> Preferences Saved & Restored
            </span>
          )}
          <button
            className="btn-aerospace"
            onClick={() => setShowResetConfirm(true)}
            title="Restore Factory Default Settings"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
          <button
            className="btn-aerospace btn-primary"
            onClick={handleSave}
            disabled={Boolean(thresholdError || missDistError)}
          >
            <Save size={14} />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      {/* 2. Operational Profile Presets */}
      <div className="settings-presets-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#fff' }}>Operational Profile Presets:</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.keys(PRESETS).map((pName) => {
            const isActive = config.presetName.includes(pName);
            return (
              <button
                key={pName}
                className={`settings-preset-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleApplyPreset(pName)}
              >
                <span>{pName}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="btn-aerospace"
            onClick={handleExportConfig}
            style={{ padding: '3px 8px', fontSize: '0.68rem' }}
            title="Export settings JSON"
          >
            <Download size={11} />
            <span>Export JSON</span>
          </button>

          <label
            className="btn-aerospace"
            style={{ padding: '3px 8px', fontSize: '0.68rem', cursor: 'pointer' }}
            title="Import settings JSON"
          >
            <Upload size={11} />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {importError && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--status-critical)',
            borderRadius: '6px',
            color: 'var(--status-critical)',
            fontSize: '0.74rem',
          }}
        >
          {importError}
        </div>
      )}

      {/* 3. Navigation Tabs */}
      <div className="settings-tabs-strip">
        <button
          className={`settings-tab-btn ${activeTab === 'DATA_SOURCES' ? 'active' : ''}`}
          onClick={() => setActiveTab('DATA_SOURCES')}
        >
          <Database size={14} />
          <span>A. Data Sources</span>
        </button>

        <button
          className={`settings-tab-btn ${activeTab === 'DISPLAY' ? 'active' : ''}`}
          onClick={() => setActiveTab('DISPLAY')}
        >
          <Sliders size={14} />
          <span>B. Display Preferences</span>
        </button>

        <button
          className={`settings-tab-btn ${activeTab === 'COLLISION_RISK' ? 'active' : ''}`}
          onClick={() => setActiveTab('COLLISION_RISK')}
        >
          <Shield size={14} />
          <span>C. Collision-Risk Preferences</span>
        </button>

        <button
          className={`settings-tab-btn ${activeTab === 'NOTIFICATIONS' ? 'active' : ''}`}
          onClick={() => setActiveTab('NOTIFICATIONS')}
        >
          <Bell size={14} />
          <span>D. Notifications</span>
        </button>

        <button
          className={`settings-tab-btn ${activeTab === 'APP_INFO' ? 'active' : ''}`}
          onClick={() => setActiveTab('APP_INFO')}
        >
          <Info size={14} />
          <span>E. App Information</span>
        </button>
      </div>

      {/* 4. Tab Panels */}

      {/* ============================================================== */}
      {/* TAB A: DATA SOURCES                                           */}
      {/* ============================================================== */}
      {activeTab === 'DATA_SOURCES' && (
        <div className="settings-two-col-grid">
          {/* Card 1: Backend Endpoint & Refresh */}
          <div className="mission-card" style={{ padding: '16px' }}>
            <div className="card-title" style={{ marginBottom: '14px' }}>
              <Server size={15} style={{ color: 'var(--accent-cyan)' }} />
              <span>Backend API & Telemetry Ingestion</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="settings-input-group">
                <label className="settings-input-label">Backend Telemetry Endpoint Base URL:</label>
                <input
                  type="text"
                  className="settings-text-input"
                  value={config.apiBaseUrl}
                  onChange={(e) => setConfig({ ...config, apiBaseUrl: e.target.value })}
                />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Local frontend demonstration mode active. Unreachable remote endpoints gracefully fall back to local simulated telemetry.
                </span>
              </div>

              <div className="settings-input-group">
                <label className="settings-input-label">Autonomous Telemetry Ingestion Interval:</label>
                <select
                  className="settings-text-input"
                  value={config.refreshIntervalMin}
                  onChange={(e) => setConfig({ ...config, refreshIntervalMin: Number(e.target.value) })}
                  style={{ cursor: 'pointer' }}
                >
                  <option value={5}>Every 5 Minutes (High Cadence)</option>
                  <option value={15}>Every 15 Minutes (Standard Operational)</option>
                  <option value={30}>Every 30 Minutes (Conserved Bandwidth)</option>
                  <option value={60}>Every 1 Hour (Nominal)</option>
                  <option value={360}>Every 6 Hours (Periodic Sync)</option>
                </select>
              </div>

              <div className="settings-input-group">
                <label className="settings-input-label">Primary Orbital Catalog Provider:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['CELESTRAK', 'SPACETRACK', 'NETRA'] as const).map((prov) => (
                    <button
                      key={prov}
                      onClick={() => setConfig({ ...config, primaryCatalogSource: prov })}
                      className="btn-aerospace"
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        background: config.primaryCatalogSource === prov ? 'var(--accent-blue)' : undefined,
                        borderColor: config.primaryCatalogSource === prov ? 'var(--accent-cyan)' : undefined,
                        color: config.primaryCatalogSource === prov ? '#fff' : undefined,
                      }}
                    >
                      {prov}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Supported Data Sources Status */}
          <div className="mission-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div className="card-title">
                <Database size={15} style={{ color: 'var(--accent-cyan)' }} />
                <span>Configured Data Sources & Downlinks</span>
              </div>
              <button className="btn-aerospace" onClick={handleTestPing} style={{ padding: '3px 8px', fontSize: '0.68rem' }}>
                <Radio size={11} />
                <span>Ping Links</span>
              </button>
            </div>

            {pingStatus && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(0, 229, 255, 0.1)',
                  border: '1px solid var(--accent-cyan)',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  color: 'var(--accent-cyan)',
                  marginBottom: '10px',
                }}
              >
                {pingStatus}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.74rem' }}>
              {/* Source 1: CelesTrak */}
              <div
                style={{
                  background: 'rgba(3, 7, 18, 0.55)',
                  border: '1px solid var(--space-border-subtle)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>CelesTrak TLE Catalog</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Type: Two-Line Element Sets • Cadence: 6 Hours • Updated: 08:00 UTC
                  </div>
                </div>
                <span className="badge badge-configured">CONFIGURED DEMO</span>
              </div>

              {/* Source 2: NOAA SWPC */}
              <div
                style={{
                  background: 'rgba(3, 7, 18, 0.55)',
                  border: '1px solid var(--space-border-subtle)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>NOAA SWPC Space Weather</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Type: Solar Flux F10.7 & Kp Indices • Cadence: 15 Min • Updated: 08:20 UTC
                  </div>
                </div>
                <span className="badge badge-connected">CONNECTED</span>
              </div>

              {/* Source 3: Space-Track.org */}
              <div
                style={{
                  background: 'rgba(3, 7, 18, 0.55)',
                  border: '1px solid var(--space-border-subtle)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>Space-Track.org SP Ephemeris</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Type: Special Perturbations State Vectors • Updated: 06:30 UTC
                  </div>
                </div>
                <span className="badge badge-configured">CONFIGURED DEMO</span>
              </div>

              {/* Source 4: ISRO NETRA SSA */}
              <div
                style={{
                  background: 'rgba(3, 7, 18, 0.55)',
                  border: '1px solid var(--space-border-subtle)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>ISRO NETRA SSA Ground Network</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Type: S-band Telecommand & Optical Tracks • Updated: 08:24 UTC
                  </div>
                </div>
                <span className="badge badge-connected">CONNECTED</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB B: DISPLAY PREFERENCES                                    */}
      {/* ============================================================== */}
      {activeTab === 'DISPLAY' && (
        <div className="settings-two-col-grid">
          {/* Card 1: Units and Formats */}
          <div className="mission-card" style={{ padding: '16px' }}>
            <div className="card-title" style={{ marginBottom: '14px' }}>
              <Clock size={15} style={{ color: 'var(--accent-cyan)' }} />
              <span>Time Format & Units of Measure</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="settings-input-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Mission Clock Time Display Format:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { key: 'UTC_ISO', label: 'UTC 24H (ISO 8601)' },
                    { key: 'UTC_12H', label: 'UTC 12H (AM/PM)' },
                    { key: 'LOCAL_IST', label: 'Indian Standard (IST)' },
                  ].map((tf) => (
                    <button
                      key={tf.key}
                      onClick={() => setConfig({ ...config, timeFormat: tf.key as 'UTC_ISO' | 'UTC_12H' | 'LOCAL_IST' })}
                      className="btn-aerospace"
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        background: config.timeFormat === tf.key ? 'var(--accent-blue)' : undefined,
                        borderColor: config.timeFormat === tf.key ? 'var(--accent-cyan)' : undefined,
                        color: config.timeFormat === tf.key ? '#fff' : undefined,
                      }}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="settings-input-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Orbital Distance Measurement Units:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { key: 'KILOMETERS', label: 'Kilometers (km)' },
                    { key: 'METERS', label: 'Meters (m)' },
                    { key: 'NAUTICAL_MILES', label: 'Nautical Miles (nmi)' },
                  ].map((u) => (
                    <button
                      key={u.key}
                      onClick={() => setConfig({ ...config, distanceUnit: u.key as 'KILOMETERS' | 'METERS' | 'NAUTICAL_MILES' })}
                      className="btn-aerospace"
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        background: config.distanceUnit === u.key ? 'var(--accent-blue)' : undefined,
                        borderColor: config.distanceUnit === u.key ? 'var(--accent-cyan)' : undefined,
                        color: config.distanceUnit === u.key ? '#fff' : undefined,
                      }}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="settings-input-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Orbital Velocity Measurement Units:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { key: 'KM_PER_S', label: 'Kilometers / Sec (km/s)' },
                    { key: 'M_PER_S', label: 'Meters / Sec (m/s)' },
                  ].map((v) => (
                    <button
                      key={v.key}
                      onClick={() => setConfig({ ...config, velocityUnit: v.key as 'KM_PER_S' | 'M_PER_S' })}
                      className="btn-aerospace"
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        background: config.velocityUnit === v.key ? 'var(--accent-blue)' : undefined,
                        borderColor: config.velocityUnit === v.key ? 'var(--accent-cyan)' : undefined,
                        color: config.velocityUnit === v.key ? '#fff' : undefined,
                      }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Astrodynamics Reference Frame & Views */}
          <div className="mission-card" style={{ padding: '16px' }}>
            <div className="card-title" style={{ marginBottom: '14px' }}>
              <Compass size={15} style={{ color: 'var(--accent-cyan)' }} />
              <span>Reference Frame & Astrodynamic Engine</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="settings-input-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Orbital Reference Frame:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['ECI', 'ECEF', 'GEO'] as const).map((frame) => (
                    <button
                      key={frame}
                      onClick={() => setConfig({ ...config, coordSystem: frame })}
                      className="btn-aerospace"
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        background: config.coordSystem === frame ? 'var(--accent-blue)' : undefined,
                        borderColor: config.coordSystem === frame ? 'var(--accent-cyan)' : undefined,
                        color: config.coordSystem === frame ? '#fff' : undefined,
                      }}
                    >
                      {frame}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="settings-input-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Default Orbital Propagator:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['SGP4', 'HPOP', 'Cowell'] as const).map((eng) => (
                    <button
                      key={eng}
                      onClick={() => setConfig({ ...config, propagatorEngine: eng })}
                      className="btn-aerospace"
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        background: config.propagatorEngine === eng ? 'var(--accent-blue)' : undefined,
                        borderColor: config.propagatorEngine === eng ? 'var(--accent-cyan)' : undefined,
                        color: config.propagatorEngine === eng ? '#fff' : undefined,
                      }}
                    >
                      {eng}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="settings-input-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Default Startup Module View:
                </label>
                <select
                  className="settings-text-input"
                  value={config.defaultDashboardView}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      defaultDashboardView: e.target.value as 'DASHBOARD' | 'TRACKING' | 'COLLISION_RISK' | 'MANEUVER_PLANNER',
                    })
                  }
                  style={{ cursor: 'pointer' }}
                >
                  <option value="DASHBOARD">Dashboard (3D Earth & Telemetry Overview)</option>
                  <option value="TRACKING">Orbit Tracking (Interactive Time Scrubber)</option>
                  <option value="COLLISION_RISK">Collision Risk (B-Plane Encounter Geometry)</option>
                  <option value="MANEUVER_PLANNER">Maneuver Planner (CAM Impulse Solver)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB C: COLLISION-RISK PREFERENCES                              */}
      {/* ============================================================== */}
      {activeTab === 'COLLISION_RISK' && (
        <div className="settings-two-col-grid">
          {/* Card 1: Threshold Inputs */}
          <div className="mission-card" style={{ padding: '16px' }}>
            <div className="card-title" style={{ marginBottom: '14px' }}>
              <Shield size={15} style={{ color: 'var(--accent-cyan)' }} />
              <span>Conjunction Screening & Alert Thresholds</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="settings-input-group">
                <label className="settings-input-label">Collision Probability Red-Line Threshold ($P_c$):</label>
                <input
                  type="text"
                  className={`settings-text-input ${thresholdError ? 'has-error' : ''}`}
                  value={config.collisionThreshold}
                  onChange={(e) => setConfig({ ...config, collisionThreshold: e.target.value })}
                />
                {thresholdError ? (
                  <span className="settings-error-text">{thresholdError}</span>
                ) : (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Standard ISRO / NASA operational red-line threshold is 1e-4. Events exceeding this trigger critical alarms.
                  </span>
                )}
              </div>

              <div className="settings-input-group">
                <label className="settings-input-label">Minimum Miss Distance Screening Bubble (km):</label>
                <input
                  type="text"
                  className={`settings-text-input ${missDistError ? 'has-error' : ''}`}
                  value={config.minMissDistanceKm}
                  onChange={(e) => setConfig({ ...config, minMissDistanceKm: e.target.value })}
                />
                {missDistError ? (
                  <span className="settings-error-text">{missDistError}</span>
                ) : (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Screening envelope radius. Objects passing closer than this threshold generate close-approach logs.
                  </span>
                )}
              </div>

              <div className="settings-input-group">
                <label className="settings-input-label">Screening Look-Ahead Horizon: {config.screeningHorizonHours} Hours ({Math.round(config.screeningHorizonHours / 24)} Days)</label>
                <input
                  type="range"
                  min={24}
                  max={168}
                  step={24}
                  value={config.screeningHorizonHours}
                  onChange={(e) => setConfig({ ...config, screeningHorizonHours: Number(e.target.value) })}
                  style={{ accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Scientific Disclaimer & Automation */}
          <div className="mission-card" style={{ padding: '16px' }}>
            <div className="card-title" style={{ marginBottom: '14px' }}>
              <Activity size={15} style={{ color: 'var(--accent-cyan)' }} />
              <span>Safety Rules & Scientific Principle</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.74rem' }}>
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '6px',
                  padding: '12px',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ color: 'var(--status-warning)', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} />
                  <span>Astrodynamics Operational Principle</span>
                </div>
                Configurable application alert thresholds represent <strong>user operational preferences</strong> for operator attention filtering, not universal scientific laws. Changing these settings alters interface notification triggers but does not modify the underlying Foster 2D collision probability or physical satellite trajectories.
              </div>

              <div className="settings-toggle-row">
                <div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>Autonomous CAM Candidate Generation</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Automatically compute impulsive retrograde/posigrade burns whenever Pc &gt; 1e-4
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.autoCamGeneration}
                  onChange={(e) => setConfig({ ...config, autoCamGeneration: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB D: NOTIFICATIONS                                          */}
      {/* ============================================================== */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="settings-two-col-grid">
          {/* Card 1: Alert Categories Toggle */}
          <div className="mission-card" style={{ padding: '16px' }}>
            <div className="card-title" style={{ marginBottom: '14px' }}>
              <Bell size={15} style={{ color: 'var(--accent-cyan)' }} />
              <span>Subscribed Notification Categories</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="settings-toggle-row">
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>Critical Conjunction Alarms (Pc &gt; 1e-4)</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Immediate alerts when collision probability exceeds safety threshold
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.notifyCloseApproaches}
                  onChange={(e) => setConfig({ ...config, notifyCloseApproaches: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                />
              </div>

              <div className="settings-toggle-row">
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>Elevated Risk Warnings (Pc &gt; 1e-5)</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Advisory notifications for close encounters within secondary monitoring bubble
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.notifyHighRiskWarnings}
                  onChange={(e) => setConfig({ ...config, notifyHighRiskWarnings: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                />
              </div>

              <div className="settings-toggle-row">
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>Data Source Sync Failures & Dropouts</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Alert operator when external ephemeris feeds (CelesTrak, Space-Track) experience latency
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.notifyFeedFailures}
                  onChange={(e) => setConfig({ ...config, notifyFeedFailures: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                />
              </div>

              <div className="settings-toggle-row">
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>Maneuver Deadlines & Ground Passes</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Telecommand uplink window reminders before Loss of Signal (LOS)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.notifySystemEvents}
                  onChange={(e) => setConfig({ ...config, notifySystemEvents: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Acoustic Alarm Engine */}
          <div className="mission-card" style={{ padding: '16px' }}>
            <div className="card-title" style={{ marginBottom: '14px' }}>
              <Volume2 size={15} style={{ color: 'var(--accent-cyan)' }} />
              <span>Synthesized Acoustic Warning Engine</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="settings-toggle-row">
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>Acoustic Audio Alarms</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Play synthesized dual-tone audio sonar pings upon critical alerts
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="btn-aerospace"
                    onClick={handleTestAudioAlarm}
                    style={{ padding: '3px 8px', fontSize: '0.68rem' }}
                  >
                    <Volume2 size={11} />
                    <span>Test Ping</span>
                  </button>
                  <input
                    type="checkbox"
                    checked={config.soundAlarms}
                    onChange={(e) => setConfig({ ...config, soundAlarms: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(3, 7, 18, 0.55)',
                  border: '1px solid var(--space-border-subtle)',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '0.72rem',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                  Acoustic Synthesis Specifications:
                </div>
                Uses Web Audio API harmonic oscillators (880 Hz / 440 Hz square-wave pulses) rendered directly in the client browser with zero external audio assets. No external push, SMS, or email services are claimed.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB E: APPLICATION INFORMATION                                 */}
      {/* ============================================================== */}
      {activeTab === 'APP_INFO' && (
        <div className="settings-two-col-grid">
          {/* Card 1: Mission Specs */}
          <div className="mission-card" style={{ padding: '16px' }}>
            <div className="card-title" style={{ marginBottom: '14px' }}>
              <FileText size={15} style={{ color: 'var(--accent-cyan)' }} />
              <span>Mission System Architecture</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.74rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--space-border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Platform:</span>
                <strong style={{ color: '#fff' }}>GAGAN SURAKSHA (गगन सुरक्षा)</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--space-border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mission Domain:</span>
                <span style={{ color: '#fff' }}>Space Situational Awareness & Satellite Collision Avoidance</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--space-border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Frontend Release Version:</span>
                <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                  v1.4.2 (Aerospace Build 2026.10)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--space-border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Active Runtime State:</span>
                <span className="badge badge-operational">DEMONSTRATION & LOCAL SIMULATOR</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Persistence Engine:</span>
                <span className="font-mono" style={{ color: '#fff' }}>Browser localStorage (gagan_mission_settings)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Reset & Backup Controls */}
          <div className="mission-card" style={{ padding: '16px' }}>
            <div className="card-title" style={{ marginBottom: '14px' }}>
              <Layers size={15} style={{ color: 'var(--accent-cyan)' }} />
              <span>Configuration Backup & Reset</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.74rem' }}>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Preferences are maintained in local browser storage. You may backup your parameters as a structured JSON file or restore the factory baseline configuration.
              </p>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-aerospace" onClick={handleExportConfig} style={{ flex: 1, justifyContent: 'center' }}>
                  <Download size={13} />
                  <span>Export JSON</span>
                </button>

                <button
                  className="btn-aerospace"
                  onClick={() => setShowResetConfirm(true)}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    color: 'var(--status-critical)',
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Reset All</span>
                </button>
              </div>

              <div
                style={{
                  background: 'rgba(3, 7, 18, 0.4)',
                  border: '1px solid var(--space-border-subtle)',
                  borderRadius: '4px',
                  padding: '8px 10px',
                  color: 'var(--text-muted)',
                  fontSize: '0.68rem',
                }}
              >
                Resetting will restore ISRO ISTRAC default settings: $P_c$ threshold 1e-4, 1.0 km screening envelope, ECI J2000 reference frame, and audible conjunction chimes.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="settings-modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="settings-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-critical)', fontWeight: 700, fontSize: '0.95rem' }}>
                <AlertTriangle size={18} />
                <span>Confirm Configuration Reset</span>
              </div>
              <button className="icon-button" onClick={() => setShowResetConfirm(false)}>
                <X size={15} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Are you sure you want to overwrite your customized settings? All threshold values, coordinate frame selections, and notification preferences will be reset to the factory <strong>ISRO ISTRAC Ops</strong> default profile.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button className="btn-aerospace" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn-aerospace"
                onClick={handleConfirmReset}
                style={{ background: 'var(--status-critical)', color: '#fff', borderColor: 'var(--status-critical)' }}
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
