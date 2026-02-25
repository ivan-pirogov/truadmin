import React, { useEffect } from 'react';
import {
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoWarningOutline,
  IoInformationCircleOutline,
} from 'react-icons/io5';
import BaseModal from './BaseModal';
import { AlertModalProps, AlertType } from './types';
import './CustomModals.css';

const getAlertIcon = (type: AlertType) => {
  const iconProps = { size: 64 };

  switch (type) {
    case 'success':
      return <IoCheckmarkCircleOutline {...iconProps} />;
    case 'error':
      return <IoCloseCircleOutline {...iconProps} />;
    case 'warning':
      return <IoWarningOutline {...iconProps} />;
    case 'info':
      return <IoInformationCircleOutline {...iconProps} />;
    default:
      return <IoInformationCircleOutline {...iconProps} />;
  }
};

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  buttonText = 'OK',
  size = 'md',
  animation = 'scale',
  autoClose = false,
  autoCloseDelay = 3000,
}) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      animation={animation}
      className={`custom-modal--alert custom-modal--alert-${type}`}
    >
      <div className="custom-modal-alert-content">
        <div className={`custom-modal-icon custom-modal-icon--${type}`}>
          {getAlertIcon(type)}
        </div>

        <p className="custom-modal-message">{message}</p>

        <div className="custom-modal-actions">
          <button
            className={`custom-modal-btn custom-modal-btn--${type}`}
            onClick={onClose}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default AlertModal;
