// ==========================================================================
// GAGAN SURAKSHA - CORE TYPES & DATA CONTRACTS
// ==========================================================================

export type OperationalStatus = 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'STANDBY' | 'DECOMMISSIONED';

export interface Satellite {
  id: string;
  name: string;
  noradId: number;
  cosparId: string;
  type: string;
  category?: 'PAYLOAD' | 'DEBRIS' | 'ROCKET_BODY';
  isFavorite?: boolean;
  inclination: number; // degrees
  eccentricity: number;
  periodMin: number;
  altitudeKm: number;
  velocityKmS: number;
  latitude: number;
  longitude: number;
  groundTrackRateKmS: number;
  launchDate: string;
  status: OperationalStatus;
  country: string;
  orbitType: 'LEO' | 'MEO' | 'GEO' | 'SSO';
  apogeeKm?: number;
  perigeeKm?: number;
  semiMajorAxisKm?: number;
  rcsM2?: number;
}


export interface OrbitalParameters {
  semiMajorAxisKm: number;
  apogeeKm: number;
  perigeeKm: number;
  periodMin: number;
  inclinationDeg: number;
  eccentricity: number;
  groundTrackRateKmS: number;
}

export interface AttitudeData {
  rollDeg: number;
  pitchDeg: number;
  yawDeg: number;
  angularRateRollDegS: number;
  angularRatePitchDegS: number;
  angularRateYawDegS: number;
}

export interface PowerSystemData {
  solarArrayEfficiencyPct: number;
  batteryStateOfChargePct: number;
  busVoltageV: number;
  busCurrentA: number;
}

export interface CommunicationData {
  uplinkFrequency: string;
  uplinkStatus: 'LOCKED' | 'SEARCHING' | 'OFFLINE';
  downlinkFrequency: string;
  downlinkStatus: 'LOCKED' | 'SEARCHING' | 'OFFLINE';
  signalStrengthDbm: number;
  dataRateMbps: number;
}

export interface GroundPass {
  id: string;
  groundStation: string;
  aosUtc: string;
  losUtc: string;
  duration: string;
  maxElevationDeg: number;
  status: 'Upcoming' | 'Scheduled' | 'Completed';
}

export interface CdmHistoryPoint {
  cdmId: string;
  hoursBeforeTca: number;
  timestampUtc: string;
  missDistanceKm: number;
  collisionProbability: number;
  sigmaPositionKm: number;
}

export interface CloseApproach {
  id: string;
  targetObject: string;
  targetNoradId: number;
  targetType?: string;
  chaserObject: string;
  chaserNoradId: number;
  chaserType?: string;
  tcaUtc: string;
  tcaDate?: string;
  missDistanceKm: number;
  radialDistanceKm: number;
  inTrackDistanceKm: number;
  crossTrackDistanceKm: number;
  collisionProbability: number;
  relativeVelocityKmS: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status?: 'ACTIVE' | 'EVALUATED' | 'MONITORING' | 'MITIGATED' | 'PASSED';
  encounterAngleDeg?: number;
  sigmaPositionKm?: number;
  dataSource?: string;
  lastUpdatedUtc?: string;
  // Risk & Uncertainty Analysis Extensions
  hbrMeters?: number;
  sigmaRadialMeters?: number;
  sigmaInTrackMeters?: number;
  sigmaCrossTrackMeters?: number;
  quantileQ10Meters?: number;
  quantileQ50Meters?: number;
  quantileQ90Meters?: number;
  rawCollisionProbability?: number;
  calibratedCollisionProbability?: number;
  calibrationMethod?: string;
  calibrationEvaluatedOnHeldOut?: boolean;
  cdmHistory?: CdmHistoryPoint[];
  isHistorical?: boolean;
  outcomeStatus?: string;
  propTime1Days?: number;
  propTime2Days?: number;
  rawMinRangeKm?: number;
  rawRelVelKmS?: number;
  tleEpoch1Utc?: string;
  tleEpoch2Utc?: string;
}


export interface ManeuverRecommendation {
  id: string;
  conjunctionId: string;
  title?: string;
  description?: string;
  scheduledBurnUtc: string;
  hoursBeforeTca?: number;
  deltaVMs: number;
  burnDirection: 'POSIGRADE' | 'RETROGRADE' | 'RADIAL_OUT' | 'CROSS_TRACK';
  postManeuverMissDistanceKm: number;
  postManeuverCollisionProbability: number;
  fuelMassCostKg: number;
  orbitalShiftKm?: number;
  thrusterType?: 'CHEMICAL' | 'COLD_GAS' | 'ELECTRIC';
  uplinkPassStation?: string;
  uplinkDeadlineUtc?: string;
  secondaryConjunctionsCount?: number;
  status: 'RECOMMENDED' | 'PENDING_APPROVAL' | 'EXECUTING' | 'COMPLETED';
}

export interface SpaceWeather {
  kpIndex: number;
  solarFluxF107: number;
  solarWindSpeedKmS: number;
  geomagneticStormAlert: 'Quiet' | 'Unsettled' | 'Minor Storm' | 'Severe Storm';
  atmosphericDensityDrag: 'Nominal' | 'Elevated' | 'Severe';
  lastUpdatedUtc: string;
}

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'WARNING' | 'MEDIUM' | 'LOW' | 'INFO';
export type AlertCategory = 'CONJUNCTION' | 'COLLISION_RISK' | 'TRACKING' | 'CONNECTIVITY' | 'MANEUVER' | 'SYSTEM';

export interface AlertNotification {
  id: string;
  timestampUtc: string;
  timestampEpochMs?: number;
  severity: AlertSeverity;
  category?: AlertCategory;
  title: string;
  message: string;
  source: string;
  acknowledged: boolean;
  read?: boolean;
  targetSatelliteName?: string;
  targetNoradId?: number;
  chaserObjectName?: string;
  chaserNoradId?: number;
  missDistanceKm?: number;
  relativeVelocityKmS?: number;
  tcaUtc?: string;
  collisionProbability?: number;
  calibratedProbability?: number;
  modelConfidence?: number;
  sigmaRadialMeters?: number;
  sigmaInTrackMeters?: number;
  sigmaCrossTrackMeters?: number;
  uncertaintyAvailable?: boolean;
  tleEpochUtc?: string;
  dataFreshness?: 'FRESH' | 'AGING' | 'STALE';
  actionRoute?: string;
  actionLabel?: string;
}

