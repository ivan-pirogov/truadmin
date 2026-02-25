import React, { useState, useEffect } from 'react';
import BaseModal from '../CustomModals/BaseModal';
import { indexedDBService } from './indexedDBService';
import { validateDatabase } from './validationService';
import './TruETLDetailsTab.css';

interface DatabaseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (database: {
    sourceDbName: string;
    sourceSchemaName: string;
    targetDbName: string;
    targetSchemaName: string;
    sourceDbType: string;
  }) => Promise<void>;
  mode: 'add' | 'edit';
  serviceId: number;
  databaseId?: number | null;
}

const DatabaseEditModal: React.FC<DatabaseEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mode,
  serviceId,
  databaseId,
}) => {
  const [sourceDbName, setSourceDbName] = useState('');
  const [sourceSchemaName, setSourceSchemaName] = useState('');
  const [targetDbName, setTargetDbName] = useState('');
  const [targetSchemaName, setTargetSchemaName] = useState('');
  const [sourceDbType, setSourceDbType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && databaseId) {
        // Load database data
        indexedDBService.getDatabaseById(databaseId).then((database) => {
          if (database) {
            setSourceDbName(database.source_db_name);
            setSourceSchemaName(database.source_schema_name || '');
            setTargetDbName(database.target_db_name || '');
            setTargetSchemaName(database.target_schema_name || '');
            setSourceDbType(database.source_db_type || '');
          }
        });
      } else {
        setSourceDbName('');
        setSourceSchemaName('');
        setTargetDbName('');
        setTargetSchemaName('');
        setSourceDbType('');
      }
      setError('');
    }
  }, [isOpen, mode, databaseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    const validationError = await validateDatabase(
      serviceId,
      sourceDbName,
      databaseId || undefined
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsLoading(true);
      await onSave({
        sourceDbName,
        sourceSchemaName,
        targetDbName,
        targetSchemaName,
        sourceDbType,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save database');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? 'Add Database' : 'Edit Database'}
      size="md"
      animation="scale"
    >
      <form onSubmit={handleSubmit} className="entity-edit-form">
        <div className="form-group">
          <label>Source Database Name *</label>
          <input
            type="text"
            value={sourceDbName}
            onChange={(e) => setSourceDbName(e.target.value)}
            placeholder="Enter source database name"
            disabled={isLoading}
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <label>Source Schema Name</label>
          <input
            type="text"
            value={sourceSchemaName}
            onChange={(e) => setSourceSchemaName(e.target.value)}
            placeholder="Enter source schema name"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label>Target Database Name</label>
          <input
            type="text"
            value={targetDbName}
            onChange={(e) => setTargetDbName(e.target.value)}
            placeholder="Enter target database name"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label>Target Schema Name</label>
          <input
            type="text"
            value={targetSchemaName}
            onChange={(e) => setTargetSchemaName(e.target.value)}
            placeholder="Enter target schema name"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label>Source DB Type</label>
          <input
            type="text"
            value={sourceDbType}
            onChange={(e) => setSourceDbType(e.target.value)}
            placeholder="e.g., MySQL, PostgreSQL"
            disabled={isLoading}
          />
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
            disabled={isLoading || !sourceDbName.trim()}
          >
            {isLoading ? 'Saving...' : mode === 'add' ? 'Add' : 'Save'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default DatabaseEditModal;

