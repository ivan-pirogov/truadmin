package services

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/lib/pq"
	"truadmin/internal/models"
)

// DatabaseService handles business logic for database operations
type DatabaseService struct {
	connectionService *ConnectionService
}

// NewDatabaseService creates a new database service
func NewDatabaseService(connService *ConnectionService) *DatabaseService {
	return &DatabaseService{
		connectionService: connService,
	}
}

// connectToDatabase creates a connection to the specified database
func (s *DatabaseService) connectToDatabase(connectionID string) (*sql.DB, error) {
	// Get connection details
	conn, err := s.connectionService.GetConnection(connectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection: %w", err)
	}

	// Build connection string
	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		conn.Host,
		conn.Port,
		conn.Username,
		conn.Password,
		conn.Database,
		conn.SSLMode,
	)

	// Open database connection
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

// connectToSpecificDatabase creates a connection to a specific database
func (s *DatabaseService) connectToSpecificDatabase(connectionID, dbName string) (*sql.DB, error) {
	// Get connection details
	conn, err := s.connectionService.GetConnection(connectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection: %w", err)
	}

	// Build connection string with specific database
	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		conn.Host,
		conn.Port,
		conn.Username,
		conn.Password,
		dbName,
		conn.SSLMode,
	)

	// Open database connection
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

// GetDatabases retrieves all databases for a connection
func (s *DatabaseService) GetDatabases(connectionID string) ([]*models.Database, error) {
	db, err := s.connectToDatabase(connectionID)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	query := `
		SELECT
			datname as name,
			pg_database_size(datname) as size
		FROM pg_database
		WHERE datistemplate = false
		ORDER BY datname
	`

	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query databases: %w", err)
	}
	defer rows.Close()

	var databases []*models.Database
	for rows.Next() {
		var dbModel models.Database
		var size int64

		err := rows.Scan(&dbModel.Name, &size)
		if err != nil {
			return nil, fmt.Errorf("failed to scan database: %w", err)
		}

		dbModel.Size = &size
		// TableCount can be populated later if needed
		databases = append(databases, &dbModel)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating databases: %w", err)
	}

	return databases, nil
}

// GetRoles retrieves all roles for a connection (both login roles and groups)
func (s *DatabaseService) GetRoles(connectionID string) ([]*models.Role, error) {
	db, err := s.connectToDatabase(connectionID)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	query := `
		SELECT
			r.oid::text as id,
			r.rolname as name,
			CASE
				WHEN r.rolsuper THEN 'Superuser'
				WHEN r.rolcanlogin AND NOT r.rolinherit THEN 'Login role (no inherit)'
				WHEN r.rolcanlogin THEN 'Login role'
				ELSE 'Group role'
			END as description,
			r.rolcanlogin,
			r.rolsuper,
			r.rolcreaterole,
			r.rolcreatedb,
			r.rolinherit,
			r.rolreplication
		FROM pg_roles r
		ORDER BY
			CASE
				WHEN r.rolcanlogin THEN 1
				ELSE 2
			END,
			r.rolname
	`

	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query roles: %w", err)
	}
	defer rows.Close()

	var roles []*models.Role
	for rows.Next() {
		var role models.Role
		var canLogin, isSuper, canCreateRole, canCreateDB, inherit, replication bool

		err := rows.Scan(
			&role.ID,
			&role.Name,
			&role.Description,
			&canLogin,
			&isSuper,
			&canCreateRole,
			&canCreateDB,
			&inherit,
			&replication,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan role: %w", err)
		}

		// Build permissions list
		var permissions []string
		if isSuper {
			permissions = append(permissions, "SUPERUSER")
		}
		if canCreateRole {
			permissions = append(permissions, "CREATEROLE")
		}
		if canCreateDB {
			permissions = append(permissions, "CREATEDB")
		}
		if inherit {
			permissions = append(permissions, "INHERIT")
		}
		if replication {
			permissions = append(permissions, "REPLICATION")
		}
		if canLogin {
			permissions = append(permissions, "LOGIN")
		}

		role.Permissions = permissions
		role.Users = []string{} // Will be populated separately if needed
		role.CreatedAt = time.Now()
		role.UpdatedAt = time.Now()

		roles = append(roles, &role)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating roles: %w", err)
	}

	return roles, nil
}

// GetRole retrieves a specific role by ID
func (s *DatabaseService) GetRole(connectionID, roleID string) (*models.Role, error) {
	// TODO: Implement actual database query to get role
	roles, err := s.GetRoles(connectionID)
	if err != nil {
		return nil, err
	}

	for _, role := range roles {
		if role.ID == roleID {
			return role, nil
		}
	}

	return nil, fmt.Errorf("role not found")
}

