const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export interface Connection {
  id: string;
  name: string;
  type: 'postgres' | 'mysql' | 'sqlite' | 'mariadb' | 'mssql' | 'snowflake';
  host: string;
  port: number;
  username: string;
  password?: string;
  database?: string;
  ssl_mode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Database {
  name: string;
  size?: number;
  tablesCount?: number;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  users: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ActiveQuery {
  id: string;
  query: string;
  duration: number;
  user: string;
  state: string;
  startTime: string;
  hostname: string;
  backendStart: string;
  backendType: string;
  waitEvent: string;
  blockedBy: string;
}

export interface Deadlock {
  id: string;
  blockedProcess: string;
  blockingProcess: string;
  resource: string;
  timestamp: string;
}

export interface Lock {
  pid: string;
  lockType: string;
  database: string;
  relation: string;
  mode: string;
  granted: boolean;
  query: string;
  waitingFor: string;
  user: string;
  waitStart: string;
}

export interface RoleMembership {
  role_oid: string;
  role_name: string;
  member_oid: string;
  member_name: string;
  admin_option: boolean;
}

export interface Schema {
  name: string;
  owner?: string;
  database: string;
}

export interface DatabaseObject {
  name: string;
  schema: string;
  type: 'table' | 'view' | 'function' | 'procedure';
  owner?: string;
  privileges?: string[];
}

export interface RolePrivilege {
  object_type: string;
  object_schema?: string;
  object_name: string;
  object_database?: string;
  privileges: string[];
}

export interface DetailedRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  users: string[];
  createdAt: string;
  updatedAt: string;
  parent_roles: RoleMembership[];
  child_roles: RoleMembership[];
  privileges: RolePrivilege[];
  attributes: Record<string, boolean>;
}

export interface GrantRequest {
  object_type: string;
  object_schema?: string;
  object_name: string;
  object_database?: string;
  privileges: string[];
}

export interface MembershipRequest {
  member_role_oid: string;
  admin_option: boolean;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface QueryStatement {
  queryid: string;
  query: string;
  calls: number;
  total_exec_time: number;
  min_exec_time: number;
  max_exec_time: number;
  mean_exec_time: number;
  rows: number;
  username: string;
  database_name: string;
  shared_blks_hit: number;
  shared_blks_read: number;
  shared_blks_dirtied: number;
  temp_blks_read: number;
  temp_blks_written: number;
}

export interface TruETLDatabase {
  id: string;
  connection_id: string;
  database_name: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  connection_name?: string;
  connection_type?: string;
}

export interface AddressCheckStep {
  stepName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message: string;
  details: string;
  result: number; // 0 = error, 1 = success, -1 = not applicable
  stopProcess: boolean;
}

export interface AddressCheckResult {
  success: number; // 1 = OK, 0 = Error
  steps: AddressCheckStep[];
  finalMessage: string;
}

export interface HohAddressDatabase {
  id: string;
  connection_id: string;
  database_name: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  connection_name?: string;
  connection_type?: string;
}

export interface DatabaseStatus {
  connected: boolean;
  message: string;
  error?: string;
  connection_info?: {
    host: string;
    port: string;
    database: string;
    username: string;
    password: string;
  };
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        // Clear authentication data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login page if not already there
        if (window.location.pathname !== '/login' && window.location.pathname !== '/setup') {
          window.location.href = '/login';
        }
        
        throw new Error('Unauthorized: Please login again');
      }
      
      const errorText = await response.text();
      console.error('❌ API Error:', {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        hasToken: !!token,
        errorBody: errorText,
      });
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Connections
  async getConnections(): Promise<Connection[]> {
    return this.request<Connection[]>('/api/v1/connections');
  }

  async getConnection(connectionId: string): Promise<Connection> {
    return this.request<Connection>(`/api/v1/connections/${connectionId}`);
  }

  async createConnection(
    connection: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Connection> {
    return this.request<Connection>('/api/v1/connections', {
      method: 'POST',
      body: JSON.stringify(connection),
    });
  }

  async updateConnection(
    connectionId: string,
    connection: Partial<Connection>
  ): Promise<Connection> {
    return this.request<Connection>(`/api/v1/connections/${connectionId}`, {
      method: 'PUT',
      body: JSON.stringify(connection),
    });
  }

  async deleteConnection(connectionId: string): Promise<void> {
    return this.request<void>(`/api/v1/connections/${connectionId}`, {
      method: 'DELETE',
    });
  }

  async testConnection(connectionId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/api/v1/connections/${connectionId}/test`, {
      method: 'POST',
    });
  }

  // Databases
  async getDatabases(connectionId: string): Promise<Database[]> {
    return this.request<Database[]>(`/api/v1/connections/${connectionId}/databases`);
  }

  // Roles
  async getRoles(connectionId: string): Promise<Role[]> {
    return this.request<Role[]>(`/api/v1/connections/${connectionId}/roles`);
  }

  async getRole(connectionId: string, roleId: string): Promise<Role> {
    return this.request<Role>(`/api/v1/connections/${connectionId}/roles/${roleId}`);
  }

  async createRole(
    connectionId: string,
    role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Role> {
    return this.request<Role>(`/api/v1/connections/${connectionId}/roles`, {
      method: 'POST',
      body: JSON.stringify(role),
    });
  }

  async updateRole(connectionId: string, roleId: string, role: Partial<Role>): Promise<Role> {
    return this.request<Role>(`/api/v1/connections/${connectionId}/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(role),
    });
  }

  async deleteRole(connectionId: string, roleId: string): Promise<void> {
    return this.request<void>(`/api/v1/connections/${connectionId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  }

  // Detailed role info
  async getDetailedRole(connectionId: string, roleId: string): Promise<DetailedRole> {
    return this.request<DetailedRole>(
      `/api/v1/connections/${connectionId}/roles/${roleId}/details`
    );
  }

  async getRoleMembership(
    connectionId: string,
    roleId: string
  ): Promise<{ parent_roles: RoleMembership[]; child_roles: RoleMembership[] }> {
    return this.request<{ parent_roles: RoleMembership[]; child_roles: RoleMembership[] }>(
      `/api/v1/connections/${connectionId}/roles/${roleId}/membership`
    );
  }

  async getRolePrivileges(connectionId: string, roleId: string): Promise<RolePrivilege[]> {
    return this.request<RolePrivilege[]>(
      `/api/v1/connections/${connectionId}/roles/${roleId}/privileges`
    );
  }

  // Database objects
  async getSchemas(connectionId: string, dbName: string): Promise<Schema[]> {
    return this.request<Schema[]>(
      `/api/v1/connections/${connectionId}/databases/${dbName}/schemas`
    );
  }

  async getTablesInSchema(
    connectionId: string,
    dbName: string,
    schemaName: string
  ): Promise<DatabaseObject[]> {
    return this.request<DatabaseObject[]>(
      `/api/v1/connections/${connectionId}/databases/${dbName}/schemas/${schemaName}/tables`
    );
  }

  async getViewsInSchema(
    connectionId: string,
    dbName: string,
    schemaName: string
  ): Promise<DatabaseObject[]> {
    return this.request<DatabaseObject[]>(
      `/api/v1/connections/${connectionId}/databases/${dbName}/schemas/${schemaName}/views`
    );
  }

  async getFunctionsInSchema(
    connectionId: string,
    dbName: string,
    schemaName: string
  ): Promise<DatabaseObject[]> {
    return this.request<DatabaseObject[]>(
      `/api/v1/connections/${connectionId}/databases/${dbName}/schemas/${schemaName}/functions`
    );
  }

  // Grant/Revoke privileges
  async grantPrivileges(
    connectionId: string,
    roleId: string,
    request: GrantRequest
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/api/v1/connections/${connectionId}/roles/${roleId}/grant`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  async revokePrivileges(
    connectionId: string,
    roleId: string,
    request: GrantRequest
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/api/v1/connections/${connectionId}/roles/${roleId}/revoke`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  // Grant/Revoke membership
  async grantMembership(
    connectionId: string,
    roleId: string,
    request: MembershipRequest
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/api/v1/connections/${connectionId}/roles/${roleId}/grant-membership`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  async revokeMembership(
    connectionId: string,
    roleId: string,
    request: MembershipRequest
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/api/v1/connections/${connectionId}/roles/${roleId}/revoke-membership`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  // Monitoring
  async getActiveQueries(connectionId: string, dbName: string, onlyActive: boolean = true): Promise<ActiveQuery[]> {
    const params = `?only_active=${onlyActive}`;
    return this.request<ActiveQuery[]>(
      `/api/v1/connections/${connectionId}/databases/${dbName}/active-queries${params}`
    );
  }

  async getDeadlocks(connectionId: string, dbName: string): Promise<Deadlock[]> {
    return this.request<Deadlock[]>(
      `/api/v1/connections/${connectionId}/databases/${dbName}/deadlocks`
    );
  }

  async getLocks(connectionId: string, dbName: string, showSystem: boolean = false): Promise<Lock[]> {
    const params = showSystem ? '?show_system=true' : '';
    return this.request<Lock[]>(
      `/api/v1/connections/${connectionId}/databases/${dbName}/locks${params}`
    );
  }

  async terminateQueries(connectionId: string, dbName: string, pids: string[]): Promise<{ terminated: number }> {
    return this.request<{ terminated: number }>(
      `/api/v1/connections/${connectionId}/databases/${dbName}/terminate-queries`,
      {
        method: 'POST',
        body: JSON.stringify({ pids }),
      }
    );
  }

  async getQueryHistory(connectionId: string, dbName: string): Promise<QueryStatement[]> {
    return this.request<QueryStatement[]>(
      `/api/v1/connections/${connectionId}/databases/${dbName}/query-history`
    );
  }

  // Query
  async executeQuery(connectionId: string, query: string): Promise<any> {
    return this.request<any>(`/api/v1/connections/${connectionId}/query`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  // Users (admin only)
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/api/v1/users');
  }

  async createUser(username: string, password: string, role: 'admin' | 'user'): Promise<User> {
    return this.request<User>('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
  }

  async deleteUser(userId: string): Promise<void> {
    return this.request<void>(`/api/v1/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async changeUserPassword(userId: string, newPassword: string): Promise<void> {
    return this.request<void>(`/api/v1/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ new_password: newPassword }),
    });
  }

  async toggleBlockUser(userId: string, isBlocked: boolean): Promise<void> {
    return this.request<void>(`/api/v1/users/${userId}/block`, {
      method: 'PUT',
      body: JSON.stringify({ is_blocked: isBlocked }),
    });
  }

  async changeOwnPassword(oldPassword: string, newPassword: string): Promise<void> {
    return this.request<void>('/api/v1/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
  }

  // TruETL
  async getEligibleDatabases(connectionId: string): Promise<Database[]> {
    return this.request<Database[]>(`/api/v1/truetl/eligible-databases/${connectionId}`);
  }

  async addTruETLDatabase(connectionId: string, databaseName: string, displayName?: string): Promise<TruETLDatabase> {
    return this.request<TruETLDatabase>('/api/v1/truetl/databases', {
      method: 'POST',
      body: JSON.stringify({ connection_id: connectionId, database_name: databaseName, display_name: displayName }),
    });
  }

  async getTruETLDatabases(): Promise<TruETLDatabase[]> {
    return this.request<TruETLDatabase[]>('/api/v1/truetl/databases');
  }

  async getTruETLDatabase(id: string): Promise<TruETLDatabase> {
    return this.request<TruETLDatabase>(`/api/v1/truetl/databases/${id}`);
  }

  async updateTruETLDatabase(id: string, connectionId: string, databaseName: string, displayName?: string): Promise<TruETLDatabase> {
    return this.request<TruETLDatabase>(`/api/v1/truetl/databases/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ connection_id: connectionId, database_name: databaseName, display_name: displayName }),
    });
  }

  async deleteTruETLDatabase(id: string): Promise<void> {
    return this.request<void>(`/api/v1/truetl/databases/${id}`, {
      method: 'DELETE',
    });
  }

  async getTruETLDMSTables(truetlDatabaseId: string): Promise<any[]> {
    const result = await this.request<{ tables: any[] }>(`/api/v1/truetl/databases/${truetlDatabaseId}/tables`);
    return result.tables || [];
  }

  async getTruETLDMSFields(truetlDatabaseId: string, tableIds: number[]): Promise<any[]> {
    const result = await this.request<{ fields: any[] }>(`/api/v1/truetl/databases/${truetlDatabaseId}/fields`, {
      method: 'POST',
      body: JSON.stringify({ table_ids: tableIds }),
    });
    return result.fields || [];
  }

  async saveTruETLDMSFields(
    truetlDatabaseId: string,
    tableKey: string,
    changes: any[]
  ): Promise<void> {
    await this.request<void>(`/api/v1/truetl/databases/${truetlDatabaseId}/fields`, {
      method: 'PUT',
      body: JSON.stringify({
        table_key: tableKey,
        changes: changes,
      }),
    });
  }

  async saveAllTruETLChanges(
    truetlDatabaseId: string,
    changes: any
  ): Promise<void> {
    await this.request<void>(`/api/v1/truetl/databases/${truetlDatabaseId}/save-all`, {
      method: 'PUT',
      body: JSON.stringify(changes),
    });
  }

  async getTruETLSaveLogs(truetlDatabaseId: string, limit?: number): Promise<any[]> {
    let url = `/api/v1/truetl/databases/${truetlDatabaseId}/logs`;
    if (limit) {
      url += `?limit=${limit}`;
    }
    const result = await this.request<{ logs: any[] }>(url);
    return result.logs || [];
  }

  // HohAddress
  async getHohAddressEligibleDatabases(connectionId: string): Promise<Database[]> {
    return this.request<Database[]>(`/api/v1/hohaddress/eligible-databases/${connectionId}`);
  }

  async addHohAddressDatabase(connectionId: string, databaseName: string, displayName?: string): Promise<HohAddressDatabase> {
    return this.request<HohAddressDatabase>('/api/v1/hohaddress/databases', {
      method: 'POST',
      body: JSON.stringify({ connection_id: connectionId, database_name: databaseName, display_name: displayName }),
    });
  }

  async getHohAddressDatabases(): Promise<HohAddressDatabase[]> {
    return this.request<HohAddressDatabase[]>('/api/v1/hohaddress/databases');
  }

  async getHohAddressDatabase(id: string): Promise<HohAddressDatabase> {
    return this.request<HohAddressDatabase>(`/api/v1/hohaddress/databases/${id}`);
  }

  async updateHohAddressDatabase(id: string, connectionId: string, databaseName: string, displayName?: string): Promise<HohAddressDatabase> {
    return this.request<HohAddressDatabase>(`/api/v1/hohaddress/databases/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ connection_id: connectionId, database_name: databaseName, display_name: displayName }),
    });
  }

  async deleteHohAddressDatabase(id: string): Promise<void> {
    return this.request<void>(`/api/v1/hohaddress/databases/${id}`, {
      method: 'DELETE',
    });
  }

  // HohAddress table operations
  async getHohAddressTableColumns(id: string, tableName: string): Promise<string[]> {
    const result = await this.request<{ columns: string[] }>(`/api/v1/hohaddress/databases/${id}/tables/${tableName}/columns`);
    return result.columns;
  }

  async getHohAddressStatusList(
    id: string,
    filters?: Record<string, string>,
    limit?: number,
    offset?: number,
    where?: string
  ): Promise<{ data: Record<string, any>[]; totalCount: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    if (where) {
      params.append('where', where);
    }
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const query = params.toString();
    return this.request<{ data: Record<string, any>[]; totalCount: number }>(
      `/api/v1/hohaddress/databases/${id}/statuslist${query ? `?${query}` : ''}`
    );
  }

  async getHohAddressBlacklist(
    id: string,
    filters?: Record<string, string>,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
    limit?: number,
    offset?: number,
    where?: string
  ): Promise<{ data: Record<string, any>[]; totalCount: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    if (where) {
      params.append('where', where);
    }
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const query = params.toString();
    return this.request<{ data: Record<string, any>[]; totalCount: number }>(
      `/api/v1/hohaddress/databases/${id}/blacklist${query ? `?${query}` : ''}`
    );
  }

  async createHohAddressBlacklistRow(id: string, data: Record<string, any>): Promise<Record<string, any>> {
    return this.request<Record<string, any>>(`/api/v1/hohaddress/databases/${id}/blacklist`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateHohAddressBlacklistRow(id: string, rowId: string, data: Record<string, any>): Promise<Record<string, any>> {
    return this.request<Record<string, any>>(`/api/v1/hohaddress/databases/${id}/blacklist/${rowId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteHohAddressBlacklistRow(id: string, rowId: string): Promise<void> {
    return this.request<void>(`/api/v1/hohaddress/databases/${id}/blacklist/${rowId}`, {
      method: 'DELETE',
    });
  }

  async getHohAddressWhitelist(
    id: string,
    filters?: Record<string, string>,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
    limit?: number,
    offset?: number,
    where?: string
  ): Promise<{ data: Record<string, any>[]; totalCount: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    if (where) {
      params.append('where', where);
    }
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const query = params.toString();
    return this.request<{ data: Record<string, any>[]; totalCount: number }>(
      `/api/v1/hohaddress/databases/${id}/whitelist${query ? `?${query}` : ''}`
    );
  }

  async createHohAddressWhitelistRow(id: string, data: Record<string, any>): Promise<Record<string, any>> {
    return this.request<Record<string, any>>(`/api/v1/hohaddress/databases/${id}/whitelist`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateHohAddressWhitelistRow(id: string, rowId: string, data: Record<string, any>): Promise<Record<string, any>> {
    return this.request<Record<string, any>>(`/api/v1/hohaddress/databases/${id}/whitelist/${rowId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteHohAddressWhitelistRow(id: string, rowId: string): Promise<void> {
    return this.request<void>(`/api/v1/hohaddress/databases/${id}/whitelist/${rowId}`, {
      method: 'DELETE',
    });
  }

  // Address check
  async checkHohAddressStatus(
    id: string,
    address1: string,
    address2: string,
    city: string,
    state: string,
    zip: string,
    programType: string
  ): Promise<AddressCheckResult> {
    return this.request<AddressCheckResult>(`/api/v1/hohaddress/databases/${id}/check-address`, {
      method: 'POST',
      body: JSON.stringify({
        address1,
        address2,
        city,
        state,
        zip,
        programType,
      }),
    });
  }

  // Database status check
  async getDatabaseStatus(): Promise<DatabaseStatus> {
    return this.request<DatabaseStatus>('/api/v1/database/status');
  }
}

export const apiService = new ApiService();
