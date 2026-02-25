import React, { useState, useEffect, useCallback } from 'react';
import { FiCheckCircle, FiPlay } from 'react-icons/fi';
import { HohAddressDatabase, apiService } from '../../services/api';
import SearchBar from './SearchBar';
import WhereConstructor from '../WhereConstructor/WhereConstructor';
import AddressCheckModal from './AddressCheckModal';
import AddressCheckTestModal from './AddressCheckTestModal';
import '../HohAddressDetailsTab/HohAddressDetailsTab.css';

interface StatusListTableProps {
  hohAddressDatabase: HohAddressDatabase;
}

const StatusListTable: React.FC<StatusListTableProps> = ({ hohAddressDatabase }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState<string>('');
  const [where, setWhere] = useState<string>('');
  const [showConstructor, setShowConstructor] = useState(false);
  const [page, setPage] = useState(1);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const pageSize = 50;

  // Build filters object from search
  const buildFilters = useCallback((searchValue: string, columnsList: string[]): Record<string, string> => {
    const filters: Record<string, string> = {};

    // If search is provided, apply it to all columns
    if (searchValue.trim()) {
      columnsList.forEach((col) => {
        filters[col] = searchValue;
      });
    }

    return filters;
  }, []);

  // Load data
  const loadData = useCallback(
    async (customWhere?: string, customSearch?: string) => {
      try {
        setLoading(true);
        setError(null);

        // Always get columns order from API to ensure correct order
        const columnsList = await apiService.getHohAddressTableColumns(
          hohAddressDatabase.id,
          'hohaddressstatuslist'
        );
        setColumns(columnsList);

        // Use customSearch if provided, otherwise use search from state
        const searchValue = customSearch !== undefined ? customSearch : search;
        const filters = buildFilters(searchValue, columnsList);

        // Use customWhere if provided, otherwise use where from state
        const whereClause = (customWhere !== undefined ? customWhere : where).trim() || undefined;
        console.log('Loading status list with WHERE:', whereClause, 'and search:', searchValue);

        const result = await apiService.getHohAddressStatusList(
          hohAddressDatabase.id,
          filters,
          pageSize,
          (page - 1) * pageSize,
          whereClause
        );
        setData(result.data);
        setTotal(result.totalCount);
      } catch (err: any) {
        console.error('Error loading status list:', err);
        setError(err.message || 'Failed to load status list');
      } finally {
        setLoading(false);
      }
    },
    [hohAddressDatabase.id, search, page, where, buildFilters]
  );

  // Load data on mount and when page changes
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="hohaddress-table-container">
      <div className="table-header">
        <h3>Status List (Read-only)</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowTestModal(true)}
            title="Test Address Check Process"
          >
            <FiPlay style={{ marginRight: '6px' }} />
            Test Process
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowCheckModal(true)}
            title="Check Address Status"
          >
            <FiCheckCircle style={{ marginRight: '6px' }} />
            Check Address
          </button>
        </div>
      </div>
      <AddressCheckModal
        isOpen={showCheckModal}
        onClose={() => setShowCheckModal(false)}
        databaseId={hohAddressDatabase.id}
      />
      <AddressCheckTestModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        databaseId={hohAddressDatabase.id}
      />
      <SearchBar
        search={search}
        onSearchSubmit={(value) => {
          setSearch(value);
          setPage(1);
          // Pass the value directly to avoid state update delay
          loadData(undefined, value);
        }}
      />
      <WhereConstructor
        columns={columns}
        value={where}
        onChange={(value) => {
          setWhere(value);
        }}
        onApply={(whereValue) => {
          setWhere(whereValue);
          setPage(1);
          // Pass the value directly to avoid state update delay
          loadData(whereValue);
        }}
        showConstructor={showConstructor}
        onToggleConstructor={setShowConstructor}
      />
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      {loading ? (
        <div className="loading">Loading...</div>
      ) : !data || data.length === 0 ? (
        <div className="empty-state">No data found</div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="hohaddress-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx}>
                    {columns.map((col) => (
                      <td key={col}>{String(row[col] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-pagination">
            <button disabled={page === 1} onClick={() => setPage((prev) => prev - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {Math.ceil(total / pageSize)} ({total} total)
            </span>
            <button
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default StatusListTable;

