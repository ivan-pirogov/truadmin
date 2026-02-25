import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import BaseModal from '../CustomModals/BaseModal';
import '../CustomModals/CustomModals.css';
import './UserModals.css';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (username: string, password: string, role: 'admin' | 'user') => Promise<void>;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setRole('user');
    setFormError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (username.length < 3) {
      setFormError('Username must be at least 3 characters long');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(username, password, role);
      handleClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New User"
      size="md"
      animation="scale"
    >
      <form onSubmit={handleSubmit} className="user-modal-form">
        {formError && <div className="custom-modal-error user-form-error">{formError}</div>}

        <div className="custom-modal-form-group">
          <label htmlFor="username" className="user-form-label">Username</label>
          <input
            id="username"
            type="text"
            className="custom-modal-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            required
            autoFocus
          />
          <small className="user-form-hint">Minimum 3 characters</small>
        </div>

        <div className="custom-modal-form-group">
          <label htmlFor="password" className="user-form-label">Password</label>
          <div className="password-input-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="custom-modal-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
          <small className="user-form-hint">Minimum 6 characters</small>
        </div>

        <div className="custom-modal-form-group">
          <label htmlFor="confirmPassword" className="user-form-label">Confirm Password</label>
          <div className="password-input-wrapper">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              className="custom-modal-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              title={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
        </div>

        <div className="custom-modal-form-group">
          <label htmlFor="role" className="user-form-label">Role</label>
          <select
            id="role"
            className="custom-modal-input user-select"
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <small className="user-form-hint">Admins can manage users and have full access</small>
        </div>

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
            {isSubmitting ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default CreateUserModal;
