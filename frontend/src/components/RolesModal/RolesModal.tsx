import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiEdit2, FiTrash2, FiUser, FiShield } from 'react-icons/fi';
import { apiService, Role } from '../../services/api';
import './RolesModal.css';

interface RolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  connectionName: string;
}

const RolesModal: React.FC<RolesModalProps> = ({
  isOpen,
  onClose,
  connectionId,
  connectionName,
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && connectionId) {
      loadRoles();
    }
  }, [isOpen, connectionId]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await apiService.getRoles(connectionId);
      setRoles(data);
      if (data.length > 0) {
        setSelectedRole(data[0]);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load roles');
      console.error('Error loading roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = () => {
    console.log('Create role');
  };

  const handleEditRole = (role: Role) => {
    console.log('Edit role:', role);
  };

  const handleDeleteRole = async (roleId: string) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await apiService.deleteRole(connectionId, roleId);
        await loadRoles();
      } catch (err) {
        console.error('Error deleting role:', err);
        alert('Failed to delete role');
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="roles-modal-overlay" onClick={onClose}>
      <div className="roles-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="roles-modal-header">
          <h2 className="roles-modal-title">
            <FiShield size={24} />
            Roles Management - {connectionName}
          </h2>
          <button className="roles-modal-close" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="roles-modal-body">
          {loading ? (
            <div className="roles-loading">Loading roles...</div>
          ) : error ? (
            <div className="roles-error">{error}</div>
          ) : (
            <div className="roles-container">
              <div className="roles-list">
                <div className="roles-list-header">
                  <h3>Roles List</h3>
                  <span className="roles-count">{roles.length}</span>
                  <button className="btn btn-primary btn-sm" onClick={handleCreateRole}>
                    <FiPlus size={16} />
                    Create Role
                  </button>
                </div>
                {roles.length === 0 ? (
                  <div className="roles-empty">No roles found</div>
                ) : (
                  <div className="roles-items">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className={`role-item ${selectedRole?.id === role.id ? 'selected' : ''}`}
                        onClick={() => setSelectedRole(role)}
                      >
                        <div className="role-item-icon">
                          <FiUser size={16} />
                        </div>
                        <div className="role-item-info">
                          <div className="role-item-name">{role.name}</div>
                          <div className="role-item-description">{role.description}</div>
                        </div>
                        <div className="role-item-actions">
                          <button
                            className="role-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditRole(role);
                            }}
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            className="role-action-btn delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role.id);
                            }}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedRole && (
                <div className="role-details">
                  <h3>Role Details</h3>
                  <div className="role-details-content">
                    <div className="detail-section">
                      <label>Role Name</label>
                      <div className="detail-value">{selectedRole.name}</div>
                    </div>
                    <div className="detail-section">
                      <label>Description</label>
                      <div className="detail-value">
                        {selectedRole.description || 'No description'}
                      </div>
                    </div>
                    <div className="detail-section">
                      <label>Permissions</label>
                      <div className="permissions-list">
                        {selectedRole.permissions && selectedRole.permissions.length > 0 ? (
                          selectedRole.permissions.map((permission, index) => (
                            <span key={index} className="permission-badge">
                              {permission}
                            </span>
                          ))
                        ) : (
                          <div className="detail-value">ALL PRIVILEGES</div>
                        )}
                      </div>
                    </div>
                    <div className="detail-section">
                      <label>Users with this Role</label>
                      <div className="users-list">
                        {selectedRole.users && selectedRole.users.length > 0 ? (
                          selectedRole.users.map((user, index) => (
                            <span key={index} className="user-badge">
                              <FiUser size={12} />
                              {user}
                            </span>
                          ))
                        ) : (
                          <div className="detail-value">No users assigned</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RolesModal;
