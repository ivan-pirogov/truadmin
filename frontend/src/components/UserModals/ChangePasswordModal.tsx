import React, { useState, useEffect } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import BaseModal from '../CustomModals/BaseModal';
import AlertModal from '../CustomModals/AlertModal';
import '../CustomModals/CustomModals.css';
import './UserModals.css';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  onSubmit: (newPassword: string) => Promise<void>;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  username,
  onSubmit,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordError('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(newPassword);
      handleClose();
      setShowSuccess(true);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={handleClose}
        title={`Change Password for ${username}`}
        size="md"
        animation="scale"
      >
        <form onSubmit={handleSubmit} className="user-modal-form">
          {passwordError && <div className="custom-modal-error user-form-error">{passwordError}</div>}

          <div className="custom-modal-form-group">
            <label htmlFor="newPassword" className="user-form-label">New Password</label>
            <div className="password-input-wrapper">
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                className="custom-modal-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                autoFocus
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
            <label htmlFor="confirmNewPassword" className="user-form-label">Confirm New Password</label>
            <div className="password-input-wrapper">
              <input
                id="confirmNewPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="custom-modal-input"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter new password"
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
              {isSubmitting ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </BaseModal>

      <AlertModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        type="success"
        title="Password Changed!"
        message={`Password for ${username} has been changed successfully.`}
        autoClose={true}
        autoCloseDelay={2500}
      />
    </>
  );
};

export default ChangePasswordModal;
