import React from 'react';
import { FiChevronRight, FiServer, FiDatabase, FiShield, FiUser, FiUsers, FiClock, FiSettings, FiEdit3, FiActivity, FiLayers } from 'react-icons/fi';
import { useRole } from '../../contexts/RoleContext';
import { useTab } from '../../contexts/TabContext';
import './Breadcrumbs.css';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

const Breadcrumbs: React.FC = () => {
  const { selectedRoleId, selectedConnectionId, selectedRoleName, selectedConnectionName, selectedRoleCanLogin, clearSelectedRole } = useRole();
  const { activeTabId, setActiveTab, tabs } = useTab();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [];

    // For roles overview tabs: roles-{connectionId}
    if (activeTabId.startsWith('roles-')) {
      const parts = activeTabId.split('-');
      if (parts.length >= 2) {
        const connectionId = parts[1];
        // Get connection name from tab metadata
        const tab = tabs.find(t => t.id === activeTabId);
        const connectionName = tab?.metadata?.connectionName || 'Connection';
        breadcrumbs.push(
          { label: 'Servers', path: 'connections', icon: <FiLayers size={14} /> },
          { label: connectionName, path: undefined, icon: <FiDatabase size={14} /> },
          { label: 'Roles', path: undefined, icon: <FiShield size={14} /> }
        );
      }
    }
    // For role tabs: role-{connectionId}-{roleId}
    else if (activeTabId.startsWith('role-') && selectedRoleId && selectedConnectionId && selectedConnectionName && selectedRoleName) {
      const roleIcon = selectedRoleCanLogin ? <FiUser size={14} /> : <FiUsers size={14} />;
      breadcrumbs.push(
        { label: 'Servers', path: 'connections', icon: <FiLayers size={14} /> },
        { label: selectedConnectionName, path: undefined, icon: <FiDatabase size={14} /> },
        { label: 'Roles', path: undefined, icon: <FiShield size={14} /> },
        { label: selectedRoleName, path: undefined, icon: roleIcon }
      );
    }
    // For query tabs: query-{connectionId}-{dbName}
    else if (activeTabId.startsWith('query-')) {
      const tab = tabs.find(t => t.id === activeTabId);
      const connectionName = tab?.metadata?.connectionName || '';
      const dbName = tab?.metadata?.databaseName || '';
      breadcrumbs.push(
        { label: 'Servers', path: 'connections', icon: <FiLayers size={14} /> },
        { label: connectionName, path: undefined, icon: <FiServer size={14} /> },
        { label: dbName, path: undefined, icon: <FiDatabase size={14} /> },
        { label: 'Query', path: undefined, icon: <FiEdit3 size={14} /> }
      );
    }
    // For database tabs: database-{connectionId}-{dbName}
    else if (activeTabId.startsWith('database-')) {
      const tab = tabs.find(t => t.id === activeTabId);
      const connectionName = tab?.metadata?.connectionName || '';
      const dbName = tab?.metadata?.databaseName || '';
      breadcrumbs.push(
        { label: 'Servers', path: 'connections', icon: <FiLayers size={14} /> },
        { label: connectionName, path: undefined, icon: <FiServer size={14} /> },
        { label: dbName, path: undefined, icon: <FiDatabase size={14} /> }
      );
    }
    // For monitoring tabs: monitoring-{connectionId}-{dbName}
    else if (activeTabId.startsWith('monitoring-')) {
      const tab = tabs.find(t => t.id === activeTabId);
      const connectionName = tab?.metadata?.connectionName || '';
      const dbName = tab?.metadata?.databaseName || '';
      breadcrumbs.push(
        { label: 'Servers', path: 'connections', icon: <FiLayers size={14} /> },
        { label: connectionName, path: undefined, icon: <FiServer size={14} /> },
        { label: dbName, path: undefined, icon: <FiDatabase size={14} /> },
        { label: 'Monitoring', path: undefined, icon: <FiActivity size={14} /> }
      );
    }
    // For connections tab (home tab)
    else if (activeTabId === 'connections') {
      breadcrumbs.push(
        { label: 'Servers', path: 'connections', icon: <FiLayers size={14} /> }
      );
    }
    // For query history tabs: query-history-{connectionId}-{dbName}
    else if (activeTabId.startsWith('query-history-')) {
      const tab = tabs.find(t => t.id === activeTabId);
      const connectionName = tab?.metadata?.connectionName || '';
      const dbName = tab?.metadata?.databaseName || '';
      breadcrumbs.push(
        { label: 'Servers', path: 'connections', icon: <FiLayers size={14} /> },
        { label: connectionName, path: undefined, icon: <FiServer size={14} /> },
        { label: dbName, path: undefined, icon: <FiDatabase size={14} /> },
        { label: 'Query History', path: undefined, icon: <FiClock size={14} /> }
      );
    }
    // For global query history tab (if exists)
    else if (activeTabId === 'query-history') {
      breadcrumbs.push(
        { label: 'Query History', path: undefined, icon: <FiClock size={14} /> }
      );
    }
    // For services tab
    else if (activeTabId === 'services') {
      breadcrumbs.push(
        { label: 'Services', path: undefined, icon: <FiSettings size={14} /> }
      );
    }
    // For users tab
    else if (activeTabId === 'users') {
      breadcrumbs.push(
        { label: 'Users', path: undefined, icon: <FiShield size={14} /> }
      );
    }
    // For TruETL main tab
    else if (activeTabId === 'truetl') {
      breadcrumbs.push(
        { label: 'Services', path: undefined, icon: <FiSettings size={14} /> },
        { label: 'TruETL', path: undefined, icon: <FiDatabase size={14} /> }
      );
    }
    // For TruETL database tabs: truetl-db-{id}
    else if (activeTabId.startsWith('truetl-db-')) {
      const tab = tabs.find(t => t.id === activeTabId);
      const title = tab?.title || '';
      breadcrumbs.push(
        { label: 'Services', path: undefined, icon: <FiSettings size={14} /> },
        { label: 'TruETL', path: 'truetl', icon: <FiDatabase size={14} /> },
        { label: title, path: undefined, icon: <FiDatabase size={14} /> }
      );
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="breadcrumbs">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={index}>
          {index > 0 && <FiChevronRight className="breadcrumb-separator" size={14} />}
          {crumb.path ? (
            <button
              className="breadcrumb-item breadcrumb-link"
              onClick={() => {
                setActiveTab(crumb.path!);
                if (crumb.path === 'connections') {
                  clearSelectedRole();
                }
              }}
            >
              {crumb.icon}
              <span>{crumb.label}</span>
            </button>
          ) : (
            <span className="breadcrumb-item breadcrumb-current">
              {crumb.icon}
              <span>{crumb.label}</span>
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
