import React, { useState, useEffect } from 'react';
import BaseModal from '../CustomModals/BaseModal';

export type FieldChangeStatus = 'added' | 'modified' | 'deleted' | 'unchanged';

export interface DMSField {
  id?: number;
  table_id: number;
  source_field: string;
  source_type: string;
  target_field: string;
  target_type: string;
  target_value: string;
  is_primary_key: boolean;
  row_order: number;
  _changeStatus?: FieldChangeStatus; // Internal field for tracking changes
  [key: string]: any;
}

interface FieldEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: Partial<DMSField>) => void | Promise<void>;
  field?: DMSField | null;
  mode: 'add' | 'edit';
  defaultRowOrder?: number; // For new fields: max row_order + 1
}

const FieldEditModal: React.FC<FieldEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  field,
  mode,
  defaultRowOrder = 0,
}) => {
  const [formData, setFormData] = useState({
    source_field: '',
    source_type: '',
    target_field: '',
    target_type: '',
    target_value: '',
    is_primary_key: false,
    row_order: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && field) {
        setFormData({
          source_field: field.source_field || '',
          source_type: field.source_type || '',
          target_field: field.target_field || '',
          target_type: field.target_type || '',
          target_value: field.target_value || '',
          is_primary_key: field.is_primary_key || false,
          row_order: field.row_order || 0,
        });
      } else {
        // For new fields, set row_order to defaultRowOrder (max + 1)
        setFormData({
          source_field: '',
          source_type: '',
          target_field: '',
          target_type: '',
          target_value: '',
          is_primary_key: false,
          row_order: defaultRowOrder,
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, field]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.source_field.trim()) {
      newErrors.source_field = 'Source Field is required';
    }
    if (!formData.source_type.trim()) {
      newErrors.source_type = 'Source Type is required';
    }
    if (!formData.target_field.trim()) {
      newErrors.target_field = 'Target Field is required';
    }
    if (!formData.target_type.trim()) {
      newErrors.target_type = 'Target Type is required';
    }
    // Target Value is now required
    if (!formData.target_value.trim()) {
      newErrors.target_value = 'Target Value is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setIsLoading(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving field:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSourceFieldBlur = () => {
    setFormData((prev) => {
      const updated = { ...prev };
      
      // Auto-fill target_field and target_value from source_field when they are empty
      if (prev.source_field.trim()) {
        if (!prev.target_field.trim()) {
          updated.target_field = prev.source_field;
        }
        if (!prev.target_value.trim()) {
          updated.target_value = prev.source_field;
        }
      }
      
      return updated;
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? 'Add Field Mapping' : 'Edit Field Mapping'}
      size="md"
      animation="scale"
    >
      <form onSubmit={handleSubmit} className="field-edit-form">
        <div className="form-group">
          <label htmlFor="source_field">
            Source Field <span className="required">*</span>
          </label>
          <input
            type="text"
            id="source_field"
            name="source_field"
            value={formData.source_field}
            onChange={handleChange}
            onBlur={handleSourceFieldBlur}
            className={errors.source_field ? 'error' : ''}
            disabled={isLoading}
            autoFocus
          />
          {errors.source_field && (
            <span className="error-message">{errors.source_field}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="source_type">
            Source Type <span className="required">*</span>
          </label>
          <input
            type="text"
            id="source_type"
            name="source_type"
            value={formData.source_type}
            onChange={handleChange}
            className={errors.source_type ? 'error' : ''}
            disabled={isLoading}
            placeholder="e.g., varchar(255), int, text"
          />
          {errors.source_type && (
            <span className="error-message">{errors.source_type}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="target_field">
            Target Field <span className="required">*</span>
          </label>
          <input
            type="text"
            id="target_field"
            name="target_field"
            value={formData.target_field}
            onChange={handleChange}
            className={errors.target_field ? 'error' : ''}
            disabled={isLoading}
          />
          {errors.target_field && (
            <span className="error-message">{errors.target_field}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="target_type">
            Target Type <span className="required">*</span>
          </label>
          <input
            type="text"
            id="target_type"
            name="target_type"
            value={formData.target_type}
            onChange={handleChange}
            className={errors.target_type ? 'error' : ''}
            disabled={isLoading}
            placeholder="e.g., varchar(255), int, text"
          />
          {errors.target_type && (
            <span className="error-message">{errors.target_type}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="target_value">
            Target Value <span className="required">*</span>
          </label>
          <input
            type="text"
            id="target_value"
            name="target_value"
            value={formData.target_value}
            onChange={handleChange}
            className={errors.target_value ? 'error' : ''}
            disabled={isLoading}
            placeholder="Default value (auto-filled from Source Field)"
          />
          {errors.target_value && (
            <span className="error-message">{errors.target_value}</span>
          )}
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="is_primary_key"
              checked={formData.is_primary_key}
              onChange={handleChange}
              disabled={isLoading}
            />
            <span>Primary Key</span>
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="row_order">Row Order</label>
          <input
            type="number"
            id="row_order"
            name="row_order"
            value={formData.row_order}
            onChange={handleChange}
            disabled={isLoading}
            min="0"
          />
        </div>

        <div className="modal-actions">
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
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : mode === 'add' ? 'Add Field' : 'Save Changes'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default FieldEditModal;

