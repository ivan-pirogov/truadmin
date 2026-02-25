import React, { useState } from 'react';
import { BaseModal, ConfirmModal, AlertModal, PromptModal } from './index';
import type { AlertType } from './types';

const ModalDemo: React.FC = () => {
  const [showBase, setShowBase] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>('success');
  const [showPrompt, setShowPrompt] = useState(false);

  const handleConfirm = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Подтверждено!');
  };

  const handlePromptSubmit = async (value: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Введено значение:', value);
  };

  const openAlert = (type: AlertType) => {
    setAlertType(type);
    setShowAlert(true);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px', fontSize: '32px' }}>Кастомные модальные окна</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        {/* Base Modal */}
        <div style={{ padding: '20px', border: '2px solid #e5e7eb', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '12px' }}>Base Modal</h3>
          <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
            Базовая модаль с backdrop blur
          </p>
          <button
            onClick={() => setShowBase(true)}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Открыть
          </button>
        </div>

        {/* Confirm Modal */}
        <div style={{ padding: '20px', border: '2px solid #e5e7eb', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '12px' }}>Confirm Modal</h3>
          <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
            Подтверждение действия
          </p>
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Открыть
          </button>
        </div>

        {/* Alert Modals */}
        <div style={{ padding: '20px', border: '2px solid #e5e7eb', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '12px' }}>Alert Success</h3>
          <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
            Успешное оповещение
          </p>
          <button
            onClick={() => openAlert('success')}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Открыть
          </button>
        </div>

        <div style={{ padding: '20px', border: '2px solid #e5e7eb', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '12px' }}>Alert Error</h3>
          <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
            Оповещение об ошибке
          </p>
          <button
            onClick={() => openAlert('error')}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Открыть
          </button>
        </div>

        <div style={{ padding: '20px', border: '2px solid #e5e7eb', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '12px' }}>Alert Warning</h3>
          <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
            Предупреждение
          </p>
          <button
            onClick={() => openAlert('warning')}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Открыть
          </button>
        </div>

        <div style={{ padding: '20px', border: '2px solid #e5e7eb', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '12px' }}>Alert Info</h3>
          <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
            Информационное сообщение
          </p>
          <button
            onClick={() => openAlert('info')}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Открыть
          </button>
        </div>

        {/* Prompt Modal */}
        <div style={{ padding: '20px', border: '2px solid #e5e7eb', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '12px' }}>Prompt Modal</h3>
          <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
            Ввод данных с валидацией
          </p>
          <button
            onClick={() => setShowPrompt(true)}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Открыть
          </button>
        </div>
      </div>

      {/* Modal Instances */}
      <BaseModal
        isOpen={showBase}
        onClose={() => setShowBase(false)}
        title="Базовая модаль"
        size="md"
        animation="scale"
      >
        <p>Это базовая модаль с backdrop blur эффектом.</p>
        <p>Вы можете закрыть её кликнув на фон, нажав ESC или кнопку закрытия.</p>
      </BaseModal>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Подтверждение действия"
        message="Вы уверены, что хотите выполнить это действие? Это действие нельзя будет отменить."
        confirmText="Да, подтвердить"
        cancelText="Отмена"
        confirmButtonVariant="danger"
      />

      <AlertModal
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        type={alertType}
        title={
          alertType === 'success' ? 'Успешно!' :
          alertType === 'error' ? 'Ошибка!' :
          alertType === 'warning' ? 'Внимание!' :
          'Информация'
        }
        message={
          alertType === 'success' ? 'Операция выполнена успешно.' :
          alertType === 'error' ? 'Произошла ошибка при выполнении операции.' :
          alertType === 'warning' ? 'Пожалуйста, будьте внимательны.' :
          'Это информационное сообщение.'
        }
      />

      <PromptModal
        isOpen={showPrompt}
        onClose={() => setShowPrompt(false)}
        onSubmit={handlePromptSubmit}
        title="Введите имя"
        message="Пожалуйста, введите ваше имя для продолжения"
        placeholder="Например: Иван"
        validateInput={(value) => {
          if (value.length < 2) {
            return 'Имя должно содержать минимум 2 символа';
          }
          return true;
        }}
      />
    </div>
  );
};

export default ModalDemo;
