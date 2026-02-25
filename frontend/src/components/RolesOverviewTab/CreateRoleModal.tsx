import React, { useState } from 'react';
import BaseModal from '../CustomModals/BaseModal';
import '../CustomModals/CustomModals.css';
import './RolesOverviewTab.css';

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (roleName: string, canLogin: boolean, password?: string) => Promise<void>;
}

const CreateRoleModal: React.FC<CreateRoleModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [roleName, setRoleName] = useState('');
  const [canLogin, setCanLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setRoleName('');
    setCanLogin(false);
    setPassword('');
    setConfirmPassword('');
    setFormError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (roleName.length < 1) {
      setFormError('Role name is required');
      return;
    }

    if (canLogin) {
      if (password.length < 6) {
        setFormError('Password must be at least 6 characters long');
        return;
      }

      if (password !== confirmPassword) {
        setFormError('Passwords do not match');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await onSubmit(roleName, canLogin, canLogin ? password : undefined);
      handleClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Role"
      size="md"
      animation="scale"
    >
      <form onSubmit={handleSubmit} className="create-role-form">
        {formError && <div className="custom-modal-error role-form-error">{formError}</div>}

        <div className="custom-modal-form-group">
          <label htmlFor="roleName" className="role-form-label">Role Name *</label>
          <input
            id="roleName"
            type="text"
            className="custom-modal-input"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="Enter role name"
            required
            autoFocus
          />
          <small className="role-form-hint">The name of the database role</small>
        </div>

        <div className="custom-modal-form-group">
          <label className="role-checkbox-label">
            <input
              type="checkbox"
              checked={canLogin}
              onChange={(e) => setCanLogin(e.target.checked)}
              className="role-checkbox"
            />
            <span>Can Login (User Role)</span>
          </label>
          <small className="role-form-hint">
            If checked, this role can connect to the database (user). Otherwise, it's a group role.
          </small>
        </div>

        {canLogin && (
          <>
            <div className="custom-modal-form-group">
              <label htmlFor="password" className="role-form-label">Password *</label>
              <input
                id="password"
                type="password"
                className="custom-modal-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required={canLogin}
              />
              <small className="role-form-hint">Minimum 6 characters</small>
            </div>

            <div className="custom-modal-form-group">
              <label htmlFor="confirmPassword" className="role-form-label">Confirm Password *</label>
              <input
                id="confirmPassword"
                type="password"
                className="custom-modal-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required={canLogin}
              />
            </div>
          </>
        )}

        <div className="custom-modal-actions">
          <button
            type="button"
            className="custom-modal-btn custom-modal-btn--secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="custom-modal-btn custom-modal-btn--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Role'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default CreateRoleModal;