// CreateRole creates a new role
func (s *DatabaseService) CreateRole(connectionID string, req *models.RoleRequest) (*models.Role, error) {
	// TODO: Implement actual database query to create role
	now := time.Now()
	role := &models.Role{
		ID:          fmt.Sprintf("role-%d", now.Unix()),
		Name:        req.Name,
		Description: req.Description,
		Permissions: req.Permissions,
		Users:       req.Users,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	return role, nil
}

// UpdateRole updates an existing role
func (s *DatabaseService) UpdateRole(connectionID, roleID string, req *models.RoleRequest) (*models.Role, error) {
	// TODO: Implement actual database query to update role
	now := time.Now()
	role := &models.Role{
		ID:          roleID,
		Name:        req.Name,
		Description: req.Description,
		Permissions: req.Permissions,
		Users:       req.Users,
		CreatedAt:   now.Add(-24 * time.Hour),
		UpdatedAt:   now,
	}
	return role, nil
}

// DeleteRole deletes a role
func (s *DatabaseService) DeleteRole(connectionID, roleID string) error {
	// TODO: Implement actual database query to delete role
	return nil
}

// GetActiveQueries retrieves all active queries for a database
func (s *DatabaseService) GetActiveQueries(connectionID, dbName string, onlyActive bool) ([]*models.ActiveQuery, error) {
	db, err := s.connectToSpecificDatabase(connectionID, dbName)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	stateFilter := ""
	if onlyActive {
		stateFilter = "AND state != 'idle'"
	}

	query := fmt.Sprintf(`
		SELECT
			pid,
			COALESCE(usename, '') as user,
			COALESCE(state, '') as state,
			COALESCE(query, '') as query,
			COALESCE(EXTRACT(EPOCH FROM (NOW() - query_start))::int, 0) as duration_seconds,
			COALESCE(query_start, NOW()) as start_time,
			COALESCE(client_addr::text, client_hostname, 'local') as hostname,
			COALESCE(backend_start, NOW()) as backend_start,
			COALESCE(backend_type, '') as backend_type,
			COALESCE(wait_event_type || ': ' || wait_event, '') as wait_event,
			COALESCE(
				CASE
					WHEN cardinality(pg_blocking_pids(pid)) > 0
					THEN array_to_string(pg_blocking_pids(pid), ',')
					ELSE ''
				END,
			'') as blocked_by
		FROM pg_stat_activity
		WHERE datname = $1
			%s
			AND pid != pg_backend_pid()
			AND query NOT LIKE '%%pg_stat_activity%%'
			AND query NOT LIKE '%%pg_locks%%'
			AND query NOT LIKE '%%FROM information_schema%%'
		ORDER BY query_start DESC
	`, stateFilter)

	rows, err := db.Query(query, dbName)
	if err != nil {
		return nil, fmt.Errorf("failed to get active queries: %w", err)
	}
	defer rows.Close()

	queries := make([]*models.ActiveQuery, 0)
	for rows.Next() {
		var q models.ActiveQuery
		var pid int
		var durationSeconds int

		if err := rows.Scan(&pid, &q.User, &q.State, &q.Query, &durationSeconds, &q.StartTime, &q.Hostname, &q.BackendStart, &q.BackendType, &q.WaitEvent, &q.BlockedBy); err != nil {
			return nil, fmt.Errorf("failed to scan query row: %w", err)
		}

		q.ID = fmt.Sprintf("%d", pid)
		q.Duration = durationSeconds * 1000 // Convert to milliseconds

		queries = append(queries, &q)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating query rows: %w", err)
	}

	return queries, nil
}

// GetDeadlocks retrieves blocking queries that could lead to deadlocks
func (s *DatabaseService) GetDeadlocks(connectionID, dbName string) ([]*models.Deadlock, error) {
	db, err := s.connectToSpecificDatabase(connectionID, dbName)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	query := `
		SELECT DISTINCT
			blocked.pid AS blocked_pid,
			COALESCE(blocked.query, '') AS blocked_query,
			blocking.pid AS blocking_pid,
			COALESCE(blocking.query, '') AS blocking_query,
			COALESCE(bl.relation::regclass::text, 'transaction') AS locked_resource,
			NOW() AS detected_at
		FROM pg_stat_activity blocked
		JOIN pg_locks bl ON bl.pid = blocked.pid AND NOT bl.granted
		JOIN pg_locks kl ON kl.locktype = bl.locktype
			AND kl.database IS NOT DISTINCT FROM bl.database
			AND kl.relation IS NOT DISTINCT FROM bl.relation
			AND kl.page IS NOT DISTINCT FROM bl.page
			AND kl.tuple IS NOT DISTINCT FROM bl.tuple
			AND kl.virtualxid IS NOT DISTINCT FROM bl.virtualxid
			AND kl.transactionid IS NOT DISTINCT FROM bl.transactionid
			AND kl.classid IS NOT DISTINCT FROM bl.classid
			AND kl.objid IS NOT DISTINCT FROM bl.objid
			AND kl.objsubid IS NOT DISTINCT FROM bl.objsubid
			AND kl.pid != bl.pid
			AND kl.granted
		JOIN pg_stat_activity blocking ON blocking.pid = kl.pid
		WHERE blocked.datname = $1
			AND blocked.pid != pg_backend_pid()
	`

	rows, err := db.Query(query, dbName)
	if err != nil {
		return nil, fmt.Errorf("failed to get deadlocks: %w", err)
	}
	defer rows.Close()

	deadlocks := make([]*models.Deadlock, 0)
	for rows.Next() {
		var d models.Deadlock
		var blockedPID, blockingPID int
		var blockedQuery, blockingQuery, resource string
		var detectedAt time.Time

		if err := rows.Scan(&blockedPID, &blockedQuery, &blockingPID, &blockingQuery, &resource, &detectedAt); err != nil {
			return nil, fmt.Errorf("failed to scan deadlock row: %w", err)
		}

		d.ID = fmt.Sprintf("%d-%d", blockedPID, blockingPID)
		d.BlockedProcess = fmt.Sprintf("PID %d: %s", blockedPID, blockedQuery)
		d.BlockingProcess = fmt.Sprintf("PID %d: %s", blockingPID, blockingQuery)
		d.Resource = resource
		d.Timestamp = detectedAt

		deadlocks = append(deadlocks, &d)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating deadlock rows: %w", err)
	}

	return deadlocks, nil
}

// GetLocks retrieves all active locks in the database
func (s *DatabaseService) GetLocks(connectionID, dbName string, showSystem bool) ([]*models.Lock, error) {
	db, err := s.connectToSpecificDatabase(connectionID, dbName)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	// Build condition for filtering system locks
	systemFilter := ""
	if !showSystem {
		systemFilter = `
			AND (
				l.locktype NOT IN ('relation', 'extend', 'page')
				OR n.nspname IS NULL
				OR n.nspname NOT IN ('pg_catalog', 'information_schema')
			)
		`
	}

	query := fmt.Sprintf(`
		SELECT
			l.pid,
			COALESCE(a.usename, '') AS username,
			COALESCE(c.relname, l.locktype) AS object_name,
			l.mode,
			l.locktype,
			l.granted,
			CASE
				WHEN array_length(pg_blocking_pids(l.pid), 1) > 0
				THEN array_to_string(pg_blocking_pids(l.pid), ', ')
				ELSE ''
			END AS blocking_pids,
			CASE
				WHEN a.query IS NULL OR a.query = '' THEN '<idle>'
				ELSE a.query
			END AS query,
			CASE
				WHEN NOT l.granted AND l.waitstart IS NOT NULL
				THEN to_char(l.waitstart, 'YYYY-MM-DD HH24:MI:SS')
				ELSE ''
			END AS waitstart
		FROM pg_locks l
		JOIN pg_stat_activity a ON l.pid = a.pid
		LEFT JOIN pg_class c ON l.relation = c.oid
		LEFT JOIN pg_namespace n ON c.relnamespace = n.oid
		WHERE a.datname = $1
			AND l.pid <> pg_backend_pid()
			%s
		ORDER BY l.granted, l.pid
		LIMIT 50
	`, systemFilter)

	rows, err := db.Query(query, dbName)
	if err != nil {
		return nil, fmt.Errorf("failed to get locks: %w", err)
	}
	defer rows.Close()

	locks := make([]*models.Lock, 0)
	for rows.Next() {
		var l models.Lock
		var pid int

		if err := rows.Scan(&pid, &l.User, &l.Relation, &l.Mode, &l.LockType, &l.Granted, &l.WaitingFor, &l.Query, &l.WaitStart); err != nil {
			return nil, fmt.Errorf("failed to scan lock row: %w", err)
		}

		l.PID = fmt.Sprintf("%d", pid)
		l.Database = dbName

		locks = append(locks, &l)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating lock rows: %w", err)
	}

	return locks, nil
}

// TerminateQueries terminates specified backend processes
func (s *DatabaseService) TerminateQueries(connectionID, dbName string, pids []string) (int, error) {
	db, err := s.connectToSpecificDatabase(connectionID, dbName)
	if err != nil {
		return 0, err
	}
	defer db.Close()

	terminated := 0
	for _, pidStr := range pids {
		query := "SELECT pg_terminate_backend($1)"
		var result bool
		err := db.QueryRow(query, pidStr).Scan(&result)
		if err != nil {
			return terminated, fmt.Errorf("failed to terminate PID %s: %w", pidStr, err)
		}
		if result {
			terminated++
		}
	}

	return terminated, nil
}

// GetQueryHistory retrieves query history from pg_stat_statements
func (s *DatabaseService) GetQueryHistory(connectionID, dbName string) ([]*models.QueryStatement, error) {
	db, err := s.connectToSpecificDatabase(connectionID, dbName)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	query := `
		SELECT
			s.queryid::text,
			s.query,
			s.calls,
			s.total_exec_time,
			s.min_exec_time,
			s.max_exec_time,
			s.mean_exec_time,
			s.rows,
			COALESCE(r.rolname, 'unknown') as username,
			COALESCE(d.datname, $1) as database_name,
			s.shared_blks_hit,
			s.shared_blks_read,
			s.shared_blks_dirtied,
			s.temp_blks_read,
			s.temp_blks_written
		FROM pg_stat_statements s
		LEFT JOIN pg_roles r ON s.userid = r.oid
		LEFT JOIN pg_database d ON s.dbid = d.oid
		WHERE s.query NOT LIKE '%pg_stat_statements%'
			AND s.query NOT LIKE '%pg_stat_activity%'
			AND s.query NOT LIKE '%FROM information_schema%'
			AND s.query NOT LIKE '%FROM pg_catalog%'
		ORDER BY s.total_exec_time DESC
		LIMIT 100
	`

	rows, err := db.Query(query, dbName)
	if err != nil {
		return nil, fmt.Errorf("failed to get query history: %w", err)
	}
	defer rows.Close()

	statements := make([]*models.QueryStatement, 0)
	for rows.Next() {
		var stmt models.QueryStatement
		if err := rows.Scan(
			&stmt.QueryID,
			&stmt.Query,
			&stmt.Calls,
			&stmt.TotalExecTime,
			&stmt.MinExecTime,
			&stmt.MaxExecTime,
			&stmt.MeanExecTime,
			&stmt.Rows,
			&stmt.Username,
			&stmt.DatabaseName,
			&stmt.SharedBlksHit,
			&stmt.SharedBlksRead,
			&stmt.SharedBlksDirtied,
			&stmt.TempBlksRead,
			&stmt.TempBlksWritten,
		); err != nil {
			return nil, fmt.Errorf("failed to scan query statement row: %w", err)
		}
		statements = append(statements, &stmt)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating query statement rows: %w", err)
	}

	return statements, nil
}

// ExecuteQuery executes a SQL query on a specific database
func (s *DatabaseService) ExecuteQuery(connectionID, dbName string, query string) (*models.QueryResult, error) {
	db, err := s.connectToSpecificDatabase(connectionID, dbName)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	rows, err := db.Query(query)
	if err != nil {
		return &models.QueryResult{
			Columns: []string{},
			Rows:    []map[string]any{},
			Error:   err.Error(),
		}, nil
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return &models.QueryResult{
			Columns: []string{},
			Rows:    []map[string]any{},
			Error:   err.Error(),
		}, nil
	}

	var resultRows []map[string]any
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return &models.QueryResult{
				Columns: columns,
				Rows:    resultRows,
				Error:   err.Error(),
			}, nil
		}

		row := make(map[string]any)
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		resultRows = append(resultRows, row)
	}

	if err := rows.Err(); err != nil {
		return &models.QueryResult{
			Columns: columns,
			Rows:    resultRows,
			Error:   err.Error(),
		}, nil
	}

	return &models.QueryResult{
		Columns: columns,
		Rows:    resultRows,
	}, nil
}

