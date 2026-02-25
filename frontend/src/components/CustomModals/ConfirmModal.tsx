import React, { useState } from 'react';
import { IoWarningOutline } from 'react-icons/io5';
import BaseModal from './BaseModal';
import { ConfirmModalProps } from './types';
import './CustomModals.css';

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  confirmButtonVariant = 'primary',
  size = 'md',
  animation = 'scale',
  isLoading: externalIsLoading = false,
}) => {
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const isLoading = externalIsLoading || internalIsLoading;

  const handleConfirm = async () => {
    try {
      setInternalIsLoading(true);
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setInternalIsLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      animation={animation}
      className="custom-modal--confirm"
    >
      <div className="custom-modal-confirm-content">
        <div className="custom-modal-icon custom-modal-icon--warning">
          <IoWarningOutline size={48} />
        </div>

        <p className="custom-modal-message">{message}</p>

        <div className="custom-modal-actions">
          <button
            className="custom-modal-btn custom-modal-btn--secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`custom-modal-btn custom-modal-btn--${confirmButtonVariant}`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Загрузка...' : confirmText}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default ConfirmModal;
