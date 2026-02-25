import React, { useState, useEffect, useCallback } from 'react';
import { FiEdit, FiTrash2, FiArrowUp, FiArrowDown, FiPlus } from 'react-icons/fi';
import { HohAddressDatabase, apiService } from '../../services/api';
import SearchBar from './SearchBar';
import WhereConstructor from '../WhereConstructor/WhereConstructor';
import RowEditModal from './RowEditModal';
import '../HohAddressDetailsTab/HohAddressDetailsTab.css';

interface WhitelistTableProps {
  hohAddressDatabase: HohAddressDatabase;
}

const WhitelistTable: React.FC<WhitelistTableProps> = ({ hohAddressDatabase }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState<string>('');
  const [where, setWhere] = useState<string>('');
  const [showConstructor, setShowConstructor] = useState(false);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [editingRow, setEditingRow] = useState<Record<string, any> | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

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

  // Get primary key column (assume first column)
  const getPrimaryKey = (columnsList: string[]): string => {
    if (columnsList.length === 0) return '';
    return columnsList[0];
  };

  // Load data
  const loadData = useCallback(
    async (customWhere?: string, customSearch?: string) => {
      try {
        setLoading(true);
        setError(null);

        // Always get columns order from API to ensure correct order
        const columnsList = await apiService.getHohAddressTableColumns(
          hohAddressDatabase.id,
          'hohaddresswhitelist'
        );
        setColumns(columnsList);

        // Use customSearch if provided, otherwise use search from state
        const searchValue = customSearch !== undefined ? customSearch : search;
        const filters = buildFilters(searchValue, columnsList);

        // Use customWhere if provided, otherwise use where from state
        const whereClause = (customWhere !== undefined ? customWhere : where).trim() || undefined;
        console.log('Loading whitelist with WHERE:', whereClause, 'and search:', searchValue);

        const result = await apiService.getHohAddressWhitelist(
          hohAddressDatabase.id,
          filters,
          sortBy || undefined,
          sortOrder,
          pageSize,
          (page - 1) * pageSize,
          whereClause
        );
        setData(result.data || []);
        setTotal(result.totalCount || 0);
      } catch (err: any) {
        console.error('Error loading whitelist:', err);
        setError(err.message || 'Failed to load whitelist');
      } finally {
        setLoading(false);
      }
    },
    [hohAddressDatabase.id, search, where, sortBy, sortOrder, page, buildFilters]
  );

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy, sortOrder]);

  // Handle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  // Handle create
  const handleCreate = async (formData: Record<string, any>) => {
    try {
      await apiService.createHohAddressWhitelistRow(hohAddressDatabase.id, formData);
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create row');
    }
  };

  // Handle update
  const handleUpdate = async (rowId: string, formData: Record<string, any>) => {
    try {
      await apiService.updateHohAddressWhitelistRow(hohAddressDatabase.id, rowId, formData);
      setEditingRow(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update row');
    }
  };

  // Handle delete
  const handleDelete = async (rowId: string) => {
    if (!window.confirm('Are you sure you want to delete this row?')) return;
    try {
      await apiService.deleteHohAddressWhitelistRow(hohAddressDatabase.id, rowId);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete row');
    }
  };

  return (
    <>
      <div className="hohaddress-table-container">
        <div className="table-header">
          <h3>Whitelist</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <FiPlus size={16} /> Add Row
          </button>
        </div>
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
                      <th key={col} className="sortable" onClick={() => handleSort(col)}>
                        {col}
                        {sortBy === col && (sortOrder === 'ASC' ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />)}
                      </th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => {
                    const pk = getPrimaryKey(columns);
                    const rowId = String(row[pk] ?? idx);
                    return (
                      <tr key={idx}>
                        {columns.map((col) => (
                          <td key={col}>{String(row[col] ?? '')}</td>
                        ))}
                        <td className="actions-cell">
                          <button
                            className="btn btn-icon btn-icon-sm btn-secondary"
                            onClick={() => setEditingRow(row)}
                            title="Edit"
                          >
                            <FiEdit size={16} />
                          </button>
                          <button
                            className="btn btn-icon btn-icon-sm btn-secondary"
                            onClick={() => handleDelete(rowId)}
                            title="Delete"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
              <button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((prev) => prev + 1)}>
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {showAddModal && (
        <RowEditModal
          columns={columns}
          onSave={handleCreate}
          onCancel={() => setShowAddModal(false)}
          title="Add Whitelist Row"
        />
      )}

      {editingRow && (
        <RowEditModal
          columns={columns}
          initialData={editingRow}
          onSave={(formData) => {
            const pk = getPrimaryKey(columns);
            handleUpdate(String(editingRow[pk]), formData);
          }}
          onCancel={() => setEditingRow(null)}
          title="Edit Whitelist Row"
        />
      )}
    </>
  );
};

export default WhitelistTable;

