package models

import "time"

// Connection represents a database connection configuration
type Connection struct {
	ID        string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name      string    `gorm:"type:varchar(255);not null;uniqueIndex" json:"name"`
	Type      string    `gorm:"type:varchar(50);not null" json:"type"` // postgres, mysql, sqlite, etc.
	Host      string    `gorm:"type:varchar(255);not null" json:"host"`
	Port      int       `gorm:"not null" json:"port"`
	Database  string    `gorm:"type:varchar(255);not null" json:"database"`
	Username  string    `gorm:"type:varchar(255);not null" json:"username"`
	Password  string    `gorm:"type:text;not null" json:"password"` // In production, this should be encrypted
	SSLMode   string    `gorm:"type:varchar(50);default:'disable'" json:"ssl_mode"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// ConnectionRequest represents the request to create/update a connection
type ConnectionRequest struct {
	Name     string `json:"name" binding:"required"`
	Type     string `json:"type" binding:"required"`
	Host     string `json:"host" binding:"required"`
	Port     int    `json:"port" binding:"required"`
	Database string `json:"database" binding:"required"`
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	SSLMode  string `json:"ssl_mode"`
}

// QueryRequest represents the request to execute a SQL query
type QueryRequest struct {
	Query string `json:"query" binding:"required"`
}

// QueryResult represents the result of a SQL query execution
type QueryResult struct {
	Columns []string         `json:"columns"`
	Rows    []map[string]any `json:"rows"`
	Error   string           `json:"error,omitempty"`
}

// Table represents a database table
type Table struct {
	Name   string `json:"name"`
	Schema string `json:"schema,omitempty"`
	Rows   int64  `json:"rows,omitempty"`
	Size   string `json:"size,omitempty"`
}

// Column represents a table column
type Column struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Nullable bool   `json:"nullable"`
	Key      string `json:"key,omitempty"` // PRI, UNI, MUL, etc.
	Default  string `json:"default,omitempty"`
}

// Database represents a database in a connection
type Database struct {
	Name        string `json:"name"`
	Size        *int64 `json:"size,omitempty"`
	TablesCount *int   `json:"tables_count,omitempty"`
}

// Role represents a database role
type Role struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	Permissions []string  `json:"permissions"`
	Users       []string  `json:"users"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// RoleRequest represents the request to create/update a role
type RoleRequest struct {
	Name        string   `json:"name" binding:"required"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
	Users       []string `json:"users"`
}

// ActiveQuery represents an active query
type ActiveQuery struct {
	ID          string    `json:"id"`
	Query       string    `json:"query"`
	Duration    int       `json:"duration"` // in milliseconds
	User        string    `json:"user"`
	State       string    `json:"state"`
	StartTime   time.Time `json:"startTime"`
	Hostname    string    `json:"hostname"`
	BackendStart time.Time `json:"backendStart"`
	BackendType string    `json:"backendType"`
	WaitEvent   string    `json:"waitEvent"`
	BlockedBy   string    `json:"blockedBy"` // PID of blocking process
}

// Deadlock represents a deadlock event
type Deadlock struct {
	ID              string    `json:"id"`
	BlockedProcess  string    `json:"blockedProcess"`
	BlockingProcess string    `json:"blockingProcess"`
	Resource        string    `json:"resource"`
	Timestamp       time.Time `json:"timestamp"`
}

// Lock represents a database lock
type Lock struct {
	PID         string `json:"pid"`
	LockType    string `json:"lockType"`
	Database    string `json:"database"`
	Relation    string `json:"relation"`
	Mode        string `json:"mode"`
	Granted     bool   `json:"granted"`
	Query       string `json:"query"`
	WaitingFor  string `json:"waitingFor"`
	User        string `json:"user"`
	WaitStart   string `json:"waitStart"`
}

// RoleMembership represents role hierarchy (parent-child relationships)
type RoleMembership struct {
	RoleOID     string `json:"role_oid"`
	RoleName    string `json:"role_name"`
	MemberOID   string `json:"member_oid"`
	MemberName  string `json:"member_name"`
	AdminOption bool   `json:"admin_option"`
}

// Schema represents a database schema
type Schema struct {
	Name     string `json:"name"`
	Owner    string `json:"owner,omitempty"`
	Database string `json:"database"`
}

// DatabaseObject represents a database object (table, view, function, procedure)
type DatabaseObject struct {
	Name       string   `json:"name"`
	Schema     string   `json:"schema"`
	Type       string   `json:"type"` // table, view, function, procedure
	Owner      string   `json:"owner,omitempty"`
	Privileges []string `json:"privileges,omitempty"`
}

// RolePrivilege represents privileges a role has on database objects
type RolePrivilege struct {
	ObjectType     string   `json:"object_type"`   // database, schema, table, view, function, procedure
	ObjectSchema   string   `json:"object_schema,omitempty"`
	ObjectName     string   `json:"object_name"`
	ObjectDatabase string   `json:"object_database,omitempty"` // Database where the object resides (for schemas, tables, views, functions)
	Privileges     []string `json:"privileges"`
}

// DetailedRole represents extended role information
type DetailedRole struct {
	Role
	ParentRoles []RoleMembership `json:"parent_roles"`
	ChildRoles  []RoleMembership `json:"child_roles"`
	Privileges  []RolePrivilege  `json:"privileges"`
	Attributes  map[string]bool  `json:"attributes"`
}

// GrantRequest represents a request to grant privileges
type GrantRequest struct {
	ObjectType     string   `json:"object_type" binding:"required"` // database, schema, table, view, function, procedure
	ObjectSchema   string   `json:"object_schema"`
	ObjectName     string   `json:"object_name" binding:"required"`
	ObjectDatabase string   `json:"object_database"` // Database where the object resides (for tables, views, functions in specific DB)
	Privileges     []string `json:"privileges" binding:"required"`
}

// MembershipRequest represents a request to grant/revoke role membership
type MembershipRequest struct {
	MemberRoleOID string `json:"member_role_oid" binding:"required"` // OID of the role to add/remove as member
	AdminOption   bool   `json:"admin_option"`                       // Whether to grant WITH ADMIN OPTION
}

// QueryStatement represents a query from pg_stat_statements
type QueryStatement struct {
	QueryID         string    `json:"queryid"`
	Query           string    `json:"query"`
	Calls           int64     `json:"calls"`
	TotalExecTime   float64   `json:"total_exec_time"`
	MinExecTime     float64   `json:"min_exec_time"`
	MaxExecTime     float64   `json:"max_exec_time"`
	MeanExecTime    float64   `json:"mean_exec_time"`
	Rows            int64     `json:"rows"`
	Username        string    `json:"username"`
	DatabaseName    string    `json:"database_name"`
	SharedBlksHit   int64     `json:"shared_blks_hit"`
	SharedBlksRead  int64     `json:"shared_blks_read"`
	SharedBlksDirtied int64   `json:"shared_blks_dirtied"`
	TempBlksRead    int64     `json:"temp_blks_read"`
	TempBlksWritten int64     `json:"temp_blks_written"`
}

// TruETLDatabase represents a database configured for TruETL
type TruETLDatabase struct {
	ID           string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ConnectionID string    `gorm:"type:varchar(36);not null" json:"connection_id"`
	DatabaseName string    `gorm:"type:varchar(255);not null" json:"database_name"`
	DisplayName  string    `gorm:"type:varchar(255);not null" json:"display_name"` // Optional custom name
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// TruETLDatabaseRequest represents the request to add a TruETL database
type TruETLDatabaseRequest struct {
	ConnectionID string `json:"connection_id" binding:"required"`
	DatabaseName string `json:"database_name" binding:"required"`
	DisplayName  string `json:"display_name"`
}

// TruETLDatabaseWithConnection includes connection details
type TruETLDatabaseWithConnection struct {
	TruETLDatabase
	ConnectionName string `json:"connection_name"`
	ConnectionType string `json:"connection_type"`
}

// HohAddressDatabase represents a database configured for HohAddress
type HohAddressDatabase struct {
	ID           string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ConnectionID string    `gorm:"type:varchar(36);not null" json:"connection_id"`
	DatabaseName string    `gorm:"type:varchar(255);not null" json:"database_name"`
	DisplayName  string    `gorm:"type:varchar(255);not null" json:"display_name"` // Optional custom name
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// HohAddressDatabaseRequest represents the request to add a HohAddress database
type HohAddressDatabaseRequest struct {
	ConnectionID string `json:"connection_id" binding:"required"`
	DatabaseName string `json:"database_name" binding:"required"`
	DisplayName  string `json:"display_name"`
}

// HohAddressDatabaseWithConnection includes connection details
type HohAddressDatabaseWithConnection struct {
	HohAddressDatabase
	ConnectionName string `json:"connection_name"`
	ConnectionType string `json:"connection_type"`
}
