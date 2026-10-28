import React, { useState, useEffect } from 'react';
import { Rocket, Sparkles, Database } from 'lucide-react';
import { DEMO_PRIMARY_SATELLITE, DEMO_CLOSE_APPROACHES, DEMO_MANEUVER_RECOMMENDATIONS } from '../data/mockData';
import { Satellite, CloseApproach, ManeuverRecommendation } from '../types';
import { fetchCloseApproaches, fetchPrimarySatellite, fetchManeuverRecommendations } from '../services/api';
import { ManeuverHeader } from '../components/planner/ManeuverHeader';
import { CandidateOptionsCard } from '../components/planner/CandidateOptionsCard';
import { OrbitTrajectoryCanvas } from '../components/planner/OrbitTrajectoryCanvas';
import { ManeuverConfigControls } from '../components/planner/ManeuverConfigControls';
import { ManeuverImpactComparison } from '../components/planner/ManeuverImpactComparison';
import { useNavigate } from 'react-router-dom';

export const ManeuverPlannerPage: React.FC = () => {
  const navigate = useNavigate();

  // Selected Satellite & Conjunction
  const [selectedSatellite, setSelectedSatellite] = useState<Satellite>(DEMO_PRIMARY_SATELLITE);
  const [allConjunctions, setAllConjunctions] = useState<CloseApproach[]>(DEMO_CLOSE_APPROACHES);
  const [selectedConjunction, setSelectedConjunction] = useState<CloseApproach>(DEMO_CLOSE_APPROACHES[0]);

  // Candidate Maneuvers
  const [candidates, setCandidates] = useState<ManeuverRecommendation[]>(DEMO_MANEUVER_RECOMMENDATIONS);
  const [selectedCandidate, setSelectedCandidate] = useState<ManeuverRecommendation>(
    DEMO_MANEUVER_RECOMMENDATIONS[0]
  );

  useEffect(() => {
    let isMounted = true;
    fetchPrimarySatellite().then((sat) => {
      if (isMounted && sat) setSelectedSatellite(sat);
    });
    fetchCloseApproaches('all').then((conjs) => {
      if (isMounted && conjs && conjs.length > 0) {
        setAllConjunctions(conjs);
        setSelectedConjunction(conjs[0]);
      }
    });
    fetchManeuverRecommendations().then((recs) => {
      if (isMounted && recs && recs.length > 0) {
        setCandidates(recs);
        setSelectedCandidate(recs[0]);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Tunable Maneuver Configuration Parameters
  const [deltaV, setDeltaV] = useState<number>(DEMO_MANEUVER_RECOMMENDATIONS[0].deltaVMs);
  const [burnDirection, setBurnDirection] = useState<'POSIGRADE' | 'RETROGRADE' | 'RADIAL_OUT' | 'CROSS_TRACK'>(
    DEMO_MANEUVER_RECOMMENDATIONS[0].burnDirection
  );
  const [hoursBeforeTca, setHoursBeforeTca] = useState<number>(
    DEMO_MANEUVER_RECOMMENDATIONS[0].hoursBeforeTca || 2.8
  );
  const [thrusterIsp, setThrusterIsp] = useState<number>(220); // 220s for chemical hydrazine

  // Select a new candidate preset and synchronize parameters
  const handleSelectCandidate = (cand: ManeuverRecommendation) => {
    setSelectedCandidate(cand);
    setDeltaV(cand.deltaVMs);
    setBurnDirection(cand.burnDirection);
    setHoursBeforeTca(cand.hoursBeforeTca || 2.8);
    setThrusterIsp(cand.thrusterType === 'ELECTRIC' ? 1500 : cand.thrusterType === 'COLD_GAS' ? 70 : 220);
  };

  // Reset to the current candidate's default values
  const handleResetDefaults = () => {
    setDeltaV(selectedCandidate.deltaVMs);
    setBurnDirection(selectedCandidate.burnDirection);
    setHoursBeforeTca(selectedCandidate.hoursBeforeTca || 2.8);
    setThrusterIsp(220);
  };

  // Dynamic Astrodynamics & Propulsion Recalculation Engine
  // 1. Tsiolkovsky Rocket Equation: delta_m = m0 * (1 - exp(-deltaV / (Isp * g0)))
  const satelliteWetMassKg = 650; // nominal wet mass
  const g0 = 9.80665;
  const fuelMassCostKg =
    satelliteWetMassKg * (1 - Math.exp(-deltaV / (thrusterIsp * g0)));

  // 2. Trajectory separation scaling based on delta-v and burn horizon
  // Along-track burns (Retrograde/Posigrade) accumulate in-track displacement proportional to time prior:
  const horizonWeight = hoursBeforeTca / 2.8;
  const deltaVScale = deltaV / 0.45;
  let directionMultiplier = 1.0;
  if (burnDirection === 'RETROGRADE') directionMultiplier = 1.1;
  else if (burnDirection === 'POSIGRADE') directionMultiplier = 0.95;
  else if (burnDirection === 'RADIAL_OUT') directionMultiplier = 0.65;
  else if (burnDirection === 'CROSS_TRACK') directionMultiplier = 1.25;

  const calculatedMissKm =
    selectedConjunction.missDistanceKm +
    3.53 * deltaVScale * horizonWeight * directionMultiplier;

  // 3. Residual Collision Probability (exponential decay with separation)
  const calculatedPc = Math.max(
    1e-9,
    selectedConjunction.collisionProbability *
      Math.exp(-2.2 * (calculatedMissKm / Math.max(0.1, selectedConjunction.missDistanceKm)))
  );

  // 4. Orbital shift in km
  let orbitalShiftKm = 0;
  if (burnDirection === 'RETROGRADE') orbitalShiftKm = -0.8 * deltaVScale;
  else if (burnDirection === 'POSIGRADE') orbitalShiftKm = 1.1 * deltaVScale;
  else if (burnDirection === 'RADIAL_OUT') orbitalShiftKm = 0.3 * deltaVScale;

  return (
    <div className="planner-page-container">
      {/* 1. Page Header */}
      <div className="page-header-bar">
        <div className="page-title-group">
          <div className="page-title-icon">
            <Rocket size={18} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div>
            <h1 className="page-heading">Collision Avoidance Maneuver (CAM) Planner</h1>
            <p className="page-subheading">
              Gauss variational equations, impulse optimization, delta-v expenditure, and telecommand sequence synthesis
            </p>
          </div>
        </div>

        <div className="page-action-group">
          <span className="badge badge-operational">
            <Sparkles size={11} style={{ marginRight: '3px' }} />
            4 CANDIDATE SOLUTIONS
          </span>
          <span className="badge badge-cyan" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={12} />
            DETERMINISTIC SIMULATION
          </span>
        </div>
      </div>

      {/* 2. Target Satellite & Conjunction Header */}
      <ManeuverHeader
        satellite={selectedSatellite}
        conjunction={selectedConjunction}
        allConjunctions={allConjunctions}
        onSelectConjunction={(ca) => setSelectedConjunction(ca)}
        onResetPlan={handleResetDefaults}
        onNavigateToRisk={() => navigate('/collision-risk')}
      />

      {/* 3. Candidate Maneuver Options Strip */}
      <CandidateOptionsCard
        candidates={candidates}
        selectedCandidateId={selectedCandidate.id}
        onSelectCandidate={handleSelectCandidate}
      />

      {/* 4. Main Workspace: Trajectory Visualizer (Left) + Maneuver Config & Impact (Right) */}
      <div className="planner-workspace-grid">
        {/* Left: Interactive Orbital Trajectory Canvas */}
        <OrbitTrajectoryCanvas
          conjunction={selectedConjunction}
          maneuver={{
            ...selectedCandidate,
            deltaVMs: deltaV,
            burnDirection,
            hoursBeforeTca,
            postManeuverMissDistanceKm: calculatedMissKm,
            postManeuverCollisionProbability: calculatedPc,
          }}
          currentDeltaV={deltaV}
        />

        {/* Right: Configuration Sliders & Before/After Impact Comparison */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <ManeuverConfigControls
            deltaV={deltaV}
            burnDirection={burnDirection}
            hoursBeforeTca={hoursBeforeTca}
            thrusterIsp={thrusterIsp}
            fuelMassCostKg={fuelMassCostKg}
            onDeltaVChange={setDeltaV}
            onDirectionChange={setBurnDirection}
            onHoursBeforeTcaChange={setHoursBeforeTca}
            onThrusterIspChange={setThrusterIsp}
            onResetDefaults={handleResetDefaults}
          />

          <ManeuverImpactComparison
            conjunction={selectedConjunction}
            maneuver={{
              ...selectedCandidate,
              burnDirection,
              deltaVMs: deltaV,
            }}
            deltaV={deltaV}
            calculatedMissKm={calculatedMissKm}
            calculatedPc={calculatedPc}
            fuelMassCostKg={fuelMassCostKg}
            orbitalShiftKm={orbitalShiftKm}
          />
        </div>
      </div>
    </div>
  );
};