// GetRoleMembership retrieves parent and child roles for a role
func (s *DatabaseService) GetRoleMembership(connectionID, roleID string) (parentRoles []models.RoleMembership, childRoles []models.RoleMembership, err error) {
	db, err := s.connectToDatabase(connectionID)
	if err != nil {
		return nil, nil, err
	}
	defer db.Close()

	// Initialize empty slices instead of nil
	parentRoles = make([]models.RoleMembership, 0)
	childRoles = make([]models.RoleMembership, 0)

	// Get parent roles (roles this role is a member of)
	parentQuery := `
		SELECT
			r.oid::text as role_oid,
			r.rolname as role_name,
			m.member::regrole::text as member_name,
			m.member::text as member_oid,
			m.admin_option
		FROM pg_auth_members m
		JOIN pg_roles r ON m.roleid = r.oid
		WHERE m.member = $1::regrole::oid
		ORDER BY r.rolname
	`

	parentRows, err := db.Query(parentQuery, roleID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to query parent roles: %w", err)
	}
	defer parentRows.Close()

	for parentRows.Next() {
		var membership models.RoleMembership
		err := parentRows.Scan(&membership.RoleOID, &membership.RoleName, &membership.MemberName, &membership.MemberOID, &membership.AdminOption)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to scan parent role: %w", err)
		}
		parentRoles = append(parentRoles, membership)
	}

	// Get child roles (roles that are members of this role)
	childQuery := `
		SELECT
			r.oid::text as role_oid,
			r.rolname as role_name,
			m.member::regrole::text as member_name,
			m.member::text as member_oid,
			m.admin_option
		FROM pg_auth_members m
		JOIN pg_roles r ON m.member = r.oid
		WHERE m.roleid = $1::regrole::oid
		ORDER BY r.rolname
	`

	childRows, err := db.Query(childQuery, roleID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to query child roles: %w", err)
	}
	defer childRows.Close()

	for childRows.Next() {
		var membership models.RoleMembership
		err := childRows.Scan(&membership.MemberOID, &membership.MemberName, &membership.RoleName, &membership.RoleOID, &membership.AdminOption)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to scan child role: %w", err)
		}
		childRoles = append(childRoles, membership)
	}

	return parentRoles, childRoles, nil
}

