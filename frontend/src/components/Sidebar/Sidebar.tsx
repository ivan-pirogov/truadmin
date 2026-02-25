import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { FiDatabase, FiServer, FiClock, FiActivity, FiEdit3, FiShield, FiUsers, FiUser, FiSettings, FiLayers, FiFileText, FiZap } from 'react-icons/fi';
import Accordion, { AccordionItem } from '../Accordion/Accordion';
import { apiService, Connection, Database, Role, TruETLDatabase, HohAddressDatabase } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { useTab } from '../../contexts/TabContext';
import RoleDetailsTab from '../RoleDetailsTab/RoleDetailsTab';
import RolesOverviewTab from '../RolesOverviewTab/RolesOverviewTab';
import DatabaseTab from '../DatabaseTab/DatabaseTab';
import MonitoringTab from '../MonitoringTab/MonitoringTab';
import QueryHistoryTab from '../QueryHistoryTab/QueryHistoryTab';
import UsersTab from '../UsersTab/UsersTab';
import TruETLTab from '../TruETLTab/TruETLTab';
import HohAddressTab from '../HohAddressTab/HohAddressTab';
import TruETLDetailsTab from '../TruETLDetailsTab/TruETLDetailsTab';
import TruETLLogsTab from '../TruETLLogsTab/TruETLLogsTab';
import HohAddressDetailsTab from '../HohAddressDetailsTab/HohAddressDetailsTab';
import HohAddressLogsTab from '../HohAddressLogsTab/HohAddressLogsTab';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { selectedRoleId, setSelectedRole } = useRole();
  const { addTab, setActiveTab, tabs, activeTabId } = useTab();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [databasesCache, setDatabasesCache] = useState<Record<string, Database[]>>({});
  const [rolesCache, setRolesCache] = useState<Record<string, Role[]>>({});
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());
  const [expandedDatabases, setExpandedDatabases] = useState<Record<string, Set<string>>>({});
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, 'unknown' | 'checking' | 'online' | 'offline'>>({});
  const [truETLDatabases, setTruETLDatabases] = useState<TruETLDatabase[]>([]);
  const [hohAddressDatabases, setHohAddressDatabases] = useState<HohAddressDatabase[]>([]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isAdmin = user?.role === 'admin';

  const checkConnectionStatus = useCallback(async (connectionId: string) => {
    setConnectionStatuses(prev => ({ ...prev, [connectionId]: 'checking' }));

    try {
      await apiService.testConnection(connectionId);
      setConnectionStatuses(prev => ({ ...prev, [connectionId]: 'online' }));
    } catch (error) {
      console.error('Failed to check connection:', error);
      setConnectionStatuses(prev => ({ ...prev, [connectionId]: 'offline' }));
    }
  }, []);

  const loadDatabases = useCallback(async (connectionId: string) => {
    if (databasesCache[connectionId]) {
      return databasesCache[connectionId];
    }

    try {
      const data = await apiService.getDatabases(connectionId);
      setDatabasesCache((prev) => ({ ...prev, [connectionId]: data }));
      return data;
    } catch (err) {
      console.error('Error loading databases:', err);
      return [];
    }
  }, [databasesCache]);

  const loadRoles = useCallback(async (connectionId: string) => {
    if (rolesCache[connectionId]) {
      return rolesCache[connectionId];
    }

    try {
      const data = await apiService.getRoles(connectionId);
      setRolesCache((prev) => ({ ...prev, [connectionId]: data }));
      return data;
    } catch (err) {
      console.error('Error loading roles:', err);
      return [];
    }
  }, [rolesCache]);

  const loadTruETLDatabases = async () => {
    try {
      const data = await apiService.getTruETLDatabases();
      setTruETLDatabases(data || []);
    } catch (err) {
      console.error('Error loading TruETL databases:', err);
      setTruETLDatabases([]);
    }
  };

  const loadHohAddressDatabases = async () => {
    try {
      const data = await apiService.getHohAddressDatabases();
      setHohAddressDatabases(data || []);
    } catch (err) {
      console.error('Error loading HohAddress databases:', err);
      setHohAddressDatabases([]);
    }
  };

  useEffect(() => {
    loadConnections();
    loadTruETLDatabases();
    loadHohAddressDatabases();

    // Listen for TruETL database updates
    const handleTruETLUpdate = () => {
      loadTruETLDatabases();
    };
    window.addEventListener('truetl-databases-updated', handleTruETLUpdate);

    // Listen for HohAddress database updates
    const handleHohAddressUpdate = () => {
      loadHohAddressDatabases();
    };
    window.addEventListener('hohaddress-databases-updated', handleHohAddressUpdate);

    return () => {
      window.removeEventListener('truetl-databases-updated', handleTruETLUpdate);
      window.removeEventListener('hohaddress-databases-updated', handleHohAddressUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-expand connection when roles or role tab is active
  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab?.metadata) return;

    const connectionId = activeTab.metadata.connectionId;
    if (!connectionId) return;

    // Expand menu for both 'roles' and 'role' types
    if (activeTab.metadata.type === 'roles' || activeTab.metadata.type === 'role') {
      setExpandedConnections(prev => {
        const newSet = new Set(prev);
        newSet.add(`nav-connections`); // Main servers section
        newSet.add(connectionId); // Specific connection
        newSet.add(`${connectionId}-roles`); // Roles section
        return newSet;
      });

      // Load full tree for this connection (both databases and roles)
      if (!databasesCache[connectionId]) {
        loadDatabases(connectionId);
      }
      if (!rolesCache[connectionId]) {
        loadRoles(connectionId);
      }
    }
  }, [activeTabId, tabs, databasesCache, rolesCache, loadDatabases, loadRoles]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const data = await apiService.getConnections();
      setConnections(data || []);
      setError(null);

      // Check status for all connections
      if (data && data.length > 0) {
        data.forEach((conn) => {
          checkConnectionStatus(conn.id);
        });
      }
    } catch (err) {
      setError('Не удалось загрузить подключения');
      console.error('Error loading connections:', err);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleConnection = async (connectionId: string) => {
    const newExpanded = new Set(expandedConnections);
    if (newExpanded.has(connectionId)) {
      newExpanded.delete(connectionId);
    } else {
      newExpanded.add(connectionId);
      await loadDatabases(connectionId);
    }
    setExpandedConnections(newExpanded);
  };

  const toggleDatabase = (connectionId: string, dbName: string) => {
    setExpandedDatabases((prev) => {
      const connectionExpanded = prev[connectionId] || new Set();
      const newExpanded = new Set(connectionExpanded);
      if (newExpanded.has(dbName)) {
        newExpanded.delete(dbName);
      } else {
        newExpanded.add(dbName);
      }
      return { ...prev, [connectionId]: newExpanded };
    });
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'postgres':
      case 'mysql':
      case 'mariadb':
      case 'sqlite':
      case 'mssql':
      case 'snowflake':
        return <FiServer size={16} />;
      default:
        return <FiDatabase size={16} />;
    }
  };

  const getStatusIndicator = (connectionId: string) => {
    const status = connectionStatuses[connectionId] || 'unknown';
    let color = '#9ca3af'; // gray for unknown

    switch (status) {
      case 'online':
        color = '#10b981'; // green
        break;
      case 'offline':
        color = '#ef4444'; // red
        break;
      case 'checking':
        color = '#f59e0b'; // orange
        break;
    }

    return (
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          marginRight: '8px',
          flexShrink: 0,
        }}
      />
    );
  };

  const buildAccordionItems = (): AccordionItem[] => {
    const items: AccordionItem[] = [];

    connections &&
      connections.forEach((connection) => {
        const isConnectionExpanded = expandedConnections.has(connection.id);
        const databases = databasesCache[connection.id] || [];
        const roles = rolesCache[connection.id] || [];

        const databaseItems: AccordionItem[] = databases.map((db) => {
          const isDbExpanded = expandedDatabases[connection.id]?.has(db.name);
          const dbId = `${connection.id}-${db.name}`;

          return {
            id: dbId,
            label: db.name,
            icon: <FiDatabase size={14} />,
            onClick: () => {
              const tabId = `database-${connection.id}-${db.name}`;
              addTab({
                id: tabId,
                title: db.name,
                icon: <FiDatabase size={14} />,
                content: <DatabaseTab connectionId={connection.id} databaseName={db.name} />,
                closable: true,
                metadata: {
                  type: 'database',
                  connectionId: connection.id,
                  connectionName: connection.name,
                  databaseName: db.name,
                },
              });
            },
            children: [
              {
                id: `${dbId}-query-history`,
                label: 'Query History',
                icon: <FiClock size={14} />,
                isLeaf: true,
                onClick: () => {
                  const tabId = `query-history-${connection.id}-${db.name}`;
                  addTab({
                    id: tabId,
                    title: `${db.name} - Query History`,
                    icon: <FiClock size={14} />,
                    content: <QueryHistoryTab connectionId={connection.id} databaseName={db.name} />,
                    closable: true,
                    metadata: {
                      type: 'query-history',
                      connectionId: connection.id,
                      connectionName: connection.name,
                      databaseName: db.name,
                    },
                  });
                },
              },
              {
                id: `${dbId}-monitoring`,
                label: 'Monitoring',
                icon: <FiActivity size={14} />,
                isLeaf: true,
                onClick: () => {
                  const tabId = `monitoring-${connection.id}-${db.name}`;
                  addTab({
                    id: tabId,
                    title: `${db.name} - Monitoring`,
                    icon: <FiActivity size={14} />,
                    content: <MonitoringTab connectionId={connection.id} databaseName={db.name} />,
                    closable: true,
                    metadata: {
                      type: 'monitoring',
                      connectionId: connection.id,
                      connectionName: connection.name,
                      databaseName: db.name,
                    },
                  });
                },
              },
            ],
          };
        });

        const roleItems: AccordionItem[] = roles.map((role) => {
          const canLogin = role.permissions.includes('LOGIN');
          const roleIcon = canLogin ? <FiUser size={14} /> : <FiUsers size={14} />;
          const tabId = `role-${connection.id}-${role.id}`;

          return {
            id: `${connection.id}-role-${role.id}`,
            label: role.name,
            icon: roleIcon,
            isLeaf: true,
            onClick: () => {
              setSelectedRole(connection.id, role.id, connection.name, role.name, canLogin);

              // Создаем вкладку для роли
              addTab({
                id: tabId,
                title: role.name,
                icon: roleIcon,
                content: <RoleDetailsTab connectionId={connection.id} roleId={role.id} />,
                closable: true,
                metadata: {
                  type: 'role',
                  connectionId: connection.id,
                  roleId: role.id,
                  connectionName: connection.name,
                  roleName: role.name,
                  canLogin: canLogin,
                },
              });
            },
          };
        });

        const connectionChildren: AccordionItem[] = [
          {
            id: `${connection.id}-roles`,
            label: 'Roles',
            icon: <FiShield size={14} />,
            children: roleItems,
            onClick: async () => {
              if (roles.length === 0) {
                await loadRoles(connection.id);
              }

              // Open roles overview tab
              const tabId = `roles-${connection.id}`;
              addTab({
                id: tabId,
                title: `${connection.name} - Roles`,
                icon: <FiShield size={14} />,
                content: <RolesOverviewTab connectionId={connection.id} connectionName={connection.name} />,
                closable: true,
                metadata: {
                  type: 'roles',
                  connectionId: connection.id,
                  connectionName: connection.name,
                },
              });
            },
          },
          ...databaseItems,
        ];

        items.push({
          id: connection.id,
          label: connection.name,
          icon: (
            <>
              {getStatusIndicator(connection.id)}
              {getConnectionIcon(connection.type)}
            </>
          ),
          children: connectionChildren,
          onClick: async () => {
            if (!expandedConnections.has(connection.id)) {
              await Promise.all([
                loadDatabases(connection.id),
                loadRoles(connection.id)
              ]);
            }
          },
        });
      });

    return items;
  };

  // Calculate active menu item ID and expanded items based on active tab
  const getActiveMenuItemId = (): string | null => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab?.metadata) return null;

    if (activeTab.metadata.type === 'roles' && activeTab.metadata.connectionId) {
      return `${activeTab.metadata.connectionId}-roles`;
    }
    if (activeTab.metadata.type === 'role' && activeTab.metadata.connectionId && activeTab.metadata.roleId) {
      return `${activeTab.metadata.connectionId}-role-${activeTab.metadata.roleId}`;
    }

    return null;
  };

  const activeMenuItemId = getActiveMenuItemId();

  const buildNavigationItems = (): AccordionItem[] => {
    const navItems: AccordionItem[] = [];

    // Servers with all sub-items
    if (connections.length > 0) {
      navItems.push({
        id: 'nav-connections',
        label: 'Servers',
        icon: <FiLayers size={20} />,
        children: buildAccordionItems(),
        onClick: () => {
          setActiveTab('connections');
        },
      });
    } else {
      navItems.push({
        id: 'nav-connections',
        label: 'Servers',
        icon: <FiLayers size={20} />,
        isLeaf: true,
        onClick: () => {
          setActiveTab('connections');
        },
      });
    }

    // // Query History
    // navItems.push({
    //   id: 'nav-history',
    //   label: 'Query History',
    //   icon: <FiClock size={20} />,
    //   isLeaf: true,
    //   onClick: () => {
    //     const tabId = 'query-history';
    //     addTab({
    //       id: tabId,
    //       title: 'Query History',
    //       icon: <FiClock size={20} />,
    //       content: <div>Query History</div>,
    //       closable: true,
    //     });
    //   },
    // });

    // Services
    const truETLChildren: AccordionItem[] = (truETLDatabases || []).map((db) => {
      const openDetails = async () => {
        const tabId = `truetl-db-${db.id}-details`;
        // Load full database info
        const fullDb = await apiService.getTruETLDatabase(db.id);
        addTab({
          id: tabId,
          title: `${db.connection_name}.${db.database_name}`,
          icon: <FiDatabase size={14} />,
          content: <TruETLDetailsTab truetlDatabase={fullDb} />,
          closable: true,
          metadata: {
            type: 'truetl-database',
            truetlDatabaseId: db.id,
          },
        });
      };

      return {
        id: `truetl-db-${db.id}`,
        label: `${db.connection_name}.${db.database_name}`,
        icon: <FiDatabase size={14} />,
        onClick: openDetails, // Open Details when clicking on database itself
        children: [
          {
            id: `truetl-db-${db.id}-details`,
            label: 'Details',
            icon: <FiZap size={12} />,
            isLeaf: true,
            onClick: openDetails,
          },
          {
            id: `truetl-db-${db.id}-logs`,
            label: 'Logs',
            icon: <FiFileText size={12} />,
            isLeaf: true,
            onClick: async () => {
              const tabId = `truetl-db-${db.id}-logs`;
              // Load full database info
              const fullDb = await apiService.getTruETLDatabase(db.id);
              addTab({
                id: tabId,
                title: `${db.connection_name}.${db.database_name} - Logs`,
                icon: <FiFileText size={14} />,
                content: <TruETLLogsTab truetlDatabase={fullDb} />,
                closable: true,
                metadata: {
                  type: 'truetl-logs',
                  truetlDatabaseId: db.id,
                },
              });
            },
          },
        ],
      };
    });

    const hohAddressChildren: AccordionItem[] = (hohAddressDatabases || []).map((db) => {
      const openDetails = async () => {
        const tabId = `hohaddress-db-${db.id}-details`;
        // Load full database info
        const fullDb = await apiService.getHohAddressDatabase(db.id);
        addTab({
          id: tabId,
          title: `${db.connection_name}.${db.database_name}`,
          icon: <FiEdit3 size={14} />,
          content: <HohAddressDetailsTab hohAddressDatabase={fullDb} />,
          closable: true,
          metadata: {
            type: 'hohaddress-database',
            hohAddressDatabaseId: db.id,
          },
        });
      };

      return {
        id: `hohaddress-db-${db.id}`,
        label: `${db.connection_name}.${db.database_name}`,
        icon: <FiDatabase size={14} />,
        onClick: openDetails, // Open Details when clicking on database itself
        children: [
          {
            id: `hohaddress-db-${db.id}-details`,
            label: 'Details',
            icon: <FiEdit3 size={12} />,
            isLeaf: true,
            onClick: openDetails,
          },
          {
            id: `hohaddress-db-${db.id}-logs`,
            label: 'Logs',
            icon: <FiFileText size={12} />,
            isLeaf: true,
            onClick: async () => {
              const tabId = `hohaddress-db-${db.id}-logs`;
              // Load full database info
              const fullDb = await apiService.getHohAddressDatabase(db.id);
              addTab({
                id: tabId,
                title: `${db.connection_name}.${db.database_name} - Logs`,
                icon: <FiEdit3 size={14} />,
                content: <HohAddressLogsTab hohAddressDatabase={fullDb} />,
                closable: true,
                metadata: {
                  type: 'hohaddress-logs',
                  hohAddressDatabaseId: db.id,
                },
              });
            },
          },
        ],
      };
    });

    navItems.push({
      id: 'nav-services',
      label: 'Services',
      icon: <FiSettings size={20} />,
      children: [
        {
          id: 'truetl',
          label: 'TruETL',
          icon: <FiZap size={14} />,
          children: truETLChildren,
          onClick: () => {
            const tabId = 'truetl';
            addTab({
              id: tabId,
              title: 'TruETL',
              icon: <FiZap size={14} />,
              content: <TruETLTab />,
              closable: true,
              metadata: {
                type: 'truetl',
              },
            });
          },
        },
        {
          id: 'hohaddress',
          label: 'HohAddress',
          icon: <FiEdit3 size={14} />,
          children: hohAddressChildren,
          onClick: () => {
            const tabId = 'hohaddress';
            addTab({
              id: tabId,
              title: 'HohAddress',
              icon: <FiEdit3 size={14} />,
              content: <HohAddressTab />,
              closable: true,
              metadata: {
                type: 'hohaddress',
              },
            });
          },
        },
      ],
    });

    // Users (only for admin)
    if (isAdmin) {
      navItems.push({
        id: 'nav-users',
        label: 'Users',
        icon: <FiShield size={20} />,
        isLeaf: true,
        onClick: () => {
          const tabId = 'users';
          addTab({
            id: tabId,
            title: 'Users',
            icon: <FiShield size={14} />,
            content: <UsersTab />,
            closable: true,
          });
        },
      });
    }

    return navItems;
  };

  return (
    <div className="sidebar">
      <div className="logo">
        <FiDatabase size={32} />
        TruAdmin
      </div>

      <div className="nav-section">
        {/* <div className="nav-section-title">Navigation</div> */}
        {loading ? (
          <div className="loading-text">Загрузка...</div>
        ) : error ? (
          <div className="error-text">{error}</div>
        ) : (
          <Accordion
            items={buildNavigationItems()}
            activePath={location.pathname}
            selectedRoleId={selectedRoleId}
            selectedItemId={activeMenuItemId}
            expandedItemsExternal={expandedConnections}
          />
        )}
      </div>
    </div>
  );
};

export default Sidebar;
