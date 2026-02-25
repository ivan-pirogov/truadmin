import React, { useState, useEffect } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import BaseModal from '../CustomModals/BaseModal';
import AlertModal from '../CustomModals/AlertModal';
import '../CustomModals/CustomModals.css';
import './UserModals.css';

interface ChangeOwnPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (oldPassword: string, newPassword: string) => Promise<void>;
}

const ChangeOwnPasswordModal: React.FC<ChangeOwnPasswordModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordError('');
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (oldPassword.length === 0) {
      setPasswordError('Please enter your current password');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (oldPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(oldPassword, newPassword);
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
        title="Change My Password"
        size="md"
        animation="scale"
      >
        <form onSubmit={handleSubmit} className="user-modal-form">
          {passwordError && <div className="custom-modal-error user-form-error">{passwordError}</div>}

          <div className="custom-modal-form-group">
            <label htmlFor="oldPassword" className="user-form-label">Current Password</label>
            <div className="password-input-wrapper">
              <input
                id="oldPassword"
                type={showOldPassword ? 'text' : 'password'}
                className="custom-modal-input"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                required
                autoFocus
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowOldPassword(!showOldPassword)}
                title={showOldPassword ? 'Hide password' : 'Show password'}
              >
                {showOldPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          <div className="custom-modal-form-group">
            <label htmlFor="newPassword" className="user-form-label">New Password</label>
            <div className="password-input-wrapper">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                className="custom-modal-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
                title={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
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
        message="Your password has been changed successfully."
        autoClose={true}
        autoCloseDelay={2500}
      />
    </>
  );
};

export default ChangeOwnPasswordModal;
