import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiRefreshCw, FiClock, FiFilter } from 'react-icons/fi';
import TabLayout from '../TabLayout/TabLayout';
import { apiService } from '../../services/api';
import './QueryHistoryTab.css';

interface QueryHistoryTabProps {
  connectionId: string;
  databaseName: string;
}

interface QueryStatement {
  queryid: string;
  query: string;
  calls: number;
  total_exec_time: number;
  min_exec_time: number;
  max_exec_time: number;
  mean_exec_time: number;
  rows: number;
  username: string;
  database_name: string;
  shared_blks_hit: number;
  shared_blks_read: number;
  shared_blks_dirtied: number;
  temp_blks_read: number;
  temp_blks_written: number;
}

const QueryHistoryTab: React.FC<QueryHistoryTabProps> = ({ connectionId, databaseName }) => {
  const [queries, setQueries] = useState<QueryStatement[]>([]);
  const [filteredQueries, setFilteredQueries] = useState<QueryStatement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof QueryStatement>('total_exec_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [minCalls, setMinCalls] = useState<number>(0);

  const loadQueryHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getQueryHistory(connectionId, databaseName);
      setQueries(data);
    } catch (err) {
      console.error('Error loading query history:', err);
      setError('Failed to load query history');
    } finally {
      setLoading(false);
    }
  }, [connectionId, databaseName]);

  useEffect(() => {
    loadQueryHistory();
  }, [loadQueryHistory]);

  useEffect(() => {
    let result = [...queries];

    // Filter by search term
    if (searchTerm) {
      result = result.filter(q =>
        q.query.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by minimum calls
    if (minCalls > 0) {
      result = result.filter(q => q.calls >= minCalls);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredQueries(result);
  }, [queries, searchTerm, minCalls, sortField, sortDirection]);

  const formatTime = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(2)}µs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
  };

  const calculateCacheHitRatio = (hit: number, read: number): string => {
    const total = hit + read;
    if (total === 0) return 'N/A';
    const ratio = (hit / total) * 100;
    return `${ratio.toFixed(1)}%`;
  };

  const formatBlocks = (blocks: number): string => {
    if (blocks === 0) return '0';
    if (blocks < 1024) return formatNumber(blocks);
    if (blocks < 1024 * 1024) return `${(blocks / 1024).toFixed(1)}K`;
    return `${(blocks / (1024 * 1024)).toFixed(1)}M`;
  };

  const handleSort = (field: keyof QueryStatement) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: keyof QueryStatement) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  if (loading && queries.length === 0) {
    return (
      <TabLayout>
        <div className="loading-container">Loading query history...</div>
      </TabLayout>
    );
  }

  if (error) {
    return (
      <TabLayout>
        <div className="error-banner">{error}</div>
      </TabLayout>
    );
  }

  const headerContent = (
    <div className="query-history-header">
      <div className="connections-title-wrapper">
        <FiClock size={28} className="connections-title-icon" />
        <h1 className="connections-title">Query History - {databaseName}</h1>
      </div>
      <button className="btn btn-secondary" onClick={loadQueryHistory} disabled={loading}>
        <FiRefreshCw size={18} className={loading ? 'rotating' : ''} />
        Refresh
      </button>
    </div>
  );

  const footerContent = filteredQueries.length > 0 && (
    <div className="connections-footer">
      <span className="connections-count">
        {filteredQueries.length} {filteredQueries.length === 1 ? 'query' : 'queries'}
        {searchTerm || minCalls > 0 ? ` (filtered from ${queries.length})` : ''}
      </span>
    </div>
  );

  return (
    <TabLayout header={headerContent} footer={footerContent}>
      <div className="query-history-filters">
        <div className="filter-group">
          <FiSearch size={16} />
          <input
            type="text"
            className="filter-input"
            placeholder="Search queries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <FiFilter size={16} />
          <label htmlFor="min-calls">Min calls:</label>
          <input
            id="min-calls"
            type="number"
            className="filter-input-small"
            min="0"
            value={minCalls}
            onChange={(e) => setMinCalls(Number(e.target.value))}
          />
        </div>
      </div>

      {filteredQueries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <FiClock size={64} />
          </div>
          <p className="empty-title">No query history</p>
          <p className="empty-description">
            {searchTerm || minCalls > 0
              ? 'No queries match your filters'
              : 'Execute some queries to see history here'}
          </p>
        </div>
      ) : (
        <div className="query-history-table-container">
          <table className="query-history-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('username')} className="sortable">
                  User{getSortIcon('username')}
                </th>
                <th onClick={() => handleSort('query')} className="sortable">
                  Query{getSortIcon('query')}
                </th>
                <th onClick={() => handleSort('calls')} className="sortable">
                  Calls{getSortIcon('calls')}
                </th>
                <th onClick={() => handleSort('total_exec_time')} className="sortable">
                  Total Time{getSortIcon('total_exec_time')}
                </th>
                <th onClick={() => handleSort('mean_exec_time')} className="sortable">
                  Avg Time{getSortIcon('mean_exec_time')}
                </th>
                <th onClick={() => handleSort('min_exec_time')} className="sortable">
                  Min Time{getSortIcon('min_exec_time')}
                </th>
                <th onClick={() => handleSort('max_exec_time')} className="sortable">
                  Max Time{getSortIcon('max_exec_time')}
                </th>
                <th onClick={() => handleSort('rows')} className="sortable">
                  Rows{getSortIcon('rows')}
                </th>
                <th className="sortable" title="Cache Hit Ratio (Shared Blocks)">
                  Cache Hit
                </th>
                <th onClick={() => handleSort('temp_blks_read')} className="sortable" title="Temporary blocks read + written">
                  Temp Blks{getSortIcon('temp_blks_read')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredQueries.map((query, index) => (
                <tr key={query.queryid || index}>
                  <td className="user-cell">{query.username}</td>
                  <td className="query-text">
                    <pre>{query.query}</pre>
                  </td>
                  <td className="numeric-cell">{formatNumber(query.calls)}</td>
                  <td className="numeric-cell">{formatTime(query.total_exec_time)}</td>
                  <td className="numeric-cell">{formatTime(query.mean_exec_time)}</td>
                  <td className="numeric-cell">{formatTime(query.min_exec_time)}</td>
                  <td className="numeric-cell">{formatTime(query.max_exec_time)}</td>
                  <td className="numeric-cell">{formatNumber(query.rows)}</td>
                  <td className="numeric-cell">
                    {calculateCacheHitRatio(query.shared_blks_hit, query.shared_blks_read)}
                  </td>
                  <td className="numeric-cell">
                    {formatBlocks(query.temp_blks_read + query.temp_blks_written)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TabLayout>
  );
};

export default QueryHistoryTab;
