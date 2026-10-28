import React, { useState } from 'react';
import { Gauge, Sliders, History, Rocket, ArrowLeftRight } from 'lucide-react';
import { CloseApproach } from '../../types';
import { UncertaintyQuantilesPanel } from './UncertaintyQuantilesPanel';
import { ProbabilityCalibrationPanel } from './ProbabilityCalibrationPanel';
import { CdmEvolutionHistoryPanel } from './CdmEvolutionHistoryPanel';
import { useNavigate } from 'react-router-dom';

interface CollisionAnalysisTabsProps {
  encounter: CloseApproach;
}

type TabType = 'uncertainty' | 'calibration' | 'history';

export const CollisionAnalysisTabs: React.FC<CollisionAnalysisTabsProps> = ({ encounter }) => {
  const [activeTab, setActiveTab] = useState<TabType>('uncertainty');
  const navigate = useNavigate();

  return (
    <div className="analysis-tabs-card">
      {/* 1. Tab Nav Buttons */}
      <div className="tab-nav-bar">
        <button
          className={`tab-nav-btn ${activeTab === 'uncertainty' ? 'active' : ''}`}
          onClick={() => setActiveTab('uncertainty')}
        >
          <Gauge size={13} />
          <span>Uncertainty & Quantiles</span>
        </button>

        <button
          className={`tab-nav-btn ${activeTab === 'calibration' ? 'active' : ''}`}
          onClick={() => setActiveTab('calibration')}
        >
          <Sliders size={13} />
          <span>Probability Calibration</span>
        </button>

        <button
          className={`tab-nav-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={13} />
          <span>CDM Evolution</span>
        </button>
      </div>

      {/* 2. Active Tab Content Area */}
      <div className="tab-content-area">
        {activeTab === 'uncertainty' && <UncertaintyQuantilesPanel encounter={encounter} />}
        {activeTab === 'calibration' && <ProbabilityCalibrationPanel encounter={encounter} />}
        {activeTab === 'history' && <CdmEvolutionHistoryPanel encounter={encounter} />}

        {/* 3. Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--space-border-subtle)', paddingTop: '14px', marginTop: '4px' }}>
          <button
            className="btn-aerospace btn-primary"
            onClick={() => navigate('/maneuver-planner')}
            style={{ flex: 1, justifyContent: 'center', padding: '7px 12px' }}
          >
            <Rocket size={14} />
            <span>Plan Avoidance Maneuver</span>
          </button>

          <button
            className="btn-aerospace"
            onClick={() => navigate('/close-approaches')}
            style={{ flex: 1, justifyContent: 'center', padding: '7px 12px' }}
          >
            <ArrowLeftRight size={14} />
            <span>Close Approaches</span>
          </button>
        </div>
      </div>
    </div>
  );
};
