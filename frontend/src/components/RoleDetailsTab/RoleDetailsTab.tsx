import React, { useState, useEffect, useCallback } from 'react';
import { FiSave, FiX } from 'react-icons/fi';
import { apiService, DetailedRole, RolePrivilege, Role, RoleMembership } from '../../services/api';
import RolePropertiesSection from './RolePropertiesSection';
import RoleMembershipSection from './RoleMembershipSection';
import RolePrivilegesSection from './RolePrivilegesSection';
import ConfirmModal from '../CustomModals/ConfirmModal';
import AlertModal from '../CustomModals/AlertModal';
import './RoleDetailsTab.css';

interface RoleDetailsTabProps {
  connectionId: string;
  roleId: string;
}

interface ExtendedRolePrivilege extends RolePrivilege {
  object_database?: string;
}

const RoleDetailsTab: React.FC<RoleDetailsTabProps> = ({ connectionId, roleId }) => {
  const [roleDetails, setRoleDetails] = useState<DetailedRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [modifiedAttributes, setModifiedAttributes] = useState<Record<string, boolean>>({});
  const [originalPrivileges, setOriginalPrivileges] = useState<ExtendedRolePrivilege[]>([]);
  const [modifiedPrivileges, setModifiedPrivileges] = useState<ExtendedRolePrivilege[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [originalParentRoles, setOriginalParentRoles] = useState<RoleMembership[]>([]);
  const [modifiedParentRoles, setModifiedParentRoles] = useState<RoleMembership[]>([]);
  const [originalChildRoles, setOriginalChildRoles] = useState<RoleMembership[]>([]);
  const [modifiedChildRoles, setModifiedChildRoles] = useState<RoleMembership[]>([]);
  const [connectionName, setConnectionName] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadRoleDetails = useCallback(async () => {
    if (!connectionId || !roleId) return;

    try {
      setLoading(true);
      const [data, roles, connections] = await Promise.all([
        apiService.getDetailedRole(connectionId, roleId),
        apiService.getRoles(connectionId),
        apiService.getConnections()
      ]);

      setRoleDetails(data);
      setModifiedAttributes(data.attributes);
      setOriginalPrivileges(data.privileges);
      setModifiedPrivileges(JSON.parse(JSON.stringify(data.privileges))); // Deep copy
      setAvailableRoles(roles);

      // Set connection name
      const connection = connections.find((c) => c.id === connectionId);
      setConnectionName(connection?.name || 'Unknown Connection');

      // Initialize membership state
      setOriginalParentRoles(data.parent_roles || []);
      setModifiedParentRoles(JSON.parse(JSON.stringify(data.parent_roles || [])));
      setOriginalChildRoles(data.child_roles || []);
      setModifiedChildRoles(JSON.parse(JSON.stringify(data.child_roles || [])));
    } catch (err) {
      console.error('Error loading role details:', err);
    } finally {
      setLoading(false);
    }
  }, [connectionId, roleId]);

  useEffect(() => {
    loadRoleDetails();
  }, [loadRoleDetails]);

  const handleAttributeChange = (attribute: string, value: boolean) => {
    setModifiedAttributes((prev) => ({
      ...prev,
      [attribute]: value,
    }));
  };

  const handlePrivilegeToggle = (
    objectName: string,
    objectSchema: string,
    objectType: string,
    privilege: string,
    currentlyHas: boolean,
    objectDatabase?: string
  ) => {
    setModifiedPrivileges((prev) => {
      const newPrivileges = [...prev];
      const existingPrivIndex = newPrivileges.findIndex(
        (p) => p.object_name === objectName && p.object_schema === objectSchema && p.object_type === objectType
      );

      if (currentlyHas) {
        // Remove privilege
        if (existingPrivIndex !== -1) {
          const updatedPrivileges = newPrivileges[existingPrivIndex].privileges.filter((p) => p !== privilege);
          if (updatedPrivileges.length === 0) {
            // If no privileges left, remove the entire object
            newPrivileges.splice(existingPrivIndex, 1);
          } else {
            newPrivileges[existingPrivIndex] = {
              ...newPrivileges[existingPrivIndex],
              privileges: updatedPrivileges,
            };
          }
        }
      } else {
        // Add privilege
        if (existingPrivIndex !== -1) {
          if (!newPrivileges[existingPrivIndex].privileges.includes(privilege)) {
            newPrivileges[existingPrivIndex] = {
              ...newPrivileges[existingPrivIndex],
              privileges: [...newPrivileges[existingPrivIndex].privileges, privilege],
            };
          }
        } else {
          newPrivileges.push({
            object_name: objectName,
            object_schema: objectSchema,
            object_type: objectType,
            object_database: objectDatabase,
            privileges: [privilege],
          });
        }
      }

      return newPrivileges;
    });
  };

  // Membership handlers
  const handleAddParentRole = (roleOid: string, adminOption: boolean) => {
    const role = availableRoles.find((r) => r.id === roleOid);
    if (!role) return;

    setModifiedParentRoles((prev) => [
      ...prev,
      {
        role_oid: role.id,
        role_name: role.name,
        member_oid: roleId,
        member_name: roleDetails?.name || '',
        admin_option: adminOption,
      },
    ]);
  };

  const handleRemoveParentRole = (roleOid: string) => {
    setModifiedParentRoles((prev) => prev.filter((pr) => pr.role_oid !== roleOid));
  };

  const handleAddChildRole = (roleOid: string, adminOption: boolean) => {
    const role = availableRoles.find((r) => r.id === roleOid);
    if (!role) return;

    setModifiedChildRoles((prev) => [
      ...prev,
      {
        role_oid: roleId,
        role_name: roleDetails?.name || '',
        member_oid: role.id,
        member_name: role.name,
        admin_option: adminOption,
      },
    ]);
  };

  const handleRemoveChildRole = (roleOid: string) => {
    setModifiedChildRoles((prev) => prev.filter((cr) => cr.member_oid !== roleOid));
  };

  const handleSave = () => {
    setShowConfirmModal(true);
  };

  const confirmSave = async () => {
    if (!connectionId || !roleDetails) return;

    try {
      // Save role attributes
      const updatedPermissions: string[] = [];
      Object.entries(modifiedAttributes).forEach(([key, value]) => {
        if (value) {
          updatedPermissions.push(key);
        }
      });

      await apiService.updateRole(connectionId, roleDetails.id, {
        name: roleDetails.name,
        description: roleDetails.description,
        permissions: updatedPermissions,
        users: roleDetails.users,
      });

      // Determine which privileges need to be granted and revoked
      const privilegesToGrant: { object_type: string; object_schema?: string; object_name: string; object_database?: string; privileges: string[] }[] = [];
      const privilegesToRevoke: { object_type: string; object_schema?: string; object_name: string; object_database?: string; privileges: string[] }[] = [];

      // Process all modified privileges
      modifiedPrivileges.forEach((modPriv) => {
        const origPriv = originalPrivileges.find(
          (p) => p.object_name === modPriv.object_name &&
                 p.object_schema === modPriv.object_schema &&
                 p.object_type === modPriv.object_type
        );

        const originalPrivSet = new Set(origPriv?.privileges || []);
        const modifiedPrivSet = new Set(modPriv.privileges);

        // Privileges to grant (in modified, not in original)
        const toGrant = modPriv.privileges.filter((p) => !originalPrivSet.has(p));
        if (toGrant.length > 0) {
          privilegesToGrant.push({
            object_type: modPriv.object_type,
            object_schema: modPriv.object_schema,
            object_name: modPriv.object_name,
            object_database: modPriv.object_database,
            privileges: toGrant,
          });
        }

        // Privileges to revoke (in original, not in modified)
        const toRevoke = (origPriv?.privileges || []).filter((p) => !modifiedPrivSet.has(p));
        if (toRevoke.length > 0) {
          privilegesToRevoke.push({
            object_type: modPriv.object_type,
            object_schema: modPriv.object_schema,
            object_name: modPriv.object_name,
            object_database: modPriv.object_database,
            privileges: toRevoke,
          });
        }
      });

      // Check objects that were completely removed from modifiedPrivileges
      originalPrivileges.forEach((origPriv) => {
        const stillExists = modifiedPrivileges.find(
          (p) => p.object_name === origPriv.object_name &&
                 p.object_schema === origPriv.object_schema &&
                 p.object_type === origPriv.object_type
        );

        if (!stillExists && origPriv.privileges.length > 0) {
          privilegesToRevoke.push({
            object_type: origPriv.object_type,
            object_schema: origPriv.object_schema,
            object_name: origPriv.object_name,
            object_database: origPriv.object_database,
            privileges: origPriv.privileges,
          });
        }
      });

      // Execute grant and revoke
      console.log('Privileges to grant:', privilegesToGrant);
      console.log('Privileges to revoke:', privilegesToRevoke);

      for (const grant of privilegesToGrant) {
        console.log('Granting:', grant);
        await apiService.grantPrivileges(connectionId, roleDetails.id, grant);
      }

      for (const revoke of privilegesToRevoke) {
        console.log('Revoking:', revoke);
        await apiService.revokePrivileges(connectionId, roleDetails.id, revoke);
      }

      // Process parent roles changes
      const parentRolesToGrant = modifiedParentRoles.filter(
        (mod) => !originalParentRoles.some((orig) => orig.role_oid === mod.role_oid)
      );

      const parentRolesToRevoke = originalParentRoles.filter(
        (orig) => !modifiedParentRoles.some((mod) => mod.role_oid === orig.role_oid)
      );

      console.log('Parent roles to grant:', parentRolesToGrant);
      console.log('Parent roles to revoke:', parentRolesToRevoke);

      for (const parent of parentRolesToGrant) {
        console.log('Granting parent role:', parent);
        await apiService.grantMembership(connectionId, parent.role_oid, {
          member_role_oid: roleDetails.id,
          admin_option: parent.admin_option,
        });
      }

      for (const parent of parentRolesToRevoke) {
        console.log('Revoking parent role:', parent);
        await apiService.revokeMembership(connectionId, parent.role_oid, {
          member_role_oid: roleDetails.id,
          admin_option: parent.admin_option,
        });
      }

      // Process child roles changes
      const childRolesToGrant = modifiedChildRoles.filter(
        (mod) => !originalChildRoles.some((orig) => orig.member_oid === mod.member_oid)
      );

      const childRolesToRevoke = originalChildRoles.filter(
        (orig) => !modifiedChildRoles.some((mod) => mod.member_oid === orig.member_oid)
      );

      console.log('Child roles to grant:', childRolesToGrant);
      console.log('Child roles to revoke:', childRolesToRevoke);

      for (const child of childRolesToGrant) {
        console.log('Granting child role:', child);
        await apiService.grantMembership(connectionId, roleDetails.id, {
          member_role_oid: child.member_oid,
          admin_option: child.admin_option,
        });
      }

      for (const child of childRolesToRevoke) {
        console.log('Revoking child role:', child);
        await apiService.revokeMembership(connectionId, roleDetails.id, {
          member_role_oid: child.member_oid,
          admin_option: child.admin_option,
        });
      }

      await loadRoleDetails();
      setShowSuccessAlert(true);
    } catch (err) {
      console.error('Error saving role:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save changes. Please try again.');
      setShowErrorAlert(true);
    }
  };

  const handleCancel = () => {
    if (roleDetails) {
      setModifiedAttributes(roleDetails.attributes);
      setModifiedPrivileges(JSON.parse(JSON.stringify(originalPrivileges)));
      setModifiedParentRoles(JSON.parse(JSON.stringify(originalParentRoles)));
      setModifiedChildRoles(JSON.parse(JSON.stringify(originalChildRoles)));
    }
  };

  // Check if there are real changes
  const hasRealChanges = (): boolean => {
    if (!roleDetails) return false;

    // Check attribute changes
    const attributesChanged = Object.keys(modifiedAttributes).some(
      (key) => modifiedAttributes[key] !== roleDetails.attributes[key]
    );
    if (attributesChanged) return true;

    // Check privilege changes
    // Compare privilege count
    if (modifiedPrivileges.length !== originalPrivileges.length) return true;

    // Check each privilege
    for (const modPriv of modifiedPrivileges) {
      const origPriv = originalPrivileges.find(
        (p) =>
          p.object_name === modPriv.object_name &&
          p.object_schema === modPriv.object_schema &&
          p.object_type === modPriv.object_type
      );

      // If not found in original - there is a change
      if (!origPriv) return true;

      // Compare privilege lists
      if (modPriv.privileges.length !== origPriv.privileges.length) return true;

      const modPrivSet = new Set(modPriv.privileges);
      const origPrivSet = new Set(origPriv.privileges);

      for (const priv of modPriv.privileges) {
        if (!origPrivSet.has(priv)) return true;
      }

      for (const priv of origPriv.privileges) {
        if (!modPrivSet.has(priv)) return true;
      }
    }

    // Check parent roles changes
    if (modifiedParentRoles.length !== originalParentRoles.length) return true;

    for (const modParent of modifiedParentRoles) {
      const origParent = originalParentRoles.find((p) => p.role_oid === modParent.role_oid);
      if (!origParent || origParent.admin_option !== modParent.admin_option) return true;
    }

    // Check child roles changes
    if (modifiedChildRoles.length !== originalChildRoles.length) return true;

    for (const modChild of modifiedChildRoles) {
      const origChild = originalChildRoles.find((c) => c.member_oid === modChild.member_oid);
      if (!origChild || origChild.admin_option !== modChild.admin_option) return true;
    }

    return false;
  };

  if (loading) {
    return <div className="role-details-loading">Loading...</div>;
  }

  if (!roleDetails) {
    return <div className="role-details-error">Failed to load role details</div>;
  }

  return (
    <div className="role-details-tab">
      <div className="role-details-scroll">
        <RolePropertiesSection
          attributes={modifiedAttributes}
          onAttributeChange={handleAttributeChange}
        />

        <RoleMembershipSection
          parentRoles={modifiedParentRoles}
          childRoles={modifiedChildRoles}
          availableRoles={availableRoles}
          currentRoleId={roleDetails.id}
          onAddParentRole={handleAddParentRole}
          onRemoveParentRole={handleRemoveParentRole}
          onAddChildRole={handleAddChildRole}
          onRemoveChildRole={handleRemoveChildRole}
        />

        <RolePrivilegesSection
          connectionId={connectionId}
          roleId={roleDetails.id}
          currentPrivileges={modifiedPrivileges}
          onPrivilegeToggle={handlePrivilegeToggle}
        />
      </div>

      <div className="role-action-buttons">
        <button
          className="btn btn-secondary"
          onClick={handleCancel}
          disabled={!hasRealChanges()}
        >
          <FiX size={18} />
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!hasRealChanges()}
        >
          <FiSave size={18} />
          Save
        </button>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmSave}
        title="Confirm Changes"
        message={`The changes made to role "${roleDetails?.name}" will be applied to the database server "${connectionName}". Do you want to proceed?`}
        confirmText="Save Changes"
        cancelText="Cancel"
        confirmButtonVariant="primary"
      />

      <AlertModal
        isOpen={showSuccessAlert}
        onClose={() => setShowSuccessAlert(false)}
        type="success"
        title="Changes Saved!"
        message={`Role "${roleDetails?.name}" has been successfully updated on server "${connectionName}".`}
        autoClose={true}
        autoCloseDelay={2500}
      />

      <AlertModal
        isOpen={showErrorAlert}
        onClose={() => setShowErrorAlert(false)}
        type="error"
        title="Save Failed"
        message={errorMessage}
      />
    </div>
  );
};

export default RoleDetailsTab;
