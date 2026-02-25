import React from 'react';
import { FiChevronUp, FiChevronDown, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { DMSField } from './FieldEditModal';
import { DMSTable } from './types';

interface FieldMappingPanelProps {
  selectedTable: DMSTable | null;
  selectedFields: DMSField[];
  loading: boolean;
  onAddField: () => void;
  onEditField: (field: DMSField) => void;
  onDeleteField: (field: DMSField) => void;
  onMoveField: (field: DMSField, direction: 'up' | 'down') => void;
}

const FieldMappingPanel: React.FC<FieldMappingPanelProps> = ({
  selectedTable,
  selectedFields,
  loading,
  onAddField,
  onEditField,
  onDeleteField,
  onMoveField,
}) => {
  const visibleFields = selectedFields.filter((field) => field._changeStatus !== 'deleted');

  return (
    <div className="truetl-panel">
      <div className="truetl-panel-header">
        <h3>Field Mapping (Double-click cell to edit)</h3>
      </div>
      <div className="truetl-panel-content">
        {selectedTable ? (
          <>
            <table className="truetl-table field-mapping-table">
              <thead>
                <tr>
                  <th>Row #</th>
                  <th>Move</th>
                  <th>Source Field</th>
                  <th>Source Type</th>
                  <th>Target Field</th>
                  <th>Target Type</th>
                  <th>Target Value</th>
                  <th>Primary Key</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleFields.length > 0 ? (
                  [...visibleFields]
                    .sort((a, b) => (a.row_order || 0) - (b.row_order || 0))
                    .map((field, idx) => (
                      <tr
                        key={field.id || idx}
                        className={
                          field._changeStatus && field._changeStatus !== 'unchanged'
                            ? `row-status-${field._changeStatus}`
                            : ''
                        }
                      >
                        <td>{field.row_order || idx + 1}</td>
                      <td>
                        <button
                          className="btn btn-icon btn-icon-sm btn-ghost"
                          title="Move up"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveField(field, 'up');
                          }}
                          disabled={idx === 0}
                        >
                          <FiChevronUp size={14} />
                        </button>
                        <button
                          className="btn btn-icon btn-icon-sm btn-ghost"
                          title="Move down"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveField(field, 'down');
                          }}
                          disabled={idx === visibleFields.length - 1}
                        >
                          <FiChevronDown size={14} />
                        </button>
                      </td>
                      <td>{field.source_field}</td>
                      <td>{field.source_type}</td>
                      <td>{field.target_field}</td>
                      <td>{field.target_type}</td>
                      <td>{field.target_value}</td>
                      <td>
                        <input type="checkbox" checked={field.is_primary_key} readOnly />
                      </td>
                      <td>
                        <div className="field-actions">
                          <button
                            className="btn btn-icon btn-icon-xs btn-ghost"
                            title="Edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditField(field);
                            }}
                          >
                            <FiEdit2 size={12} />
                          </button>
                          <button
                            className="btn btn-icon btn-icon-xs btn-outline-danger"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteField(field);
                            }}
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="empty-table-cell">
                      No fields mapped. Click "Add Field" to add a field mapping.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="truetl-panel-footer">
              <button className="btn btn-sm btn-primary" onClick={onAddField}>
                Add Field
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state-text">Select a table to view field mappings</div>
        )}
      </div>
    </div>
  );
};

export default FieldMappingPanel;

