import React, { useState, useEffect } from 'react';
import BaseModal from '../CustomModals/BaseModal';
import { indexedDBService } from './indexedDBService';
import { validateService } from './validationService';
import './TruETLDetailsTab.css';

interface ServiceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: { serviceName: string; targetDbType: string }) => Promise<void>;
  mode: 'add' | 'edit';
  serviceId?: number | null;
}

const ServiceEditModal: React.FC<ServiceEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mode,
  serviceId,
}) => {
  const [serviceName, setServiceName] = useState('');
  const [targetDbType, setTargetDbType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && serviceId) {
        // Load service data
        indexedDBService.getServiceById(serviceId).then((service) => {
          if (service) {
            setServiceName(service.service_name);
            setTargetDbType(service.target_db_type);
          }
        });
      } else {
        setServiceName('');
        setTargetDbType('');
      }
      setError('');
    }
  }, [isOpen, mode, serviceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    const validationError = await validateService(serviceName, targetDbType, serviceId || undefined);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsLoading(true);
      await onSave({ serviceName, targetDbType });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save service');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? 'Add Service' : 'Edit Service'}
      size="md"
      animation="scale"
    >
      <form onSubmit={handleSubmit} className="entity-edit-form">
        <div className="form-group">
          <label>Service Name *</label>
          <input
            type="text"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="Enter service name"
            disabled={isLoading}
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <label>Target DB Type *</label>
          <input
            type="text"
            value={targetDbType}
            onChange={(e) => setTargetDbType(e.target.value)}
            placeholder="e.g., PostgreSQL, MySQL"
            disabled={isLoading}
            required
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
            disabled={isLoading || !serviceName.trim() || !targetDbType.trim()}
          >
            {isLoading ? 'Saving...' : mode === 'add' ? 'Add' : 'Save'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default ServiceEditModal;

