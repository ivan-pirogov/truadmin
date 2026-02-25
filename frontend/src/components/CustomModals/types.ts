export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
export type AlertType = 'success' | 'error' | 'warning' | 'info';
export type AnimationType = 'fade' | 'slide' | 'scale' | 'none';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  animation?: AnimationType;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: 'primary' | 'danger' | 'success';
  size?: ModalSize;
  animation?: AnimationType;
  isLoading?: boolean;
}

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: AlertType;
  title: string;
  message: string;
  buttonText?: string;
  size?: ModalSize;
  animation?: AnimationType;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<void>;
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  size?: ModalSize;
  animation?: AnimationType;
  isLoading?: boolean;
  validateInput?: (value: string) => boolean | string;
}
