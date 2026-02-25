import React from 'react';
import { ConfirmModal, AlertModal } from '../CustomModals';
import FieldEditModal, { DMSField } from './FieldEditModal';

interface ModalsContainerProps {
  // Field Edit Modal
  showFieldEditModal: boolean;
  fieldEditMode: 'add' | 'edit';
  fieldToEdit: DMSField | null;
  selectedFields: DMSField[];
  onCloseFieldEditModal: () => void;
  onSaveField: (fieldData: Partial<DMSField>) => void | Promise<void>;

  // Delete Confirm Modal
  showDeleteConfirm: boolean;
  fieldToDelete: DMSField | null;
  onCloseDeleteConfirm: () => void;
  onConfirmDelete: () => void;

  // Alert Modals
  showSuccessAlert: boolean;
  showErrorAlert: boolean;
  alertMessage: string;
  onCloseSuccessAlert: () => void;
  onCloseErrorAlert: () => void;
}

const ModalsContainer: React.FC<ModalsContainerProps> = ({
  showFieldEditModal,
  fieldEditMode,
  fieldToEdit,
  selectedFields,
  onCloseFieldEditModal,
  onSaveField,
  showDeleteConfirm,
  fieldToDelete,
  onCloseDeleteConfirm,
  onConfirmDelete,
  showSuccessAlert,
  showErrorAlert,
  alertMessage,
  onCloseSuccessAlert,
  onCloseErrorAlert,
}) => {
  return (
    <>
      <FieldEditModal
        isOpen={showFieldEditModal}
        onClose={onCloseFieldEditModal}
        onSave={onSaveField}
        field={fieldToEdit}
        mode={fieldEditMode}
        defaultRowOrder={
          fieldEditMode === 'add' && selectedFields.length > 0
            ? Math.max(...selectedFields.map(f => f.row_order || 0)) + 1
            : 1
        }
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={onCloseDeleteConfirm}
        onConfirm={onConfirmDelete}
        title="Delete Field"
        message={`Are you sure you want to delete the field "${fieldToDelete?.source_field}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonVariant="danger"
      />

      <AlertModal
        isOpen={showSuccessAlert}
        onClose={onCloseSuccessAlert}
        type="success"
        title="Success"
        message={alertMessage}
        autoClose={true}
        autoCloseDelay={3000}
      />

      <AlertModal
        isOpen={showErrorAlert}
        onClose={onCloseErrorAlert}
        type="error"
        title="Error"
        message={alertMessage}
      />
    </>
  );
};

export default ModalsContainer;