// GetDetailedRole retrieves complete information about a role
func (s *DatabaseService) GetDetailedRole(connectionID, roleID string) (*models.DetailedRole, error) {
	// Get basic role info
	role, err := s.GetRole(connectionID, roleID)
	if err != nil {
		return nil, err
	}

	// Get role membership
	parentRoles, childRoles, err := s.GetRoleMembership(connectionID, roleID)
	if err != nil {
		return nil, err
	}

	// Get role privileges
	privileges, err := s.GetRolePrivileges(connectionID, roleID)
	if err != nil {
		return nil, err
	}

	// Build attributes map
	attributes := map[string]bool{
		"LOGIN":       false,
		"SUPERUSER":   false,
		"CREATEDB":    false,
		"CREATEROLE":  false,
		"INHERIT":     false,
		"REPLICATION": false,
	}

	for _, perm := range role.Permissions {
		attributes[perm] = true
	}

	return &models.DetailedRole{
		Role:        *role,
		ParentRoles: parentRoles,
		ChildRoles:  childRoles,
		Privileges:  privileges,
		Attributes:  attributes,
	}, nil
}

// GetSchemas retrieves all schemas in a database
func (s *DatabaseService) GetSchemas(connectionID, dbName string) ([]*models.Schema, error) {
	db, err := s.connectToSpecificDatabase(connectionID, dbName)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	query := `
		SELECT
			schema_name as name,
			schema_owner as owner
		FROM information_schema.schemata
		WHERE catalog_name = $1
		AND schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
		ORDER BY schema_name
	`

	rows, err := db.Query(query, dbName)
	if err != nil {
		return nil, fmt.Errorf("failed to query schemas: %w", err)
	}
	defer rows.Close()

	schemas := make([]*models.Schema, 0)
	for rows.Next() {
		var schema models.Schema
		schema.Database = dbName
		err := rows.Scan(&schema.Name, &schema.Owner)
		if err != nil {
			return nil, fmt.Errorf("failed to scan schema: %w", err)
		}
		schemas = append(schemas, &schema)
	}

	return schemas, nil
}

