import React from 'react';
import { FiSettings } from 'react-icons/fi';

interface RolePropertiesSectionProps {
  attributes: Record<string, boolean>;
  onAttributeChange: (attribute: string, value: boolean) => void;
}

const RolePropertiesSection: React.FC<RolePropertiesSectionProps> = ({
  attributes,
  onAttributeChange,
}) => {
  const attributesList = [
    { key: 'LOGIN', label: 'Login' },
    { key: 'SUPERUSER', label: 'Superuser' },
    { key: 'CREATEDB', label: 'Create Database' },
    { key: 'CREATEROLE', label: 'Create Role' },
    { key: 'INHERIT', label: 'Inherit' },
    { key: 'REPLICATION', label: 'Replication' },
  ];

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-header-icon">
          <FiSettings size={20} />
        </div>
        <h2>Role Properties</h2>
      </div>
      <div className="section-content">
        <div className="attributes-grid">
          {attributesList.map((attr) => (
            <div key={attr.key} className="attribute-item">
              <input
                type="checkbox"
                id={`attr-${attr.key}`}
                checked={attributes[attr.key] || false}
                onChange={(e) => onAttributeChange(attr.key, e.target.checked)}
              />
              <label htmlFor={`attr-${attr.key}`}>{attr.label}</label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RolePropertiesSection;
