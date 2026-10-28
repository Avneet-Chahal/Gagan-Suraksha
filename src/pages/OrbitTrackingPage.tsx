import React, { useState, useEffect, useRef } from 'react';
import { OrbitTrackingScene } from '../components/tracking/OrbitTrackingScene';
import { TrackingTimeline } from '../components/tracking/TrackingTimeline';
import { TrackingInfoPanel } from '../components/tracking/TrackingInfoPanel';
import { TrackingSelector } from '../components/tracking/TrackingSelector';
import { DEMO_SATELLITES_LIST, DEMO_PRIMARY_SATELLITE } from '../data/mockData';
import { Satellite } from '../types';

export const OrbitTrackingPage: React.FC = () => {
  const [satellites] = useState<Satellite[]>(DEMO_SATELLITES_LIST);
  const [selectedSatellite, setSelectedSatellite] = useState<Satellite>(DEMO_PRIMARY_SATELLITE);

  // Simulation Timeline State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(60); // Default to 60x (1 min sim / real sec)
  const [simSeconds, setSimSeconds] = useState<number>(0);
  const baseEpochRef = useRef<Date>(new Date('2025-04-27T08:24:36Z'));

  // Layer & HUD Toggles
  const [showOrbitPaths, setShowOrbitPaths] = useState<boolean>(true);
  const [showGroundTrack, setShowGroundTrack] = useState<boolean>(true);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState<boolean>(true);

  // Simulation Clock Tick Loop
  useEffect(() => {
    if (!isPlaying) return;

    let lastTick = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const deltaSec = (now - lastTick) / 1000;
      lastTick = now;

      setSimSeconds((prev) => {
        const next = prev + deltaSec * playbackSpeed;
        return next >= 86400 ? next % 86400 : next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const handleStepBackward = () => {
    setSimSeconds((prev) => Math.max(0, prev - 900)); // Step back 15 min
  };

  const handleStepForward = () => {
    setSimSeconds((prev) => (prev + 900) % 86400); // Step forward 15 min
  };

  const handleResetTime = () => {
    setSimSeconds(0);
  };

  return (
    <div className="tracking-page-container">
      {/* 1. Main Interactive 3D Orbit Workspace */}
      <div className="tracking-workspace">
        {/* Floating Top-Left Selector & Legend */}
        <TrackingSelector
          satellites={satellites}
          selectedSatellite={selectedSatellite}
          onSelectSatellite={setSelectedSatellite}
        />

        {/* Central 3D Three.js Earth Scene with Multi-Orbit Propagation */}
        <OrbitTrackingScene
          satellites={satellites}
          selectedSatellite={selectedSatellite}
          onSelectSatellite={setSelectedSatellite}
          simEpochSeconds={simSeconds}
          showOrbitPaths={showOrbitPaths}
          onToggleOrbitPaths={() => setShowOrbitPaths((prev) => !prev)}
          showGroundTrack={showGroundTrack}
          onToggleGroundTrack={() => setShowGroundTrack((prev) => !prev)}
        />

        {/* Right Collapsible Orbital Information Panel */}
        <TrackingInfoPanel
          satellite={selectedSatellite}
          simSeconds={simSeconds}
          isOpen={isInfoPanelOpen}
          onToggleOpen={() => setIsInfoPanelOpen((prev) => !prev)}
        />
      </div>

      {/* 2. Bottom Interactive Simulation Timeline Scrubber Bar */}
      <TrackingTimeline
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((prev) => !prev)}
        simSeconds={simSeconds}
        onSeek={setSimSeconds}
        onStepBackward={handleStepBackward}
        onStepForward={handleStepForward}
        onResetTime={handleResetTime}
        playbackSpeed={playbackSpeed}
        onSelectSpeed={setPlaybackSpeed}
        baseEpoch={baseEpochRef.current}
      />
    </div>
  );
};
