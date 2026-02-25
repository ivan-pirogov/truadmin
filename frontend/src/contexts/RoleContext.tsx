import React, { createContext, useContext, useState, ReactNode } from 'react';

interface RoleContextType {
  selectedRoleId: string | null;
  selectedConnectionId: string | null;
  selectedRoleName: string | null;
  selectedConnectionName: string | null;
  selectedRoleCanLogin: boolean | null;
  setSelectedRole: (connectionId: string, roleId: string, connectionName: string, roleName: string, canLogin: boolean) => void;
  clearSelectedRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [selectedRoleName, setSelectedRoleName] = useState<string | null>(null);
  const [selectedConnectionName, setSelectedConnectionName] = useState<string | null>(null);
  const [selectedRoleCanLogin, setSelectedRoleCanLogin] = useState<boolean | null>(null);

  const setSelectedRole = (connectionId: string, roleId: string, connectionName: string, roleName: string, canLogin: boolean) => {
    setSelectedConnectionId(connectionId);
    setSelectedRoleId(roleId);
    setSelectedConnectionName(connectionName);
    setSelectedRoleName(roleName);
    setSelectedRoleCanLogin(canLogin);
  };

  const clearSelectedRole = () => {
    setSelectedConnectionId(null);
    setSelectedRoleId(null);
    setSelectedConnectionName(null);
    setSelectedRoleName(null);
    setSelectedRoleCanLogin(null);
  };

  return (
    <RoleContext.Provider
      value={{ selectedRoleId, selectedConnectionId, selectedRoleName, selectedConnectionName, selectedRoleCanLogin, setSelectedRole, clearSelectedRole }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within RoleProvider');
  }
  return context;
};