// GetTablesInSchema retrieves all tables in a schema
func (s *DatabaseService) GetTablesInSchema(connectionID, dbName, schemaName string) ([]*models.DatabaseObject, error) {
	db, err := s.connectToSpecificDatabase(connectionID, dbName)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	query := `
		SELECT
			table_name,
			table_schema
		FROM information_schema.tables
		WHERE table_catalog = $1
		AND table_schema = $2
		AND table_type = 'BASE TABLE'
		ORDER BY table_name
	`

	rows, err := db.Query(query, dbName, schemaName)
	if err != nil {
		return nil, fmt.Errorf("failed to query tables: %w", err)
	}
	defer rows.Close()

	tables := make([]*models.DatabaseObject, 0)
	for rows.Next() {
		var obj models.DatabaseObject
		obj.Type = "table"
		err := rows.Scan(&obj.Name, &obj.Schema)
		if err != nil {
			return nil, fmt.Errorf("failed to scan table: %w", err)
		}
		tables = append(tables, &obj)
	}

	return tables, nil
}

// GetViewsInSchema retrieves all views in a schema
func (s *DatabaseService) GetViewsInSchema(connectionID, dbName, schemaName string) ([]*models.DatabaseObject, error) {
	db, err := s.connectToSpecificDatabase(connectionID, dbName)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	query := `
		SELECT
			table_name,
			table_schema
		FROM information_schema.views
		WHERE table_catalog = $1
		AND table_schema = $2
		ORDER BY table_name
	`

	rows, err := db.Query(query, dbName, schemaName)
	if err != nil {
		return nil, fmt.Errorf("failed to query views: %w", err)
	}
	defer rows.Close()

	views := make([]*models.DatabaseObject, 0)
	for rows.Next() {
		var obj models.DatabaseObject
		obj.Type = "view"
		err := rows.Scan(&obj.Name, &obj.Schema)
		if err != nil {
			return nil, fmt.Errorf("failed to scan view: %w", err)
		}
		views = append(views, &obj)
	}

	return views, nil
}

