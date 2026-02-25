import React from 'react';
import { DMSTable } from './types';

interface MappingConfigPanelProps {
  selectedTable: DMSTable | null;
}

const MappingConfigPanel: React.FC<MappingConfigPanelProps> = ({ selectedTable }) => {
  return (
    <div className="truetl-panel">
      <div className="truetl-panel-header">
        <h3>Mapping Configuration</h3>
      </div>
      <div className="truetl-panel-content">
        {selectedTable ? (
          <div className="mapping-config">
            <div className="config-section">
              <label>Service:</label>
              <span>{selectedTable.service_name}</span>
            </div>
            <div className="config-sources-row">
              <div className="config-section">
                <label>Source:</label>
                <div className="config-details">
                  <div>
                    <strong>Database Type:</strong> {selectedTable.source_db_type}
                  </div>
                  <div>
                    <strong>Database:</strong> {selectedTable.source_db_name}
                  </div>
                  <div>
                    <strong>Schema:</strong> {selectedTable.source_schema}
                  </div>
                  <div>
                    <strong>Table:</strong> {selectedTable.source_table}
                  </div>
                </div>
              </div>
              <div className="config-section">
                <label>Target:</label>
                <div className="config-details">
                  <div>
                    <strong>Database Type:</strong> {selectedTable.target_db_type}
                  </div>
                  <div>
                    <strong>Database:</strong> {selectedTable.target_db_name}
                  </div>
                  <div>
                    <strong>Schema:</strong> {selectedTable.target_schema}
                  </div>
                  <div>
                    <strong>Table:</strong> {selectedTable.target_table}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state-text">Select a table to view mapping configuration</div>
        )}
      </div>
    </div>
  );
};

export default MappingConfigPanel;

