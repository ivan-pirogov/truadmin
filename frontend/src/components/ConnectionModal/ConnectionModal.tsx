import React, { useState, useEffect } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { apiService } from '../../services/api';
import BaseModal from '../CustomModals/BaseModal';
import AlertModal from '../CustomModals/AlertModal';
import '../CustomModals/CustomModals.css';
import './ConnectionModal.css';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  connectionId?: string | null;
}

interface FormData {
  name: string;
  type: 'postgres' | 'mysql' | 'sqlite' | 'mariadb' | 'mssql' | 'snowflake';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: string;
}

interface FormErrors {
  name?: string;
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  password?: string;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ isOpen, onClose, onSuccess, connectionId }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'postgres',
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    sslMode: 'disable',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.host.trim()) {
      newErrors.host = 'Host is required';
    }
    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      newErrors.port = 'Valid port is required';
    }
    if (!formData.database.trim()) {
      newErrors.database = 'Database is required';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Load connection data when editing
  useEffect(() => {
    if (isOpen && connectionId) {
      setIsLoading(true);
      apiService.getConnection(connectionId)
        .then((connection) => {
          setFormData({
            name: connection.name,
            type: connection.type,
            host: connection.host,
            port: connection.port,
            database: connection.database || '',
            username: connection.username,
            password: connection.password || '', // Password might be empty for security
            sslMode: connection.ssl_mode || 'disable',
          });
        })
        .catch((error) => {
          console.error('Failed to load connection:', error);
          // Still open modal even if loading fails, so user can see/edit what they can
          setErrorMessage('Failed to load connection data. You can still edit the connection.');
          setShowErrorAlert(true);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (isOpen && !connectionId) {
      // Reset form for new connection
      setFormData({
        name: '',
        type: 'postgres',
        host: '',
        port: 5432,
        database: '',
        username: '',
        password: '',
        sslMode: 'disable',
      });
    }
  }, [isOpen, connectionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (connectionId) {
        // Update existing connection
        await apiService.updateConnection(connectionId, {
          name: formData.name,
          type: formData.type,
          host: formData.host,
          port: formData.port,
          database: formData.database,
          username: formData.username,
          password: formData.password,
          ssl_mode: formData.sslMode,
        });
      } else {
        // Create new connection
        await apiService.createConnection({
          name: formData.name,
          type: formData.type,
          host: formData.host,
          port: formData.port,
          database: formData.database,
          username: formData.username,
          password: formData.password,
          ssl_mode: formData.sslMode,
        });
      }
      onSuccess();
      handleClose();
    } catch (error) {
      console.error(`Failed to ${connectionId ? 'update' : 'create'} connection:`, error);
      setErrorMessage(error instanceof Error ? error.message : `Failed to ${connectionId ? 'update' : 'create'} connection. Please try again.`);
      setShowErrorAlert(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 0 : value,
    }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      type: 'postgres',
      host: '',
      port: 5432,
      database: '',
      username: '',
      password: '',
      sslMode: 'disable',
    });
    setErrors({});
    onClose();
  };

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={handleClose}
        title={connectionId ? "Edit Connection" : "New Connection"}
        size="lg"
        animation="scale"
      >
        {isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading connection data...</div>
        ) : (
          <form className="connection-modal-form" onSubmit={handleSubmit}>
          <div className="custom-modal-form-group">
            <label className="connection-form-label" htmlFor="name">
              Connection Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className={`custom-modal-input ${errors.name ? 'custom-modal-input--error' : ''}`}
              value={formData.name}
              onChange={handleChange}
              placeholder="My Database"
            />
            {errors.name && <span className="custom-modal-error">{errors.name}</span>}
          </div>

          <div className="custom-modal-form-group">
            <label className="connection-form-label" htmlFor="type">
              Database Type *
            </label>
            <select
              id="type"
              name="type"
              className="custom-modal-input connection-select"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="postgres">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="mariadb">MariaDB</option>
              <option value="sqlite">SQLite</option>
              <option value="mssql">Microsoft SQL Server</option>
              <option value="snowflake">Snowflake</option>
            </select>
          </div>

          <div className="connection-form-row">
            <div className="custom-modal-form-group">
              <label className="connection-form-label" htmlFor="host">
                Host *
              </label>
              <input
                type="text"
                id="host"
                name="host"
                className={`custom-modal-input ${errors.host ? 'custom-modal-input--error' : ''}`}
                value={formData.host}
                onChange={handleChange}
                placeholder="localhost"
              />
              {errors.host && <span className="custom-modal-error">{errors.host}</span>}
            </div>

            <div className="custom-modal-form-group">
              <label className="connection-form-label" htmlFor="port">
                Port *
              </label>
              <input
                type="number"
                id="port"
                name="port"
                className={`custom-modal-input ${errors.port ? 'custom-modal-input--error' : ''}`}
                value={formData.port}
                onChange={handleChange}
                placeholder="5432"
                min="1"
                max="65535"
              />
              {errors.port && <span className="custom-modal-error">{errors.port}</span>}
            </div>
          </div>

          <div className="custom-modal-form-group">
            <label className="connection-form-label" htmlFor="database">
              Database Name *
            </label>
            <input
              type="text"
              id="database"
              name="database"
              className={`custom-modal-input ${errors.database ? 'custom-modal-input--error' : ''}`}
              value={formData.database}
              onChange={handleChange}
              placeholder="mydb"
            />
            {errors.database && <span className="custom-modal-error">{errors.database}</span>}
          </div>

          <div className="connection-form-row">
            <div className="custom-modal-form-group">
              <label className="connection-form-label" htmlFor="username">
                Username *
              </label>
              <input
                type="text"
                id="username"
                name="username"
                className={`custom-modal-input ${errors.username ? 'custom-modal-input--error' : ''}`}
                value={formData.username}
                onChange={handleChange}
                placeholder="postgres"
              />
              {errors.username && <span className="custom-modal-error">{errors.username}</span>}
            </div>

            <div className="custom-modal-form-group">
              <label className="connection-form-label" htmlFor="password">
                Password *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className={`custom-modal-input ${errors.password ? 'custom-modal-input--error' : ''}`}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {errors.password && <span className="custom-modal-error">{errors.password}</span>}
            </div>
          </div>

          <div className="custom-modal-form-group">
            <label className="connection-form-label" htmlFor="sslMode">
              SSL Mode
            </label>
            <select
              id="sslMode"
              name="sslMode"
              className="custom-modal-input connection-select"
              value={formData.sslMode}
              onChange={handleChange}
            >
              <option value="disable">Disable</option>
              <option value="allow">Allow</option>
              <option value="prefer">Prefer</option>
              <option value="require">Require</option>
              <option value="verify-ca">Verify CA</option>
              <option value="verify-full">Verify Full</option>
            </select>
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
              {isSubmitting ? (connectionId ? 'Updating...' : 'Creating...') : (connectionId ? 'Update Connection' : 'Create Connection')}
            </button>
          </div>
        </form>
        )}
      </BaseModal>

      <AlertModal
        isOpen={showErrorAlert}
        onClose={() => setShowErrorAlert(false)}
        type="error"
        title="Connection Error"
        message={errorMessage}
      />
    </>
  );
};

export default ConnectionModal;
