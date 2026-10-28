// ==========================================================================
// GAGAN SURAKSHA - API SERVICE LAYER
// Configured to connect to backend via VITE_API_BASE_URL when deployed,
// with clean demonstration data fallbacks when backend is not connected.
// ==========================================================================

import axios from 'axios';
import {
  DEMO_PRIMARY_SATELLITE,
  DEMO_SATELLITES_LIST,
  DEMO_GROUND_PASSES,
  DEMO_CLOSE_APPROACHES,
  DEMO_MANEUVER_RECOMMENDATIONS,
  DEMO_SPACE_WEATHER,
  DEMO_ALERTS,
} from '../data/mockData';
import { Satellite, GroundPass, CloseApproach, ManeuverRecommendation, SpaceWeather, AlertNotification } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const isLiveBackendConfigured = Boolean(API_BASE_URL);

// Satellite & Telemetry Services
export const fetchPrimarySatellite = async (): Promise<Satellite> => {
  if (isLiveBackendConfigured) {
    try {
      const res = await apiClient.get<Satellite>('/api/satellites/primary');
      return res.data;
    } catch (err) {
      console.warn('Backend /api/satellites/primary unavailable, falling back to simulated data:', err);
    }
  }
  return DEMO_PRIMARY_SATELLITE;
};

export const fetchSatellitesList = async (): Promise<Satellite[]> => {
  if (isLiveBackendConfigured) {
    try {
      const res = await apiClient.get<Satellite[]>('/api/satellites');
      return res.data;
    } catch (err) {
      console.warn('Backend /api/satellites unavailable, falling back to simulated data:', err);
    }
  }
  return DEMO_SATELLITES_LIST;
};

// Ground Passes Services
export const fetchGroundPasses = async (satelliteId = 'orbit-02'): Promise<GroundPass[]> => {
  if (isLiveBackendConfigured) {
    try {
      const res = await apiClient.get<GroundPass[]>(`/api/passes/${satelliteId}`);
      return res.data;
    } catch (err) {
      console.warn(`Backend /api/passes/${satelliteId} unavailable, falling back to simulated data:`, err);
    }
  }
  return DEMO_GROUND_PASSES;
};

// Schema Adapter: Normalizes backend ConjunctionEvent to frontend CloseApproach
export const adaptConjunctionToCloseApproach = (raw: any): CloseApproach => {
  if (raw.targetObject && raw.missDistanceKm !== undefined) {
    return raw as CloseApproach;
  }

  const pSat = raw.primarySat || raw.primary_sat || {};
  const sSat = raw.secondarySat || raw.secondary_sat || {};

  const rawProb = raw.rawProbability ?? raw.raw_probability ?? raw.pcRaw ?? raw.pc_raw ?? 0;
  const calProb = raw.calibratedProbability ?? raw.calibrated_probability ?? raw.pcMlCalibrated ?? raw.pc_ml_calibrated ?? rawProb;

  let mappedRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  const riskStr = (raw.riskLevel || raw.risk_level || '').toUpperCase();
  if (riskStr === 'CRITICAL' || riskStr === 'HIGH') {
    mappedRisk = 'CRITICAL';
  } else if (riskStr === 'WARNING' || riskStr === 'MEDIUM') {
    mappedRisk = 'MEDIUM';
  } else {
    mappedRisk = 'LOW';
  }

  const cov = raw.covariance || {};
  const primaryCov = cov.primary || {};

  return {
    id: raw.id || `CA-${pSat.noradId || '0'}-${sSat.noradId || '0'}`,
    targetObject: pSat.name || 'Primary Spacecraft',
    targetNoradId: pSat.noradId ?? pSat.norad_id ?? 0,
    targetType: pSat.type || 'PAYLOAD',
    chaserObject: sSat.name || 'Secondary Object',
    chaserNoradId: sSat.noradId ?? sSat.norad_id ?? 0,
    chaserType: sSat.type || 'DEBRIS',
    tcaUtc: raw.tcaUtc || raw.tca_utc || new Date().toISOString(),
    missDistanceKm: Number((raw.missDistanceKm ?? raw.miss_distance_km ?? 0).toFixed(3)),
    radialDistanceKm: Number((raw.radialMissKm ?? raw.radial_miss_km ?? 0).toFixed(3)),
    inTrackDistanceKm: Number((raw.inTrackMissKm ?? raw.in_track_miss_km ?? 0).toFixed(3)),
    crossTrackDistanceKm: Number((raw.crossTrackMissKm ?? raw.cross_track_miss_km ?? 0).toFixed(3)),
    collisionProbability: calProb,
    relativeVelocityKmS: Number((raw.relativeVelocityKmS ?? raw.relative_velocity_km_s ?? 0).toFixed(2)),
    riskLevel: mappedRisk,
    rawCollisionProbability: rawProb,
    calibratedCollisionProbability: calProb,
    status: raw.isHistorical || raw.is_historical ? 'EVALUATED' : 'ACTIVE',
    dataSource: raw.dataSource || raw.data_source || 'NETRA SGP4 / ML Predictor',
    lastUpdatedUtc: raw.dataFreshnessUtc || raw.data_freshness_utc || new Date().toISOString(),
    sigmaRadialMeters: primaryCov.radialM ?? raw.primaryRadialSigmaM,
    sigmaInTrackMeters: primaryCov.inTrackM ?? raw.primaryInTrackSigmaM,
    sigmaCrossTrackMeters: primaryCov.crossTrackM ?? raw.primaryCrossTrackSigmaM,
    isHistorical: Boolean(raw.isHistorical ?? raw.is_historical ?? false),
    outcomeStatus: raw.outcomeStatus || raw.outcome_status || 'CLOSE_APPROACH',
    propTime1Days: raw.propTime1Days ?? raw.prop_time_1_days,
    propTime2Days: raw.propTime2Days ?? raw.prop_time_2_days,
    rawMinRangeKm: raw.rawMinRangeKm ?? raw.raw_min_range_km,
    rawRelVelKmS: raw.rawRelVelKmS ?? raw.raw_rel_vel_km_s,
    tleEpoch1Utc: raw.tleEpoch1Utc ?? raw.tle_epoch_1_utc,
    tleEpoch2Utc: raw.tleEpoch2Utc ?? raw.tle_epoch_2_utc,
  };
};

