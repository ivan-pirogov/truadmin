import React, { useState, useEffect } from 'react';
import BaseModal from '../CustomModals/BaseModal';
import { indexedDBService } from './indexedDBService';
import { validateTable } from './validationService';
import { parseDDL } from './ddlParser';
import { mapTypeToTarget } from './typeMapping';
import { IndexedDBField } from './types';
import './TruETLDetailsTab.css';

interface TableEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (table: {
    sourceTableName: string;
    targetTableName: string;
    fieldsFromDDL?: IndexedDBField[];
  }) => Promise<void>;
  mode: 'add' | 'edit';
  databaseId: number;
  tableId?: number | null;
}

const TableEditModal: React.FC<TableEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mode,
  databaseId,
  tableId,
}) => {
  const [sourceTableName, setSourceTableName] = useState('');
  const [targetTableName, setTargetTableName] = useState('');
  const [ddlText, setDdlText] = useState('');
  const [targetDbType, setTargetDbType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [ddlError, setDdlError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && tableId) {
        // Load table data
        indexedDBService.getTableById(tableId).then(async (table) => {
          if (table) {
            setSourceTableName(table.source_table_name);
            setTargetTableName(table.target_table_name || '');
            
            // Load database to get service_id, then service to get target_db_type
            const database = await indexedDBService.getDatabaseById(table.database_id);
            if (database) {
              const service = await indexedDBService.getServiceById(database.service_id);
              if (service) {
                setTargetDbType(service.target_db_type);
              }
            }
          }
        });
      } else {
        setSourceTableName('');
        setTargetTableName('');
        setDdlText('');
        
        // Load database to get service_id, then service to get target_db_type
        indexedDBService.getDatabaseById(databaseId).then(async (database) => {
          if (database) {
            const service = await indexedDBService.getServiceById(database.service_id);
            if (service) {
              setTargetDbType(service.target_db_type);
            }
          }
        });
      }
      setError('');
      setDdlError('');
    }
  }, [isOpen, mode, tableId, databaseId]);

  const handleParseDDL = () => {
    if (!ddlText.trim()) {
      setDdlError('DDL text is empty');
      return;
    }

    try {
      setDdlError('');
      const parsed = parseDDL(ddlText);
      
      // Set table name from DDL if not already set
      if (!sourceTableName && parsed.tableName) {
        setSourceTableName(parsed.tableName);
      }
      if (!targetTableName && parsed.tableName) {
        setTargetTableName(parsed.tableName);
      }
      
      setDdlError('');
    } catch (err: any) {
      setDdlError(err.message || 'Failed to parse DDL');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDdlError('');

    // Validate
    const validationError = await validateTable(
      databaseId,
      sourceTableName,
      tableId || undefined
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    // Parse DDL if provided
    let fieldsFromDDL: IndexedDBField[] | undefined = undefined;
    if (ddlText.trim()) {
      try {
        const parsed = parseDDL(ddlText);
        
        // Create fields from parsed DDL
        const maxRowOrder = 0; // Will be set when adding to table
        fieldsFromDDL = parsed.columns.map((col, index) => {
          const targetType = targetDbType 
            ? mapTypeToTarget(col.type, targetDbType)
            : col.type;
          
          return {
            id: Date.now() + index, // Temporary ID
            table_id: tableId || 0, // Will be set after table is created
            source_field_name: col.name,
            source_field_type: col.type,
            target_field_name: col.name,
            target_field_type: targetType,
            target_field_value: col.name,
            is_id: col.isPrimaryKey ? 1 : 0,
            row_num: index + 1,
            status: 'added' as const,
          };
        });
      } catch (err: any) {
        setDdlError(err.message || 'Failed to parse DDL');
        return;
      }
    }

    try {
      setIsLoading(true);
      await onSave({
        sourceTableName,
        targetTableName,
        fieldsFromDDL,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save table');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? 'Add Table' : 'Edit Table'}
      size="lg"
      animation="scale"
    >
      <form onSubmit={handleSubmit} className="entity-edit-form">
        <div className="form-group">
          <label>Source Table Name *</label>
          <input
            type="text"
            value={sourceTableName}
            onChange={(e) => setSourceTableName(e.target.value)}
            placeholder="Enter source table name"
            disabled={isLoading}
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <label>Target Table Name</label>
          <input
            type="text"
            value={targetTableName}
            onChange={(e) => setTargetTableName(e.target.value)}
            placeholder="Enter target table name"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label>
            DDL (CREATE TABLE) 
            <span className="form-hint" style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
              - Paste MySQL CREATE TABLE statement to auto-generate fields
            </span>
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleParseDDL}
              disabled={isLoading || !ddlText.trim()}
              style={{ flexShrink: 0 }}
            >
              Parse DDL
            </button>
            {ddlText.trim() && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setDdlText('')}
                disabled={isLoading}
                style={{ flexShrink: 0 }}
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={ddlText}
            onChange={(e) => setDdlText(e.target.value)}
            placeholder="-- Paste CREATE TABLE DDL here
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"
            disabled={isLoading}
            rows={12}
            style={{ 
              fontFamily: 'monospace', 
              fontSize: '12px',
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              resize: 'vertical'
            }}
          />
          {ddlError && <div className="form-error" style={{ marginTop: '8px' }}>{ddlError}</div>}
          {ddlText.trim() && !ddlError && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#059669' }}>
              ✓ DDL ready to parse. Click "Parse DDL" to validate or save table to auto-generate fields.
            </div>
          )}
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !sourceTableName.trim()}
          >
            {isLoading ? 'Saving...' : mode === 'add' ? 'Add' : 'Save'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default TableEditModal;

