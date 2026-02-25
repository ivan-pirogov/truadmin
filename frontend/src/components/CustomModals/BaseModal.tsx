import React, { useEffect, useRef } from 'react';
import { IoClose } from 'react-icons/io5';
import { BaseModalProps } from './types';
import './CustomModals.css';

const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  animation = 'scale',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeOnEscape]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`custom-modal-overlay custom-modal-overlay--${animation}`}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className={`custom-modal-content custom-modal-content--${size} custom-modal-content--${animation} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="custom-modal-header">
            {title && <h2 className="custom-modal-title">{title}</h2>}
            {showCloseButton && (
              <button
                className="custom-modal-close"
                onClick={onClose}
                aria-label="Close modal"
              >
                <IoClose size={24} />
              </button>
            )}
          </div>
        )}

        <div className="custom-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BaseModal;
