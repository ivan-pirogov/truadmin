import React, { useState, useEffect } from 'react';
import { FiPlus, FiUser, FiUsers } from 'react-icons/fi';
import { apiService, Role, DetailedRole, RolePrivilege } from '../../services/api';
import { useTab } from '../../contexts/TabContext';
import { useRole } from '../../contexts/RoleContext';
import RoleDetailsTab from '../RoleDetailsTab/RoleDetailsTab';
import CreateRoleModal from './CreateRoleModal';
import AlertModal from '../CustomModals/AlertModal';
import './RolesOverviewTab.css';

interface RolesOverviewTabProps {
  connectionId: string;
  connectionName: string;
}

interface RoleWithDetails extends Role {
  detailedInfo?: DetailedRole;
}

const RolesOverviewTab: React.FC<RolesOverviewTabProps> = ({ connectionId, connectionName }) => {
  const [roles, setRoles] = useState<RoleWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { addTab } = useTab();
  const { setSelectedRole } = useRole();

  useEffect(() => {
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      console.log('Loading roles for connection:', connectionId);
      const rolesData = await apiService.getRoles(connectionId);
      console.log('Roles loaded:', rolesData);

      // Load detailed info for each role
      const rolesWithDetails = await Promise.all(
        rolesData.map(async (role) => {
          try {
            const detailedInfo = await apiService.getDetailedRole(connectionId, role.id);
            return { ...role, detailedInfo };
          } catch (err) {
            console.error(`Error loading details for role ${role.name}:`, err);
            return role;
          }
        })
      );

      console.log('Roles with details:', rolesWithDetails);
      setRoles(rolesWithDetails);
    } catch (err) {
      console.error('Error loading roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleDoubleClick = (role: Role) => {
    const canLogin = role.permissions.includes('LOGIN');
    const roleIcon = canLogin ? <FiUser size={14} /> : <FiUsers size={14} />;
    const tabId = `role-${connectionId}-${role.id}`;

    setSelectedRole(connectionId, role.id, connectionName, role.name, canLogin);

    addTab({
      id: tabId,
      title: role.name,
      icon: roleIcon,
      content: <RoleDetailsTab connectionId={connectionId} roleId={role.id} />,
      closable: true,
      metadata: {
        type: 'role',
        connectionId: connectionId,
        roleId: role.id,
        connectionName: connectionName,
        roleName: role.name,
        canLogin: canLogin,
      },
    });
  };

  const handleAddRole = () => {
    setShowCreateModal(true);
  };

  const handleCreateRole = async (roleName: string, canLogin: boolean, password?: string) => {
    try {
      // Prepare role data
      const roleData = {
        name: roleName,
        description: '',
        permissions: canLogin ? ['LOGIN'] : [],
        users: [],
      };

      // Create role via API
      const newRole = await apiService.createRole(connectionId, roleData);

      // Show success alert
      setShowSuccessAlert(true);

      // Reload roles to include the new one
      await loadRoles();

      // Auto-open tab for the newly created role
      const roleIcon = canLogin ? <FiUser size={14} /> : <FiUsers size={14} />;
      const tabId = `role-${connectionId}-${newRole.id}`;

      setSelectedRole(connectionId, newRole.id, connectionName, newRole.name, canLogin);

      addTab({
        id: tabId,
        title: newRole.name,
        icon: roleIcon,
        content: <RoleDetailsTab connectionId={connectionId} roleId={newRole.id} />,
        closable: true,
        metadata: {
          type: 'role',
          connectionId: connectionId,
          roleId: newRole.id,
          connectionName: connectionName,
          roleName: newRole.name,
          canLogin: canLogin,
        },
      });

    } catch (err: any) {
      console.error('Error creating role:', err);
      setErrorMessage(err.message || 'Failed to create role');
      setShowErrorAlert(true);
      throw err; // Re-throw to let modal handle the error
    }
  };

  const groupPrivilegesByType = (privileges: RolePrivilege[]) => {
    const databases = new Map<string, string[]>();
    const schemas = new Map<string, string[]>();
    const objects = new Map<string, string[]>();

    privileges.forEach((priv) => {
      const key = priv.object_name;

      if (priv.object_type === 'database') {
        const existing = databases.get(key) || [];
        databases.set(key, [...new Set([...existing, ...priv.privileges])]);
      } else if (priv.object_type === 'schema') {
        const schemaKey = `${priv.object_schema || ''}.${priv.object_name}`;
        const existing = schemas.get(schemaKey) || [];
        schemas.set(schemaKey, [...new Set([...existing, ...priv.privileges])]);
      } else {
        const objectKey = `${priv.object_schema}.${priv.object_name}`;
        const existing = objects.get(objectKey) || [];
        objects.set(objectKey, [...new Set([...existing, ...priv.privileges])]);
      }
    });

    return { databases, schemas, objects };
  };

  const formatPrivileges = (privilegesMap: Map<string, string[]>, limit: number = 3) => {
    const entries = Array.from(privilegesMap.entries());
    if (entries.length === 0) return <span className="empty-privileges">—</span>;

    const displayed = entries.slice(0, limit);
    const remaining = entries.length - limit;

    return (
      <div className="privileges-summary">
        {displayed.map(([name, privs], idx) => (
          <div key={idx} className="privilege-item-summary">
            <span className="privilege-name">{name}</span>
            <span className="privilege-list">{privs.join(', ')}</span>
          </div>
        ))}
        {remaining > 0 && (
          <span className="more-privileges">+{remaining} more</span>
        )}
      </div>
    );
  };

  return (
    <div className="roles-overview-tab">
      <div className="roles-overview-header">
        <h2>Roles in {connectionName}</h2>
        <button className="btn btn-primary" onClick={handleAddRole}>
          <FiPlus size={18} />
          Add Role
        </button>
      </div>

      <div className="roles-overview-content">
        {loading ? (
          <div className="roles-overview-loading">Загрузка ролей...</div>
        ) : roles.length === 0 ? (
          <div className="empty-state">
            <p>Нет доступных ролей</p>
          </div>
        ) : (
          <table className="roles-table">
          <thead>
            <tr>
              <th>Role Name</th>
              <th>Type</th>
              <th>Database Privileges</th>
              <th>Schema Privileges</th>
              <th>Object Privileges</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => {
              const canLogin = role.permissions.includes('LOGIN');
              const { databases, schemas, objects } = role.detailedInfo
                ? groupPrivilegesByType(role.detailedInfo.privileges)
                : { databases: new Map(), schemas: new Map(), objects: new Map() };

              return (
                <tr
                  key={role.id}
                  onDoubleClick={() => handleRoleDoubleClick(role)}
                  className="role-row"
                >
                  <td className="role-name-cell">
                    <div className="role-name-wrapper">
                      {canLogin ? <FiUser size={16} /> : <FiUsers size={16} />}
                      <span>{role.name}</span>
                    </div>
                  </td>
                  <td className="role-type-cell">
                    {canLogin ? (
                      <span className="role-type-badge user">User</span>
                    ) : (
                      <span className="role-type-badge group">Group</span>
                    )}
                  </td>
                  <td className="privileges-cell">
                    {formatPrivileges(databases)}
                  </td>
                  <td className="privileges-cell">
                    {formatPrivileges(schemas)}
                  </td>
                  <td className="privileges-cell">
                    {formatPrivileges(objects, 2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>

      {/* Create Role Modal */}
      <CreateRoleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateRole}
      />

      {/* Success Alert */}
      <AlertModal
        isOpen={showSuccessAlert}
        onClose={() => setShowSuccessAlert(false)}
        type="success"
        title="Role Created"
        message="The role has been successfully created in the database."
        autoClose={true}
        autoCloseDelay={2500}
      />

      {/* Error Alert */}
      <AlertModal
        isOpen={showErrorAlert}
        onClose={() => setShowErrorAlert(false)}
        type="error"
        title="Error"
        message={errorMessage}
      />
    </div>
  );
};

export default RolesOverviewTab;