// Conjunction / Close Approaches Services
export const fetchCloseApproaches = async (
  scope: 'all' | 'operational' | 'historical' = 'all'
): Promise<CloseApproach[]> => {
  if (isLiveBackendConfigured) {
    try {
      const res = await apiClient.get<any[]>(`/api/conjunctions?scope=${scope}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map(adaptConjunctionToCloseApproach);
      }
    } catch (err) {
      console.warn(`Backend /api/conjunctions?scope=${scope} unavailable, falling back to simulated data:`, err);
    }
  }
  return DEMO_CLOSE_APPROACHES;
};

export const fetchHistoricalConjunctions = async (limit = 100): Promise<CloseApproach[]> => {
  if (isLiveBackendConfigured) {
    try {
      const res = await apiClient.get<any[]>(`/api/conjunctions/historical?limit=${limit}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map(adaptConjunctionToCloseApproach);
      }
    } catch (err) {
      console.warn('Backend /api/conjunctions/historical unavailable:', err);
    }
  }
  return [];
};

// Maneuver Recommendations
export const fetchManeuverRecommendations = async (): Promise<ManeuverRecommendation[]> => {
  if (isLiveBackendConfigured) {
    try {
      const res = await apiClient.get<ManeuverRecommendation[]>('/api/maneuvers');
      return res.data;
    } catch (err) {
      console.warn('Backend /api/maneuvers unavailable, falling back to simulated data:', err);
    }
  }
  return DEMO_MANEUVER_RECOMMENDATIONS;
};

// Space Weather Service
export const fetchSpaceWeather = async (): Promise<SpaceWeather> => {
  if (isLiveBackendConfigured) {
    try {
      const res = await apiClient.get<SpaceWeather>('/api/space-weather');
      return res.data;
    } catch (err) {
      console.warn('Backend /api/space-weather unavailable, falling back to simulated data:', err);
    }
  }
  return DEMO_SPACE_WEATHER;
};

// Alerts Service
export const fetchAlerts = async (): Promise<AlertNotification[]> => {
  if (isLiveBackendConfigured) {
    try {
      const res = await apiClient.get<AlertNotification[]>('/api/alerts');
      return res.data;
    } catch (err) {
      console.warn('Backend /api/alerts unavailable, falling back to simulated data:', err);
    }
  }
  return DEMO_ALERTS;
};

