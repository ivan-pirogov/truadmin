import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw, FiActivity, FiAlertTriangle } from 'react-icons/fi';
import { apiService, ActiveQuery, Deadlock, Lock } from '../../services/api';
import MetricsCharts from './MetricsCharts';
import ActiveQueriesTable from './ActiveQueriesTable';
import LocksTable from './LocksTable';
import DeadlocksSection from './DeadlocksSection';
import LongRunningQueriesTable from './LongRunningQueriesTable';
import './MonitoringTab.css';

interface MonitoringTabProps {
  connectionId: string;
  databaseName: string;
}

const MonitoringTab: React.FC<MonitoringTabProps> = ({ connectionId, databaseName }) => {
  const [activeQueries, setActiveQueries] = useState<ActiveQuery[]>([]);
  const [locks, setLocks] = useState<Lock[]>([]);
  const [deadlocks, setDeadlocks] = useState<Deadlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSystemLocks, setShowSystemLocks] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [selectedQueryIds, setSelectedQueryIds] = useState<Set<string>>(new Set());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(3);
  const [progress, setProgress] = useState(0);
  const [showCharts, setShowCharts] = useState(true);
  const [metricsHistory, setMetricsHistory] = useState<Array<{
    time: string;
    activeQueries: number;
    locks: number;
    deadlocks: number;
    longQueries: number;
  }>>([]);
  const [longQueryThreshold, setLongQueryThreshold] = useState(10000); // 10 seconds in milliseconds

  const loadMonitoringData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [queriesData, locksData, deadlocksData] = await Promise.all([
        apiService.getActiveQueries(connectionId, databaseName, showOnlyActive),
        apiService.getLocks(connectionId, databaseName, showSystemLocks),
        apiService.getDeadlocks(connectionId, databaseName),
      ]);
      setActiveQueries(queriesData);
      setLocks(locksData);
      setDeadlocks(deadlocksData);
      setSelectedQueryIds(new Set()); // Clear selection after refresh

      // Update metrics history
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setMetricsHistory(prev => {
        const longQueriesCount = queriesData.filter(q => q.duration >= longQueryThreshold).length;
        const newHistory = [...prev, {
          time: timeStr,
          activeQueries: queriesData.length,
          locks: locksData.length,
          deadlocks: deadlocksData.length,
          longQueries: longQueriesCount,
        }];
        // Keep only last 20 data points
        return newHistory.slice(-20);
      });
    } catch (err) {
      console.error('Error loading monitoring data:', err);
      setError('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }, [connectionId, databaseName, showSystemLocks, showOnlyActive, longQueryThreshold]);

  // Initial load only
  useEffect(() => {
    loadMonitoringData();
  }, [connectionId, databaseName, showSystemLocks, showOnlyActive, longQueryThreshold, loadMonitoringData]);

  // Auto-refresh logic with progress
  useEffect(() => {
    if (!autoRefreshEnabled) {
      setProgress(0);
      return;
    }

    const intervalMs = refreshInterval * 1000;
    const progressUpdateInterval = 50; // Update progress every 50ms
    const progressStep = (progressUpdateInterval / intervalMs) * 100;

    let currentProgress = 0;
    const progressTimer = setInterval(() => {
      currentProgress += progressStep;
      if (currentProgress >= 100) {
        currentProgress = 0;
        loadMonitoringData();
      }
      setProgress(currentProgress);
    }, progressUpdateInterval);

    return () => clearInterval(progressTimer);
  }, [autoRefreshEnabled, refreshInterval, loadMonitoringData]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU');
  };

  const formatThreshold = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds} sec`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const handleQuerySelect = (queryId: string, checked: boolean) => {
    setSelectedQueryIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(queryId);
      } else {
        newSet.delete(queryId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQueryIds(new Set(activeQueries.map(q => q.id)));
    } else {
      setSelectedQueryIds(new Set());
    }
  };

  const handleTerminateQueries = async () => {
    if (selectedQueryIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to terminate ${selectedQueryIds.size} selected query(ies)?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await apiService.terminateQueries(connectionId, databaseName, Array.from(selectedQueryIds));
      await loadMonitoringData();
    } catch (err) {
      console.error('Error terminating queries:', err);
      setError('Failed to terminate queries');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
    if (!autoRefreshEnabled) {
      setProgress(0);
    }
  };

  return (
    <div className="monitoring-tab">
      <div className="monitoring-header">
        <h2>
          <FiActivity size={20} />
          Database Monitoring: {databaseName}
        </h2>
        <div className="header-actions">
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!showCharts}
              onChange={(e) => setShowCharts(!e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Hide Charts
          </label>
          <button
            className="btn btn-secondary"
            onClick={loadMonitoringData}
            disabled={loading}
          >
            <FiRefreshCw size={18} className={loading ? 'rotating' : ''} />
            Refresh
          </button>
          <button
            className={`btn ${autoRefreshEnabled ? 'btn-auto-refresh-active' : 'btn-secondary'}`}
            onClick={toggleAutoRefresh}
            disabled={loading}
            style={{
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiRefreshCw size={18} className={autoRefreshEnabled ? 'rotating' : ''} />
              Auto Refresh
            </span>
            {autoRefreshEnabled && (
              <div
                className="auto-refresh-progress"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${progress}%`,
                  background: 'rgba(255, 255, 255, 0.3)',
                  transition: 'width 50ms linear',
                  zIndex: 0,
                }}
              />
            )}
          </button>
          {autoRefreshEnabled && (
            <select
              className="refresh-interval-select"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <option value={1}>1 sec</option>
              <option value={2}>2 sec</option>
              <option value={3}>3 sec</option>
              <option value={5}>5 sec</option>
              <option value={10}>10 sec</option>
              <option value={15}>15 sec</option>
            </select>
          )}
        </div>
      </div>

      <div className="monitoring-content">
        {error && (
          <div className="monitoring-error">
            <FiAlertTriangle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Metrics Charts */}
        {showCharts && (
          <MetricsCharts
            metricsHistory={metricsHistory}
            showOnlyActive={showOnlyActive}
            showSystemLocks={showSystemLocks}
            longQueryThreshold={longQueryThreshold}
            formatThreshold={formatThreshold}
          />
        )}

        {/* Active Queries Table */}
        <ActiveQueriesTable
          activeQueries={activeQueries}
          selectedQueryIds={selectedQueryIds}
          showOnlyActive={showOnlyActive}
          loading={loading}
          onQuerySelect={handleQuerySelect}
          onSelectAll={handleSelectAll}
          onTerminateQueries={handleTerminateQueries}
          onShowOnlyActiveChange={setShowOnlyActive}
          formatDuration={formatDuration}
          formatTimestamp={formatTimestamp}
        />

        {/* Locks Table */}
        <LocksTable
          locks={locks}
          showSystemLocks={showSystemLocks}
          onShowSystemLocksChange={setShowSystemLocks}
        />

        {/* Deadlocks Section */}
        <DeadlocksSection
          deadlocks={deadlocks}
          formatTimestamp={formatTimestamp}
        />

        {/* Long Running Queries Table */}
        <LongRunningQueriesTable
          activeQueries={activeQueries}
          longQueryThreshold={longQueryThreshold}
          onThresholdChange={setLongQueryThreshold}
          formatDuration={formatDuration}
          formatTimestamp={formatTimestamp}
        />
      </div>
    </div>
  );
};

export default MonitoringTab;
