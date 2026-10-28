import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Rocket,
  Radio,
  ExternalLink,
  Info,
  Clock,
  CheckCircle2,
  Database,
  Flame,
  X,
} from 'lucide-react';
import {
  fetchHistoricalEvents,
  fetchHistoricalIncidents,
  HistoricalEvent,
  HistoricalEventsQueryResponse,
  IncidentDetail,
} from '../../services/api';

interface HistoricalDateExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenIridiumReplay?: () => void;
}

export const HistoricalDateExplorer: React.FC<HistoricalDateExplorerProps> = ({
  isOpen,
  onClose,
  onOpenIridiumReplay,
}) => {
  // Navigation tabs: 'events' (Date Explorer) vs 'incidents' (Real-Life Incidents Library)
  const [activeTab, setActiveTab] = useState<'events' | 'incidents'>('events');

  // Date range state: default to required 1 Jan 2025 -> 31 Jan 2025
  const [startDate, setStartDate] = useState<string>('2025-01-01');
  const [endDate, setEndDate] = useState<string>('2025-01-31');
  const [category, setCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Data states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [eventsData, setEventsData] = useState<HistoricalEventsQueryResponse | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(null);

  // Incidents library states
  const [incidents, setIncidents] = useState<IncidentDetail[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [incidentsLoading, setIncidentsLoading] = useState<boolean>(false);

  // Query events whenever date range or category changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchHistoricalEvents(startDate, endDate, category, searchTerm);
        if (isMounted) {
          setEventsData(data);
          if (data.events.length > 0 && !selectedEvent) {
            setSelectedEvent(data.events[0]);
          } else if (data.events.length === 0) {
            setSelectedEvent(null);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to query historical events from backend.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(loadEvents, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, startDate, endDate, category, searchTerm]);

  // Load incidents library
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const loadIncidents = async () => {
      setIncidentsLoading(true);
      try {
        const data = await fetchHistoricalIncidents();
        if (isMounted) {
          setIncidents(data);
          if (data.length > 0 && !selectedIncident) {
            setSelectedIncident(data[0]);
          }
        }
      } catch (err: any) {
        console.warn('Could not load incidents:', err);
      } finally {
        if (isMounted) setIncidentsLoading(false);
      }
    };
    loadIncidents();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Quick Preset Handlers
  const handleSetPreset = (preset: 'jan2025' | 'may2025' | 'dec2025' | 'today') => {
    if (preset === 'jan2025') {
      setStartDate('2025-01-01');
      setEndDate('2025-01-31');
    } else if (preset === 'may2025') {
      setStartDate('2025-05-01');
      setEndDate('2025-05-01');
    } else if (preset === 'dec2025') {
      setStartDate('2025-12-01');
      setEndDate('2025-12-01');
    } else if (preset === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      setStartDate(today);
      setEndDate(today);
    }
  };

  // Day step controls
  const handleShiftDay = (direction: 'prev' | 'next') => {
    try {
      const current = new Date(startDate);
      const delta = direction === 'next' ? 1 : -1;
      current.setUTCDate(current.getUTCDate() + delta);
      const newDate = current.toISOString().slice(0, 10);
      setStartDate(newDate);
      setEndDate(newDate);
    } catch (e) {
      console.warn('Error shifting date:', e);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'LAUNCH':
        return <Rocket size={14} style={{ color: '#38bdf8' }} />;
      case 'COLLISION':
        return <Flame size={14} style={{ color: '#ef4444' }} />;
      case 'CONJUNCTION':
        return <ShieldAlert size={14} style={{ color: '#f59e0b' }} />;
      default:
        return <Radio size={14} style={{ color: '#10b981' }} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 11, 24, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, rgba(10, 18, 36, 0.96) 0%, rgba(6, 12, 24, 0.98) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.15)',
          overflow: 'hidden',
          color: '#e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(14, 23, 42, 0.8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarIcon size={18} style={{ color: '#38bdf8' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, letterSpacing: '0.04em' }}>
                  HISTORICAL DATE EXPLORER & INCIDENTS
                </h2>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontWeight: 600,
                  }}
                >
                  UTC BACKEND VERIFIED
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8' }}>
                Query stored orbital records, launches, historical encounters, and authoritative incident case studies
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* View Mode Tabs */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(15, 23, 42, 0.9)',
                padding: '3px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <button
                onClick={() => setActiveTab('events')}
                style={{
                  padding: '5px 14px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeTab === 'events' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                  color: activeTab === 'events' ? '#38bdf8' : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
              >
                Date Timeline Explorer
              </button>
              <button
                onClick={() => setActiveTab('incidents')}
                style={{
                  padding: '5px 14px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeTab === 'incidents' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                  color: activeTab === 'incidents' ? '#f87171' : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
              >
                Real-Life Incidents Library
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab 1: Historical Date Explorer */}
        {activeTab === 'events' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Filter and Control Toolbar */}
            <div
              style={{
                padding: '12px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(11, 20, 38, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {/* Date Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn-aerospace"
                  onClick={() => handleShiftDay('prev')}
                  style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                  title="Shift 1 day earlier"
                >
                  <ChevronLeft size={14} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>START:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#f8fafc',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>END:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#f8fafc',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <button
                  className="btn-aerospace"
                  onClick={() => handleShiftDay('next')}
                  style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                  title="Shift 1 day later"
                >
                  <ChevronRight size={14} />
                </button>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '4px', marginLeft: '6px' }}>
                  <button
                    className="btn-aerospace"
                    onClick={() => handleSetPreset('jan2025')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.68rem',
                      borderColor: startDate === '2025-01-01' && endDate === '2025-01-31' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                      color: startDate === '2025-01-01' ? '#38bdf8' : '#94a3b8',
                    }}
                  >
                    Jan 2025 (Initial)
                  </button>
                  <button
                    className="btn-aerospace"
                    onClick={() => handleSetPreset('may2025')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.68rem',
                      borderColor: startDate === '2025-05-01' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                      color: startDate === '2025-05-01' ? '#38bdf8' : '#94a3b8',
                    }}
                  >
                    1 May 2025
                  </button>
                  <button
                    className="btn-aerospace"
                    onClick={() => handleSetPreset('dec2025')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.68rem',
                      borderColor: startDate === '2025-12-01' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                      color: startDate === '2025-12-01' ? '#38bdf8' : '#94a3b8',
                    }}
                  >
                    1 Dec 2025
                  </button>
                  <button
                    className="btn-aerospace"
                    onClick={() => handleSetPreset('today')}
                    style={{ padding: '4px 8px', fontSize: '0.68rem', color: '#94a3b8' }}
                  >
                    Current Date
                  </button>
                </div>
              </div>

              {/* Search and Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={14}
                    style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                  />
                  <input
                    type="text"
                    placeholder="Search satellite, NORAD, event..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      padding: '5px 8px 5px 28px',
                      borderRadius: '4px',
                      fontSize: '0.74rem',
                      width: '210px',
                    }}
                  />
                </div>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#f8fafc',
                    padding: '5px 8px',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                  }}
                >
                  <option value="ALL">All Categories</option>
                  <option value="LAUNCHES">Launches</option>
                  <option value="CONJUNCTIONS">Conjunctions / Close Approaches</option>
                  <option value="COLLISIONS">Historical Collisions</option>
                  <option value="SATELLITE_EVENTS">Satellite Events</option>
                </select>
              </div>
            </div>

            {/* Coverage and Provenance Header Banner */}
            <div
              style={{
                padding: '8px 24px',
                background: 'rgba(56, 189, 248, 0.05)',
                borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: '#94a3b8',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span>
                  Query Range: <strong style={{ color: '#f8fafc' }}>{startDate}</strong> to{' '}
                  <strong style={{ color: '#f8fafc' }}>{endDate} (UTC)</strong>
                </span>
                <span>
                  Records Found:{' '}
                  <strong style={{ color: '#38bdf8' }}>{eventsData?.totalCount ?? 0} events</strong>
                </span>
                <span>
                  Coverage Status:{' '}
                  <span
                    style={{
                      color:
                        eventsData?.coverageStatus === 'COMPLETE_HISTORICAL_SAMPLE'
                          ? '#10b981'
                          : eventsData?.coverageStatus === 'NO_RECORDS_STORED'
                          ? '#f59e0b'
                          : '#38bdf8',
                      fontWeight: 600,
                    }}
                  >
                    {eventsData?.coverageStatus || 'QUERYING'}
                  </span>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={12} style={{ color: '#38bdf8' }} />
                <span>Space-Track Ingestion: Bounded • CelesTrak TLE Epochs Separated</span>
              </div>
            </div>

            {/* Main Content Split: Event List vs Detail Panel */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
              {/* Event List */}
              <div
                style={{
                  width: '45%',
                  borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                  overflowY: 'auto',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                    Querying SQLite & catalog events for UTC window...
                  </div>
                ) : error ? (
                  <div
                    style={{
                      padding: '16px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      color: '#f87171',
                      fontSize: '0.75rem',
                    }}
                  >
                    {error}
                  </div>
                ) : !eventsData || eventsData.events.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 16px',
                      background: 'rgba(15, 23, 42, 0.4)',
                      borderRadius: '8px',
                      border: '1px dashed rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <Info size={24} style={{ color: '#64748b', marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1' }}>
                      No Events In Database For Selected Range
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', maxWidth: '320px', marginInline: 'auto' }}>
                      No verified launches, conjunction alerts, or historical incident dates match {startDate} to {endDate}.
                      Data provenance strictly reflects stored catalog records without synthetic inflation.
                    </div>
                  </div>
                ) : (
                  eventsData.events.map((evt) => {
                    const isSelected = selectedEvent?.id === evt.id;
                    return (
                      <div
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: isSelected
                            ? 'rgba(56, 189, 248, 0.12)'
                            : 'rgba(15, 23, 42, 0.6)',
                          border: isSelected
                            ? '1px solid rgba(56, 189, 248, 0.5)'
                            : '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {getCategoryIcon(evt.category)}
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '3px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: '#94a3b8',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {evt.category}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>
                            {evt.timestampUtc.replace('T', ' ').slice(0, 16)} UTC
                          </span>
                        </div>

                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isSelected ? '#38bdf8' : '#f1f5f9' }}>
                          {evt.name}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8' }}>
                          <span>Source: {evt.source}</span>
                          {evt.isVerifiedFact && (
                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle2 size={11} /> Verified
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Event Detail Panel */}
              <div
                style={{
                  width: '55%',
                  overflowY: 'auto',
                  padding: '20px 24px',
                  background: 'rgba(8, 15, 30, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {selectedEvent ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          {getCategoryIcon(selectedEvent.category)}
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: '#38bdf8',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {selectedEvent.category} • {selectedEvent.id}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0', color: '#ffffff' }}>
                          {selectedEvent.name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#94a3b8' }}>
                          <Clock size={13} />
                          <span>Exact Timestamp: <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{selectedEvent.timestampUtc} (UTC)</strong></span>
                        </div>
                      </div>

                      {/* If event is Iridium collision, offer quick replay button */}
                      {selectedEvent.id.includes('IRIDIUM') && onOpenIridiumReplay && (
                        <button
                          className="btn-aerospace"
                          onClick={onOpenIridiumReplay}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            borderColor: '#ef4444',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Flame size={13} style={{ color: '#ef4444' }} />
                          <span>LAUNCH REPLAY</span>
                        </button>
                      )}
                    </div>

                    {/* Satellites Involved */}
                    {selectedEvent.satellites && selectedEvent.satellites.length > 0 && (
                      <div
                        style={{
                          background: 'rgba(15, 23, 42, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '12px 16px',
                        }}
                      >
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.04em' }}>
                          ASSOCIATED SPACECRAFT / CATALOG OBJECTS
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                          {selectedEvent.satellites.map((s, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: '8px 12px',
                                background: 'rgba(30, 41, 59, 0.6)',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                              }}
                            >
                              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f8fafc' }}>{s.name}</div>
                              <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                                NORAD #{s.noradId}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scientific Details Key-Value Grid */}
                    {selectedEvent.details && (
                      <div
                        style={{
                          background: 'rgba(15, 23, 42, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '12px 16px',
                        }}
                      >
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.04em' }}>
                          MISSION TELEMETRY & EVENT METRICS
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {Object.entries(selectedEvent.details).map(([k, v]) => (
                            <div key={k} style={{ padding: '6px 8px', background: 'rgba(11, 20, 38, 0.5)', borderRadius: '4px' }}>
                              <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>
                                {k.replace(/([A-Z])/g, ' $1')}
                              </div>
                              <div style={{ fontSize: '0.76rem', color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace', marginTop: '2px' }}>
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Data Provenance & Scientific Honesty Panel */}
                    <div
                      style={{
                        background: 'rgba(56, 189, 248, 0.04)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <Database size={14} style={{ color: '#38bdf8' }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8' }}>
                          DATA PROVENANCE & SCIENTIFIC CITATION
                        </span>
                      </div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.74rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                        {selectedEvent.provenance}
                      </p>
                      {selectedEvent.sourceUrl && (
                        <a
                          href={selectedEvent.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.72rem',
                            color: '#38bdf8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none',
                          }}
                        >
                          <span>Open Authoritative External Source</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b', fontSize: '0.8rem' }}>
                    Select an event from the timeline to view verified orbital parameters and provenance
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Real-Life Incidents Library */}
        {activeTab === 'incidents' && (
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* Incident Cards Column */}
            <div
              style={{
                width: '42%',
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>
                FEATURED HISTORICAL COLLISION & CLOSE-APPROACH CASE STUDIES:
              </div>

              {incidentsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading verified incidents...</div>
              ) : (
                incidents.map((inc) => {
                  const isSelected = selectedIncident?.id === inc.id;
                  const isAwaiting = inc.verificationStatus === 'AWAITING_INCIDENT_VERIFICATION';

                  return (
                    <div
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '8px',
                        background: isSelected
                          ? 'rgba(239, 68, 68, 0.12)'
                          : 'rgba(15, 23, 42, 0.7)',
                        border: isSelected
                          ? '1px solid rgba(239, 68, 68, 0.5)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: isAwaiting
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(239, 68, 68, 0.2)',
                            color: isAwaiting ? '#f59e0b' : '#ef4444',
                            border: isAwaiting
                              ? '1px solid rgba(245, 158, 11, 0.3)'
                              : '1px solid rgba(239, 68, 68, 0.4)',
                          }}
                        >
                          {isAwaiting ? 'AWAITING VERIFICATION' : 'CONFIRMED HISTORICAL COLLISION'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {inc.date} • {inc.timeUtc}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isSelected ? '#ffffff' : '#f1f5f9' }}>
                        {inc.title}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.7rem', color: '#94a3b8' }}>
                        <span>Alt: <strong style={{ color: '#38bdf8' }}>{inc.altitudeKm} km</strong></span>
                        <span>Rel Vel: <strong style={{ color: '#f59e0b' }}>{inc.relativeVelocityKmS} km/s</strong></span>
                        <span>Miss: <strong style={{ color: '#ef4444' }}>{inc.predictedClosestApproachMeters ?? 'N/A'} m</strong></span>
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {inc.outcome}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Incident Detailed Case Study View */}
            <div
              style={{
                width: '58%',
                overflowY: 'auto',
                padding: '24px',
                background: 'rgba(8, 15, 30, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              {selectedIncident ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: selectedIncident.verificationStatus === 'AWAITING_INCIDENT_VERIFICATION' ? '#f59e0b' : '#ef4444',
                          letterSpacing: '0.04em',
                          marginBottom: '4px',
                        }}
                      >
                        {selectedIncident.verificationStatus.replace(/_/g, ' ')}
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 6px 0', color: '#ffffff' }}>
                        {selectedIncident.title}
                      </h3>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        Event Date: <strong style={{ color: '#f8fafc' }}>{selectedIncident.date}</strong> at{' '}
                        <strong style={{ color: '#f8fafc' }}>{selectedIncident.timeUtc} (UTC)</strong>
                      </div>
                    </div>

                    {/* Dedicated Replay Button if Iridium */}
                    {selectedIncident.id === 'iridium-33-cosmos-2251' && onOpenIridiumReplay && (
                      <button
                        className="btn-aerospace"
                        onClick={onOpenIridiumReplay}
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(56, 189, 248, 0.2))',
                          borderColor: '#ef4444',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        <Flame size={14} style={{ color: '#ef4444' }} />
                        <span>INTERACTIVE 3D REPLAY</span>
                      </button>
                    )}
                  </div>

                  {/* Dual Satellite Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Primary */}
                    <div
                      style={{
                        padding: '12px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                        PRIMARY SPACECRAFT
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                        {selectedIncident.primarySat.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                        NORAD #{selectedIncident.primarySat.noradId} • {selectedIncident.primarySat.operator}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '6px' }}>
                        Status: <strong>{selectedIncident.primarySat.statusBefore}</strong>
                      </div>
                      {selectedIncident.primarySat.orbit && (
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px', fontFamily: 'monospace' }}>
                          {selectedIncident.primarySat.orbit}
                        </div>
                      )}
                    </div>

                    {/* Secondary */}
                    <div
                      style={{
                        padding: '12px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>
                        SECONDARY / INTERSECTING BODY
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                        {selectedIncident.secondarySat.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                        {selectedIncident.secondarySat.noradId ? `NORAD #${selectedIncident.secondarySat.noradId} • ` : ''}
                        {selectedIncident.secondarySat.operator}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '6px' }}>
                        Status: <strong>{selectedIncident.secondarySat.statusBefore}</strong>
                      </div>
                      {selectedIncident.secondarySat.orbit && (
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px', fontFamily: 'monospace' }}>
                          {selectedIncident.secondarySat.orbit}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Encounter Geometry */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '12px 16px',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>
                      ENCOUNTER GEOMETRY & KINEMATICS
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      <div style={{ padding: '8px', background: 'rgba(11, 20, 38, 0.5)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>COLLISION ALTITUDE</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                          {selectedIncident.altitudeKm} km
                        </div>
                      </div>
                      <div style={{ padding: '8px', background: 'rgba(11, 20, 38, 0.5)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>RELATIVE VELOCITY</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>
                          {selectedIncident.relativeVelocityKmS} km/s
                        </div>
                      </div>
                      <div style={{ padding: '8px', background: 'rgba(11, 20, 38, 0.5)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>PRE-EVENT MISS DISTANCE</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>
                          {selectedIncident.predictedClosestApproachMeters ?? 'N/A'} m
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outcome and Debris Consequences */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                      HISTORICAL OUTCOME & DEBRIS CONSEQUENCES
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                      {selectedIncident.outcome}
                    </p>
                  </div>

                  {/* Verification & Provenance Alert */}
                  <div
                    style={{
                      background:
                        selectedIncident.verificationStatus === 'AWAITING_INCIDENT_VERIFICATION'
                          ? 'rgba(245, 158, 11, 0.08)'
                          : 'rgba(16, 185, 129, 0.08)',
                      border:
                        selectedIncident.verificationStatus === 'AWAITING_INCIDENT_VERIFICATION'
                          ? '1px solid rgba(245, 158, 11, 0.3)'
                          : '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Info
                        size={14}
                        style={{
                          color: selectedIncident.verificationStatus === 'AWAITING_INCIDENT_VERIFICATION' ? '#f59e0b' : '#10b981',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: selectedIncident.verificationStatus === 'AWAITING_INCIDENT_VERIFICATION' ? '#f59e0b' : '#10b981',
                        }}
                      >
                        {selectedIncident.verificationStatus === 'AWAITING_INCIDENT_VERIFICATION'
                          ? 'AWAITING OFFICIAL INCIDENT IDENTIFICATION'
                          : 'VERIFIED HISTORICAL FACT'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                      {selectedIncident.verificationNote}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px' }}>
                      Scientific Provenance: <strong>{selectedIncident.provenance}</strong>
                    </div>

                    {/* Authoritative Source Links */}
                    {selectedIncident.sourceLinks && selectedIncident.sourceLinks.length > 0 && (
                      <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {selectedIncident.sourceLinks.map((src, idx) => (
                          <a
                            key={idx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.72rem',
                              color: '#38bdf8',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              textDecoration: 'none',
                              background: 'rgba(56, 189, 248, 0.1)',
                              padding: '3px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            <span>{src.name}</span>
                            <ExternalLink size={11} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                  Select an incident card to view technical analysis and source citations
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