// GetFunctionsInSchema retrieves all functions and procedures in a schema
func (s *DatabaseService) GetFunctionsInSchema(connectionID, dbName, schemaName string) ([]*models.DatabaseObject, error) {
	db, err := s.connectToSpecificDatabase(connectionID, dbName)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	query := `
		SELECT
			routine_name,
			routine_schema,
			routine_type
		FROM information_schema.routines
		WHERE routine_catalog = $1
		AND routine_schema = $2
		ORDER BY routine_name
	`

	rows, err := db.Query(query, dbName, schemaName)
	if err != nil {
		return nil, fmt.Errorf("failed to query functions: %w", err)
	}
	defer rows.Close()

	functions := make([]*models.DatabaseObject, 0)
	for rows.Next() {
		var obj models.DatabaseObject
		var routineType string
		err := rows.Scan(&obj.Name, &obj.Schema, &routineType)
		if err != nil {
			return nil, fmt.Errorf("failed to scan function: %w", err)
		}
		if routineType == "PROCEDURE" {
			obj.Type = "procedure"
		} else {
			obj.Type = "function"
		}
		functions = append(functions, &obj)
	}

	return functions, nil
}

// GetRolePrivileges retrieves all privileges for a role
func (s *DatabaseService) GetRolePrivileges(connectionID, roleID string) ([]models.RolePrivilege, error) {
	db, err := s.connectToDatabase(connectionID)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	privileges := make([]models.RolePrivilege, 0)

	// First, get the role name from OID
	var roleName string
	roleQuery := `SELECT rolname FROM pg_roles WHERE oid = $1::oid`
	err = db.QueryRow(roleQuery, roleID).Scan(&roleName)
	if err != nil {
		return nil, fmt.Errorf("failed to get role name: %w", err)
	}

	// Get list of all databases
	dbListQuery := `
		SELECT datname
		FROM pg_database
		WHERE datname NOT IN ('template0', 'template1')
		ORDER BY datname
	`

	dbListRows, err := db.Query(dbListQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to query database list: %w", err)
	}
	defer dbListRows.Close()

	var databases []string
	for dbListRows.Next() {
		var dbName string
		if err := dbListRows.Scan(&dbName); err != nil {
			return nil, fmt.Errorf("failed to scan database name: %w", err)
		}
		databases = append(databases, dbName)
	}

	// Get database-level privileges
	for _, dbName := range databases {
		var hasConnect, hasCreate bool
		db.QueryRow(
			`SELECT
				has_database_privilege($1, $2, 'CONNECT') as has_connect,
				has_database_privilege($1, $2, 'CREATE') as has_create`,
			roleName, dbName,
		).Scan(&hasConnect, &hasCreate)

		dbPrivs := make([]string, 0)
		if hasConnect {
			dbPrivs = append(dbPrivs, "CONNECT")
		}
		if hasCreate {
			dbPrivs = append(dbPrivs, "CREATE")
		}

		if len(dbPrivs) > 0 {
			priv := models.RolePrivilege{
				ObjectType: "database",
				ObjectName: dbName,
				Privileges: dbPrivs,
			}
			privileges = append(privileges, priv)
		}
	}

	// For each database, get schema and table privileges
	for _, dbName := range databases {
		// Connect to this specific database
		dbConn, err := s.connectToSpecificDatabase(connectionID, dbName)
		if err != nil {
			// Skip databases we can't connect to
			continue
		}

		// Get schema-level privileges in this database
		schemaQuery := `
			SELECT
				nspname,
				has_schema_privilege($1, nspname, 'USAGE') as has_usage,
				has_schema_privilege($1, nspname, 'CREATE') as has_create
			FROM pg_namespace
			WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
			ORDER BY nspname
		`

		schemaRows, err := dbConn.Query(schemaQuery, roleName)
		if err != nil {
			dbConn.Close()
			continue
		}

		for schemaRows.Next() {
			var schemaName string
			var hasUsage, hasCreate bool
			err := schemaRows.Scan(&schemaName, &hasUsage, &hasCreate)
			if err != nil {
				continue
			}

			schemaPrivs := make([]string, 0)
			if hasUsage {
				schemaPrivs = append(schemaPrivs, "USAGE")
			}
			if hasCreate {
				schemaPrivs = append(schemaPrivs, "CREATE")
			}

			if len(schemaPrivs) > 0 {
				priv := models.RolePrivilege{
					ObjectType:     "schema",
					ObjectName:     schemaName,
					ObjectDatabase: dbName,
					Privileges:     schemaPrivs,
				}
				privileges = append(privileges, priv)
			}
		}
		schemaRows.Close()

		// Get table and view privileges in this database
		tableQuery := `
			SELECT
				table_schema,
				table_name,
				ARRAY_AGG(DISTINCT privilege_type) as privileges
			FROM information_schema.table_privileges
			WHERE grantee = $1
			GROUP BY table_schema, table_name
			ORDER BY table_schema, table_name
		`

		tableRows, err := dbConn.Query(tableQuery, roleName)
		if err != nil {
			dbConn.Close()
			continue
		}

		for tableRows.Next() {
			var priv models.RolePrivilege
			var privArray []string
			err := tableRows.Scan(&priv.ObjectSchema, &priv.ObjectName, pq.Array(&privArray))
			if err != nil {
				continue
			}
			priv.ObjectType = "table"
			priv.ObjectDatabase = dbName
			priv.Privileges = privArray
			privileges = append(privileges, priv)
		}
		tableRows.Close()

		dbConn.Close()
	}

	return privileges, nil
}