// Historical Iridium-Kosmos Collision Replay Service
export const fetchHistoricalIridiumConjunction = async (): Promise<CloseApproach> => {
  if (isLiveBackendConfigured) {
    try {
      const res = await apiClient.get<CloseApproach>('/api/conjunctions/historical/iridium');
      return res.data;
    } catch (err) {
      console.warn('Backend /api/conjunctions/historical/iridium unavailable, falling back:', err);
    }
  }
  return DEMO_CLOSE_APPROACHES[0];
};

// Live Satellite State Vector & Ground Track Service
export const fetchLiveSatellite = async (noradId: number): Promise<Satellite> => {
  if (isLiveBackendConfigured) {
    try {
      const res = await apiClient.get<Satellite>(`/api/satellites/live/${noradId}`);
      return res.data;
    } catch (err) {
      console.warn(`Backend /api/satellites/live/${noradId} unavailable, falling back:`, err);
    }
  }
  return DEMO_PRIMARY_SATELLITE;
};

// Collision Avoidance Maneuver Optimization Service
export const optimizeManeuver = async (params: {
  spacecraftMassKg?: number;
  ispSeconds?: number;
  leadTimeHours?: number;
  targetMissDistanceKm?: number;
  deltaVMs?: number;
  burnDirection?: string;
  conjunctionId?: string;
}) => {
  if (isLiveBackendConfigured) {
    try {
      const res = await apiClient.post('/api/maneuvers/optimize', params);
      return res.data;
    } catch (err) {
      console.warn('Backend /api/maneuvers/optimize unavailable:', err);
    }
  }
  return null;
};

// ==========================================================================
// Historical Events & Date Range Services (Phase 4)
// ==========================================================================

export interface HistoricalEvent {
  id: string;
  name: string;
  category: 'LAUNCH' | 'CONJUNCTION' | 'COLLISION' | 'SATELLITE_EVENT';
  timestampUtc: string;
  source: string;
  sourceUrl?: string;
  provenance: string;
  satellites: Array<{ noradId: number; name: string }>;
  details: Record<string, any>;
  isVerifiedFact: boolean;
}

export interface HistoricalEventsQueryResponse {
  startDate: string;
  endDate: string;
  category: string;
  totalCount: number;
  coverageStatus: string;
  dataSourceStatus: Record<string, any>;
  events: HistoricalEvent[];
}

export const fetchHistoricalEvents = async (
  startDate: string,
  endDate: string,
  category = 'ALL',
  search = ''
): Promise<HistoricalEventsQueryResponse> => {
  const res = await apiClient.get<HistoricalEventsQueryResponse>('/api/events', {
    params: {
      start_date: startDate,
      end_date: endDate,
      category: category.toLowerCase(),
      search: search || undefined,
    },
  });
  return res.data;
};

// ==========================================================================
// Real-Life Incidents Library Services (Phase 5)
// ==========================================================================

export interface IncidentDetail {
  id: string;
  title: string;
  date: string;
  timeUtc: string;
  altitudeKm: number;
  relativeVelocityKmS: number;
  predictedClosestApproachMeters?: number;
  primarySat: {
    name: string;
    noradId: number;
    operator: string;
    role: string;
    statusBefore: string;
    massKg?: number;
    orbit?: string;
  };
  secondarySat: {
    name: string;
    noradId?: number;
    operator: string;
    role: string;
    statusBefore: string;
    massKg?: number;
    orbit?: string;
  };
  outcome: string;
  verificationStatus: 'VERIFIED_HISTORICAL_FACT' | 'AWAITING_INCIDENT_VERIFICATION';
  verificationNote: string;
  provenance: string;
  sourceLinks: Array<{ name: string; url: string }>;
  isIllustrativeReplay: boolean;
  replayNotice: string;
}

export const fetchHistoricalIncidents = async (): Promise<IncidentDetail[]> => {
  const res = await apiClient.get<IncidentDetail[]>('/api/incidents');
  return res.data;
};

export const fetchIncidentById = async (id: string): Promise<IncidentDetail> => {
  const res = await apiClient.get<IncidentDetail>(`/api/incidents/${id}`);
  return res.data;
};

export const fetchSpaceTrackStatus = async () => {
  const res = await apiClient.get('/api/sources/spacetrack/status');
  return res.data;
};



