import React, { useState, useEffect } from 'react';
import { IoCreateOutline } from 'react-icons/io5';
import BaseModal from './BaseModal';
import { PromptModalProps } from './types';
import './CustomModals.css';

const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  message,
  placeholder = 'Введите значение...',
  defaultValue = '',
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  size = 'md',
  animation = 'scale',
  isLoading: externalIsLoading = false,
  validateInput,
}) => {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string>('');
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const isLoading = externalIsLoading || internalIsLoading;

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setError('');
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateInput) {
      const validationResult = validateInput(value);
      if (validationResult !== true) {
        setError(typeof validationResult === 'string' ? validationResult : 'Некорректное значение');
        return;
      }
    }

    try {
      setInternalIsLoading(true);
      setError('');
      await onSubmit(value);
      onClose();
    } catch (error) {
      console.error('Submit action failed:', error);
      setError('Произошла ошибка при отправке');
    } finally {
      setInternalIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (error) {
      setError('');
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      animation={animation}
      className="custom-modal--prompt"
    >
      <form onSubmit={handleSubmit} className="custom-modal-prompt-content">
        <div className="custom-modal-icon custom-modal-icon--prompt">
          <IoCreateOutline size={48} />
        </div>

        <p className="custom-modal-message">{message}</p>

        <div className="custom-modal-form-group">
          <input
            type="text"
            className={`custom-modal-input ${error ? 'custom-modal-input--error' : ''}`}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={isLoading}
            autoFocus
          />
          {error && <span className="custom-modal-error">{error}</span>}
        </div>

        <div className="custom-modal-actions">
          <button
            type="button"
            className="custom-modal-btn custom-modal-btn--secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="submit"
            className="custom-modal-btn custom-modal-btn--primary"
            disabled={isLoading || !value.trim()}
          >
            {isLoading ? 'Загрузка...' : confirmText}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default PromptModal;