// GrantPrivileges grants privileges to a role
func (s *DatabaseService) GrantPrivileges(connectionID, roleID string, req *models.GrantRequest) error {
	// Determine which database to connect to
	var db *sql.DB
	var err error

	if req.ObjectDatabase != "" && req.ObjectType != "database" {
		// For objects within a specific database (tables, views, functions, schemas)
		db, err = s.connectToSpecificDatabase(connectionID, req.ObjectDatabase)
	} else {
		// For database-level grants or when no specific database is provided
		db, err = s.connectToDatabase(connectionID)
	}

	if err != nil {
		return err
	}
	defer db.Close()

	// Get the role name from OID
	var roleName string
	roleQuery := `SELECT rolname FROM pg_roles WHERE oid = $1::oid`
	err = db.QueryRow(roleQuery, roleID).Scan(&roleName)
	if err != nil {
		return fmt.Errorf("failed to get role name: %w", err)
	}

	// Build GRANT statement
	var grantSQL string
	objectIdentifier := req.ObjectName
	if req.ObjectSchema != "" {
		objectIdentifier = fmt.Sprintf("%s.%s", req.ObjectSchema, req.ObjectName)
	}

	privileges := ""
	for i, priv := range req.Privileges {
		if i > 0 {
			privileges += ", "
		}
		privileges += priv
	}

	switch req.ObjectType {
	case "table", "view":
		grantSQL = fmt.Sprintf("GRANT %s ON TABLE %s TO %s", privileges, objectIdentifier, roleName)
	case "schema":
		grantSQL = fmt.Sprintf("GRANT %s ON SCHEMA %s TO %s", privileges, req.ObjectName, roleName)
	case "database":
		grantSQL = fmt.Sprintf("GRANT %s ON DATABASE %s TO %s", privileges, req.ObjectName, roleName)
	case "function", "procedure":
		grantSQL = fmt.Sprintf("GRANT %s ON FUNCTION %s TO %s", privileges, objectIdentifier, roleName)
	default:
		return fmt.Errorf("unsupported object type: %s", req.ObjectType)
	}

	_, err = db.Exec(grantSQL)
	if err != nil {
		return fmt.Errorf("failed to grant privileges: %w", err)
	}

	return nil
}

