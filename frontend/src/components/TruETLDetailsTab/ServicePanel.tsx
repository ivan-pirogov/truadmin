import React from 'react';
import { Service } from './types';

interface ServicePanelProps {
  services: Service[];
  selectedService: string | null;
  loading: boolean;
  error: string | null;
  onServiceSelect: (serviceName: string) => void;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ServicePanel: React.FC<ServicePanelProps> = ({
  services,
  selectedService,
  loading,
  error,
  onServiceSelect,
  onAdd,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="truetl-panel">
      <div className="truetl-panel-header">
        <h3>1. Select Service</h3>
      </div>
      <div className="truetl-panel-content">
        {loading ? (
          <div className="loading-text">Loading...</div>
        ) : services.length > 0 ? (
          <table className="truetl-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Target DB Type</th>
                <th>Databases</th>
              </tr>
            </thead>
            <tbody>
              {[...services]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((service, idx) => {
                  const statusClass = service.status && service.status !== 'unchanged' 
                    ? `row-status-${service.status}` 
                    : '';
                  const className = [
                    selectedService === service.name ? 'selected' : '',
                    statusClass
                  ].filter(Boolean).join(' ');
                  
                  return (
                    <tr
                      key={idx}
                      className={className}
                      onClick={() => onServiceSelect(service.name)}
                    >
                      <td>{service.name}</td>
                      <td>{service.target_db_type}</td>
                      <td>{service.databases_count}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state-text">
            {error ? (
              <div>
                <strong>Error:</strong> {error}
              </div>
            ) : (
              <div>
                <p>No services found in meta.dms_tables.</p>
                <p style={{ fontSize: '12px', marginTop: '8px', color: '#6b7280' }}>
                  The table exists but is empty. Use "New..." button to add a service.
                </p>
              </div>
            )}
          </div>
        )}
        <div className="truetl-panel-actions">
          <button className="btn btn-sm btn-secondary" onClick={onAdd}>
            New...
          </button>
          <button className="btn btn-sm btn-secondary" onClick={onEdit} disabled={!selectedService}>
            Edit...
          </button>
          <button className="btn btn-sm btn-outline-danger" onClick={onDelete} disabled={!selectedService}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServicePanel;

