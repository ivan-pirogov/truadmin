import React, { useState, useEffect } from 'react';
import { FiLock } from 'react-icons/fi';
import {
  apiService,
  Database,
  Schema,
  DatabaseObject,
  RolePrivilege,
  Connection,
} from '../../services/api';

interface RolePrivilegesSectionProps {
  connectionId: string;
  roleId: string;
  currentPrivileges: RolePrivilege[];
  onPrivilegeToggle: (
    objectName: string,
    objectSchema: string,
    objectType: string,
    privilege: string,
    currentlyHas: boolean,
    objectDatabase?: string
  ) => void;
}

const RolePrivilegesSection: React.FC<RolePrivilegesSectionProps> = ({
  connectionId,
  roleId,
  currentPrivileges,
  onPrivilegeToggle,
}) => {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [tables, setTables] = useState<DatabaseObject[]>([]);
  const [views, setViews] = useState<DatabaseObject[]>([]);
  const [functions, setFunctions] = useState<DatabaseObject[]>([]);
  const [loading, setLoading] = useState(false);

  const tablePrivileges = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
  const viewPrivileges = ['SELECT'];
  const functionPrivileges = ['EXECUTE'];

  const databasePrivileges = ['CONNECT', 'CREATE'];
  const schemaPrivileges = ['USAGE', 'CREATE'];

  const hasDatabasePrivilege = (dbName: string, privilege: string): boolean => {
    const priv = currentPrivileges.find(
      p => p.object_type === 'database' && p.object_name === dbName
    );
    return priv ? priv.privileges.includes(privilege) : false;
  };

  const hasSchemaPrivilege = (schemaName: string, privilege: string): boolean => {
    const priv = currentPrivileges.find(
      p => p.object_type === 'schema' && p.object_name === schemaName
    );
    return priv ? priv.privileges.includes(privilege) : false;
  };


  const loadConnection = async () => {
    try {
      const data = await apiService.getConnection(connectionId);
      setConnection(data);
    } catch (err) {
      console.error('Error loading connection:', err);
    }
  };

  const loadDatabases = async () => {
    try {
      const data = await apiService.getDatabases(connectionId);
      setDatabases(data);
    } catch (err) {
      console.error('Error loading databases:', err);
    }
  };

  useEffect(() => {
    loadConnection();
    loadDatabases();
  }, [connectionId]);

  useEffect(() => {
    if (selectedDatabase) {
      loadSchemas();
    } else {
      setSchemas([]);
      setSelectedSchema('');
    }
  }, [selectedDatabase]);

  useEffect(() => {
    if (selectedDatabase && selectedSchema) {
      loadObjects();
    } else {
      setTables([]);
      setViews([]);
      setFunctions([]);
    }
  }, [selectedDatabase, selectedSchema]);

  const loadSchemas = async () => {
    if (!selectedDatabase) return;

    try {
      const data = await apiService.getSchemas(connectionId, selectedDatabase);
      setSchemas(data);
    } catch (err) {
      console.error('Error loading schemas:', err);
    }
  };

  const loadObjects = async () => {
    if (!selectedDatabase || !selectedSchema) return;

    try {
      setLoading(true);
      const [tablesData, viewsData, functionsData] = await Promise.all([
        apiService.getTablesInSchema(connectionId, selectedDatabase, selectedSchema),
        apiService.getViewsInSchema(connectionId, selectedDatabase, selectedSchema),
        apiService.getFunctionsInSchema(connectionId, selectedDatabase, selectedSchema),
      ]);
      setTables(tablesData);
      setViews(viewsData);
      setFunctions(functionsData);
    } catch (err) {
      console.error(`Error loading objects for ${selectedDatabase}.${selectedSchema}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const hasPrivilege = (objectName: string, objectSchema: string, privilege: string): boolean => {
    const priv = currentPrivileges.find(
      (p) => p.object_name === objectName && p.object_schema === objectSchema
    );
    return priv ? priv.privileges.includes(privilege) : false;
  };

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-header-icon">
          <FiLock size={20} />
        </div>
        <h2>Privileges</h2>
      </div>
      <div className="section-content">
        <div className="privileges-content">
          <div className="privileges-selectors">
            <div className="database-table-container">
              <h3>Databases {connection?.name && `(${connection.name})`}</h3>
            <table className="database-privileges-table">
              <thead>
                <tr>
                  <th>Database</th>
                  <th>Privileges</th>
                </tr>
              </thead>
              <tbody>
                {databases.map((db) => (
                  <tr
                    key={db.name}
                    onClick={() => setSelectedDatabase(db.name)}
                    className={selectedDatabase === db.name ? 'selected' : ''}
                  >
                    <td className="database-name">{db.name}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="database-privileges">
                        {databasePrivileges.map((priv) => {
                          const hasPriv = hasDatabasePrivilege(db.name, priv);
                          return (
                            <div key={priv} className="privilege-checkbox">
                              <input
                                type="checkbox"
                                id={`${db.name}-${priv}`}
                                checked={hasPriv}
                                onChange={() => onPrivilegeToggle(db.name, '', 'database', priv, hasPriv, undefined)}
                              />
                              <label htmlFor={`${db.name}-${priv}`}>{priv}</label>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="database-table-container">
            <h3>Schemas {selectedDatabase && `(${selectedDatabase})`}</h3>
            <table className="database-privileges-table">
              <thead>
                <tr>
                  <th>Schema</th>
                  <th>Privileges</th>
                </tr>
              </thead>
              <tbody>
                {schemas.map((schema) => (
                  <tr
                    key={schema.name}
                    onClick={() => setSelectedSchema(schema.name)}
                    className={selectedSchema === schema.name ? 'selected' : ''}
                  >
                    <td className="database-name">{schema.name}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="database-privileges">
                        {schemaPrivileges.map((priv) => {
                          const hasPriv = hasSchemaPrivilege(schema.name, priv);
                          return (
                            <div key={priv} className="privilege-checkbox">
                              <input
                                type="checkbox"
                                id={`${schema.name}-${priv}`}
                                checked={hasPriv}
                                onChange={() => onPrivilegeToggle(schema.name, '', 'schema', priv, hasPriv, selectedDatabase)}
                              />
                              <label htmlFor={`${schema.name}-${priv}`}>{priv}</label>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>

          <div className="objects-container">
            {loading && <div className="loading-message">Loading objects...</div>}

            <div className="objects-section">
              <div className="database-table-container">
                <h3>Tables {selectedSchema && `(${selectedSchema})`}</h3>
                <table className="database-privileges-table">
                  <thead>
                    <tr>
                      <th>Object Name</th>
                      <th>Privileges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((table) => (
                      <tr key={table.name}>
                        <td className="database-name">{table.name}</td>
                        <td>
                          <div className="database-privileges">
                            {tablePrivileges.map((priv) => {
                              const hasPriv = hasPrivilege(table.name, table.schema, priv);
                              return (
                                <div key={priv} className="privilege-checkbox">
                                  <input
                                    type="checkbox"
                                    id={`${table.name}-${priv}`}
                                    checked={hasPriv}
                                    onChange={() =>
                                      onPrivilegeToggle(
                                        table.name,
                                        table.schema,
                                        'table',
                                        priv,
                                        hasPriv,
                                        selectedDatabase
                                      )
                                    }
                                  />
                                  <label htmlFor={`${table.name}-${priv}`}>{priv}</label>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="database-table-container" style={{ marginTop: 'var(--spacing-2xl)' }}>
                <h3>Views {selectedSchema && `(${selectedSchema})`}</h3>
                <table className="database-privileges-table">
                  <thead>
                    <tr>
                      <th>Object Name</th>
                      <th>Privileges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {views.map((view) => (
                      <tr key={view.name}>
                        <td className="database-name">{view.name}</td>
                        <td>
                          <div className="database-privileges">
                            {viewPrivileges.map((priv) => {
                              const hasPriv = hasPrivilege(view.name, view.schema, priv);
                              return (
                                <div key={priv} className="privilege-checkbox">
                                  <input
                                    type="checkbox"
                                    id={`${view.name}-${priv}`}
                                    checked={hasPriv}
                                    onChange={() =>
                                      onPrivilegeToggle(
                                        view.name,
                                        view.schema,
                                        'view',
                                        priv,
                                        hasPriv,
                                        selectedDatabase
                                      )
                                    }
                                  />
                                  <label htmlFor={`${view.name}-${priv}`}>{priv}</label>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="database-table-container" style={{ marginTop: 'var(--spacing-2xl)' }}>
                <h3>Functions & Procedures {selectedSchema && `(${selectedSchema})`}</h3>
                <table className="database-privileges-table">
                  <thead>
                    <tr>
                      <th>Object Name</th>
                      <th>Privileges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {functions.map((func) => (
                      <tr key={func.name}>
                        <td className="database-name">
                          {func.name} <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>({func.type})</span>
                        </td>
                        <td>
                          <div className="database-privileges">
                            {functionPrivileges.map((priv) => {
                              const hasPriv = hasPrivilege(func.name, func.schema, priv);
                              return (
                                <div key={priv} className="privilege-checkbox">
                                  <input
                                    type="checkbox"
                                    id={`${func.name}-${priv}`}
                                    checked={hasPriv}
                                    onChange={() =>
                                      onPrivilegeToggle(
                                        func.name,
                                        func.schema,
                                        func.type,
                                        priv,
                                        hasPriv,
                                        selectedDatabase
                                      )
                                    }
                                  />
                                  <label htmlFor={`${func.name}-${priv}`}>{priv}</label>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolePrivilegesSection;