// RevokePrivileges revokes privileges from a role
func (s *DatabaseService) RevokePrivileges(connectionID, roleID string, req *models.GrantRequest) error {
	// Determine which database to connect to
	var db *sql.DB
	var err error

	if req.ObjectDatabase != "" && req.ObjectType != "database" {
		// For objects within a specific database (tables, views, functions, schemas)
		db, err = s.connectToSpecificDatabase(connectionID, req.ObjectDatabase)
	} else {
		// For database-level revokes or when no specific database is provided
		db, err = s.connectToDatabase(connectionID)
	}

	if err != nil {
		return err
	}
	defer db.Close()

	// Get the role name from OID
	var roleName string
	roleQuery := `SELECT rolname FROM pg_roles WHERE oid = $1::oid`
	err = db.QueryRow(roleQuery, roleID).Scan(&roleName)
	if err != nil {
		return fmt.Errorf("failed to get role name: %w", err)
	}

	// Build REVOKE statement
	var revokeSQL string
	objectIdentifier := req.ObjectName
	if req.ObjectSchema != "" {
		objectIdentifier = fmt.Sprintf("%s.%s", req.ObjectSchema, req.ObjectName)
	}

	privileges := ""
	for i, priv := range req.Privileges {
		if i > 0 {
			privileges += ", "
		}
		privileges += priv
	}

	switch req.ObjectType {
	case "table", "view":
		revokeSQL = fmt.Sprintf("REVOKE %s ON TABLE %s FROM %s", privileges, objectIdentifier, roleName)
	case "schema":
		revokeSQL = fmt.Sprintf("REVOKE %s ON SCHEMA %s FROM %s", privileges, req.ObjectName, roleName)
	case "database":
		revokeSQL = fmt.Sprintf("REVOKE %s ON DATABASE %s FROM %s", privileges, req.ObjectName, roleName)
	case "function", "procedure":
		revokeSQL = fmt.Sprintf("REVOKE %s ON FUNCTION %s FROM %s", privileges, objectIdentifier, roleName)
	default:
		return fmt.Errorf("unsupported object type: %s", req.ObjectType)
	}

	_, err = db.Exec(revokeSQL)
	if err != nil {
		return fmt.Errorf("failed to revoke privileges: %w", err)
	}

	return nil
}

// GrantMembership grants membership to a role
func (s *DatabaseService) GrantMembership(connectionID, roleID string, req *models.MembershipRequest) error {
	db, err := s.connectToDatabase(connectionID)
	if err != nil {
		return err
	}
	defer db.Close()

	// Get the role name from OID
	var roleName string
	roleQuery := `SELECT rolname FROM pg_roles WHERE oid = $1::oid`
	err = db.QueryRow(roleQuery, roleID).Scan(&roleName)
	if err != nil {
		return fmt.Errorf("failed to get role name: %w", err)
	}

	// Get the member role name from OID
	var memberRoleName string
	err = db.QueryRow(roleQuery, req.MemberRoleOID).Scan(&memberRoleName)
	if err != nil {
		return fmt.Errorf("failed to get member role name: %w", err)
	}

	// Build GRANT ROLE statement
	grantSQL := fmt.Sprintf("GRANT %s TO %s", roleName, memberRoleName)
	if req.AdminOption {
		grantSQL += " WITH ADMIN OPTION"
	}

	_, err = db.Exec(grantSQL)
	if err != nil {
		return fmt.Errorf("failed to grant membership: %w", err)
	}

	return nil
}

// RevokeMembership revokes membership from a role
func (s *DatabaseService) RevokeMembership(connectionID, roleID string, req *models.MembershipRequest) error {
	db, err := s.connectToDatabase(connectionID)
	if err != nil {
		return err
	}
	defer db.Close()

	// Get the role name from OID
	var roleName string
	roleQuery := `SELECT rolname FROM pg_roles WHERE oid = $1::oid`
	err = db.QueryRow(roleQuery, roleID).Scan(&roleName)
	if err != nil {
		return fmt.Errorf("failed to get role name: %w", err)
	}

	// Get the member role name from OID
	var memberRoleName string
	err = db.QueryRow(roleQuery, req.MemberRoleOID).Scan(&memberRoleName)
	if err != nil {
		return fmt.Errorf("failed to get member role name: %w", err)
	}

	// Build REVOKE ROLE statement
	revokeSQL := fmt.Sprintf("REVOKE %s FROM %s", roleName, memberRoleName)

	_, err = db.Exec(revokeSQL)
	if err != nil {
		return fmt.Errorf("failed to revoke membership: %w", err)
	}

	return nil
}

// Helper functions for creating pointers
func int64Ptr(i int64) *int64 {
	return &i
}

func intPtr(i int) *int {
	return &i
}
