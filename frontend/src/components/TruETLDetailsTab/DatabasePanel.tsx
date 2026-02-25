import React from 'react';
import { SourceDatabase } from './types';

interface DatabasePanelProps {
  databases: SourceDatabase[];
  selectedDatabase: string | null;
  selectedService: string | null;
  onDatabaseSelect: (dbName: string) => void;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const DatabasePanel: React.FC<DatabasePanelProps> = ({
  databases,
  selectedDatabase,
  selectedService,
  onDatabaseSelect,
  onAdd,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="truetl-panel">
      <div className="truetl-panel-header">
        <h3>2. Select Source Database</h3>
      </div>
      <div className="truetl-panel-content">
        {selectedService ? (
          <>
            <table className="truetl-table">
              <thead>
                <tr>
                  <th>Source Database</th>
                  <th>Source Schema</th>
                  <th>Type</th>
                  <th>Target Database</th>
                  <th>Target Schema</th>
                </tr>
              </thead>
              <tbody>
                {databases.length > 0 ? (
                  [...databases]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((db, idx) => {
                      const statusClass = db.status && db.status !== 'unchanged' 
                        ? `row-status-${db.status}` 
                        : '';
                      const className = [
                        selectedDatabase === db.name ? 'selected' : '',
                        statusClass
                      ].filter(Boolean).join(' ');
                      
                      return (
                        <tr
                          key={idx}
                          className={className}
                          onClick={() => onDatabaseSelect(db.name)}
                        >
                          <td>{db.name}</td>
                          <td>{db.source_schema}</td>
                          <td>{db.type}</td>
                          <td>{db.target_database}</td>
                          <td>{db.target_schema}</td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-table-cell">
                      No source databases found for selected service
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="truetl-panel-actions">
              <button className="btn btn-sm btn-secondary" onClick={onAdd}>
                New...
              </button>
              <button className="btn btn-sm btn-secondary" onClick={onEdit} disabled={!selectedDatabase}>
                Edit...
              </button>
              <button className="btn btn-sm btn-outline-danger" onClick={onDelete} disabled={!selectedDatabase}>
                Delete
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state-text">Select a service to view source databases</div>
        )}
      </div>
    </div>
  );
};

export default DatabasePanel;

