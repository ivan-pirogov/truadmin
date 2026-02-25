import React from 'react';
import { TableMapping, DMSTable } from './types';

interface TablePanelProps {
  tables: TableMapping[];
  selectedTable: DMSTable | null;
  selectedService: string | null;
  selectedSourceDb: string | null;
  onTableSelect: (tableName: string) => void;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const TablePanel: React.FC<TablePanelProps> = ({
  tables,
  selectedTable,
  selectedService,
  selectedSourceDb,
  onTableSelect,
  onAdd,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="truetl-panel">
      <div className="truetl-panel-header">
        <h3>
          3. Select Table{' '}
          {selectedService && selectedSourceDb ? `(total - ${tables.length} tables)` : ''}
        </h3>
      </div>
      <div className="truetl-panel-content">
        {selectedService && selectedSourceDb ? (
          <>
            <table className="truetl-table">
              <thead>
                <tr>
                  <th>Source Table</th>
                  <th>Target Table</th>
                  <th>Fields</th>
                </tr>
              </thead>
              <tbody>
                {tables.length > 0 ? (
                  [...tables]
                    .sort((a, b) => a.source_table.localeCompare(b.source_table))
                    .map((mapping, idx) => {
                      const statusClass = mapping.status && mapping.status !== 'unchanged' 
                        ? `row-status-${mapping.status}` 
                        : '';
                      const className = [
                        selectedTable?.source_table === mapping.source_table ? 'selected' : '',
                        statusClass
                      ].filter(Boolean).join(' ');
                      
                      return (
                        <tr
                          key={idx}
                          className={className}
                          onClick={() => onTableSelect(mapping.source_table)}
                        >
                          <td>{mapping.source_table}</td>
                          <td>{mapping.target_table}</td>
                          <td>{mapping.fields_count}</td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={3} className="empty-table-cell">
                      No tables found for selected source database
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="truetl-panel-actions">
              <button className="btn btn-sm btn-secondary" onClick={onAdd}>
                New...
              </button>
              <button className="btn btn-sm btn-secondary" onClick={onEdit} disabled={!selectedTable}>
                Edit...
              </button>
              <button className="btn btn-sm btn-outline-danger" onClick={onDelete} disabled={!selectedTable}>
                Delete
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state-text">
            {!selectedService
              ? 'Select a service to view tables'
              : 'Select a source database to view tables'}
          </div>
        )}
      </div>
    </div>
  );
};

export default TablePanel;

