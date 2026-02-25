import React, { useState } from 'react';
import { FiUsers, FiPlus, FiX } from 'react-icons/fi';
import { RoleMembership, Role } from '../../services/api';

interface RoleMembershipSectionProps {
  parentRoles: RoleMembership[];
  childRoles: RoleMembership[];
  availableRoles: Role[];
  currentRoleId: string;
  onAddParentRole: (roleOid: string, adminOption: boolean) => void;
  onRemoveParentRole: (roleOid: string) => void;
  onAddChildRole: (roleOid: string, adminOption: boolean) => void;
  onRemoveChildRole: (roleOid: string) => void;
}

const RoleMembershipSection: React.FC<RoleMembershipSectionProps> = ({
  parentRoles,
  childRoles,
  availableRoles,
  currentRoleId,
  onAddParentRole,
  onRemoveParentRole,
  onAddChildRole,
  onRemoveChildRole,
}) => {
  const safeParentRoles = parentRoles || [];
  const safeChildRoles = childRoles || [];

  const [selectedParentRole, setSelectedParentRole] = useState('');
  const [parentAdminOption, setParentAdminOption] = useState(false);
  const [selectedChildRole, setSelectedChildRole] = useState('');
  const [childAdminOption, setChildAdminOption] = useState(false);

  // Filter out current role and already added roles
  const availableParentRoles = availableRoles.filter(
    (role) => role.id !== currentRoleId && !safeParentRoles.some((pr) => pr.role_oid === role.id)
  );

  const availableChildRoles = availableRoles.filter(
    (role) => role.id !== currentRoleId && !safeChildRoles.some((cr) => cr.member_oid === role.id)
  );

  const handleAddParent = () => {
    if (selectedParentRole) {
      onAddParentRole(selectedParentRole, parentAdminOption);
      setSelectedParentRole('');
      setParentAdminOption(false);
    }
  };

  const handleAddChild = () => {
    if (selectedChildRole) {
      onAddChildRole(selectedChildRole, childAdminOption);
      setSelectedChildRole('');
      setChildAdminOption(false);
    }
  };

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-header-icon">
          <FiUsers size={20} />
        </div>
        <h2>Role Membership</h2>
      </div>
      <div className="section-content">
        <div className="membership-section">
          <div className="membership-subsection">
            <h3>Member of</h3>

            {/* Add parent role UI */}
            <div style={{ marginBottom: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
              <select
                value={selectedParentRole}
                onChange={(e) => setSelectedParentRole(e.target.value)}
                style={{ flex: 1, padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}
              >
                <option value="">Select role to add...</option>
                {availableParentRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', whiteSpace: 'nowrap', fontSize: 'var(--font-size-sm)' }}>
                <input
                  type="checkbox"
                  checked={parentAdminOption}
                  onChange={(e) => setParentAdminOption(e.target.checked)}
                />
                Admin
              </label>
              <button
                onClick={handleAddParent}
                disabled={!selectedParentRole}
                style={{
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)'
                }}
              >
                <FiPlus size={16} />
              </button>
            </div>

            {safeParentRoles.length > 0 ? (
              <div className="membership-list">
                {safeParentRoles.map((membership) => (
                  <div key={membership.role_oid} className="membership-item">
                    <div className="membership-item-name">{membership.role_name}</div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                      {membership.admin_option && (
                        <span className="admin-option-badge">ADMIN OPTION</span>
                      )}
                      <button
                        onClick={() => onRemoveParentRole(membership.role_oid)}
                        style={{
                          padding: 'var(--spacing-xs)',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          background: 'var(--color-danger)',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-message">This role is not a member of any other roles</div>
            )}
          </div>

          <div className="membership-subsection">
            <h3>Members</h3>

            {/* Add child role UI */}
            <div style={{ marginBottom: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
              <select
                value={selectedChildRole}
                onChange={(e) => setSelectedChildRole(e.target.value)}
                style={{ flex: 1, padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}
              >
                <option value="">Select role to add...</option>
                {availableChildRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', whiteSpace: 'nowrap', fontSize: 'var(--font-size-sm)' }}>
                <input
                  type="checkbox"
                  checked={childAdminOption}
                  onChange={(e) => setChildAdminOption(e.target.checked)}
                />
                Admin
              </label>
              <button
                onClick={handleAddChild}
                disabled={!selectedChildRole}
                style={{
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)'
                }}
              >
                <FiPlus size={16} />
              </button>
            </div>

            {safeChildRoles.length > 0 ? (
              <div className="membership-list">
                {safeChildRoles.map((membership) => (
                  <div key={membership.member_oid} className="membership-item">
                    <div className="membership-item-name">{membership.member_name}</div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                      {membership.admin_option && (
                        <span className="admin-option-badge">ADMIN OPTION</span>
                      )}
                      <button
                        onClick={() => onRemoveChildRole(membership.member_oid)}
                        style={{
                          padding: 'var(--spacing-xs)',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          background: 'var(--color-danger)',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-message">No roles are members of this role</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleMembershipSection;
