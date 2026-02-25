package services

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq" // PostgreSQL driver
	"gorm.io/gorm"

	"truadmin/internal/database"
	"truadmin/internal/models"
)

// HohAddressService handles business logic for HohAddress databases
type HohAddressService struct {
	db                *gorm.DB
	connectionService *ConnectionService
}

// NewHohAddressService creates a new HohAddress service
func NewHohAddressService(connectionService *ConnectionService) *HohAddressService {
	return &HohAddressService{
		db:                database.GetDB(),
		connectionService: connectionService,
	}
}

// GetEligibleDatabases returns databases that have tracking schema and tables starting with hohaddress
func (s *HohAddressService) GetEligibleDatabases(connectionID string) ([]models.Database, error) {
	// Get connection
	conn, err := s.connectionService.GetConnection(connectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection: %w", err)
	}

	// Only PostgreSQL is supported for HohAddress
	if conn.Type != "postgres" {
		return nil, fmt.Errorf("only PostgreSQL databases are supported for HohAddress")
	}

	// Connect to the database
	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		conn.Host, conn.Port, conn.Username, conn.Password, conn.Database, conn.SSLMode)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	defer db.Close()

	// Get list of all databases
	query := `
		SELECT datname
		FROM pg_database
		WHERE datistemplate = false
		AND datname NOT IN ('template0', 'template1')
		ORDER BY datname
	`

	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to get databases: %w", err)
	}
	defer rows.Close()

	// Initialize as empty slice instead of nil to ensure JSON serializes as [] not null
	eligibleDatabases := []models.Database{}

	// For each database, check if it has tracking schema and tables starting with hohaddress
	for rows.Next() {
		var dbName string
		if err := rows.Scan(&dbName); err != nil {
			continue
		}

		fmt.Printf("Checking database: %s\n", dbName)

		// Connect to each database to check for tracking schema and hohaddress tables
		dbConnStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
			conn.Host, conn.Port, conn.Username, conn.Password, dbName, conn.SSLMode)

		dbConn, err := sql.Open("postgres", dbConnStr)
		if err != nil {
			fmt.Printf("Failed to open connection to database %s: %v\n", dbName, err)
			continue
		}

		// Actually establish the connection
		if err := dbConn.Ping(); err != nil {
			fmt.Printf("Failed to ping database %s: %v\n", dbName, err)
			dbConn.Close()
			continue
		}
		fmt.Printf("Successfully connected to database: %s\n", dbName)

		// Check if tracking schema exists and has tables starting with hohaddress (case-insensitive)
		checkQuery := `
			SELECT EXISTS (
				SELECT 1
				FROM information_schema.tables
				WHERE LOWER(table_schema) = 'tracking'
				AND LOWER(table_name) LIKE 'hohaddress%'
			)
		`

		var exists bool
		if err := dbConn.QueryRow(checkQuery).Scan(&exists); err != nil {
			// Log error for debugging
			fmt.Printf("Error checking database %s: %v\n", dbName, err)
			dbConn.Close()
			continue
		}

		fmt.Printf("Database %s - tracking schema with hohaddress* tables exists: %v\n", dbName, exists)

		if !exists {
			dbConn.Close()
			continue
		}

		dbConn.Close()

		// Add to eligible databases
		fmt.Printf("✓ Adding database %s to eligible list\n", dbName)
		eligibleDatabases = append(eligibleDatabases, models.Database{
			Name: dbName,
		})
	}

	fmt.Printf("Total eligible databases found: %d\n", len(eligibleDatabases))
	return eligibleDatabases, nil
}

// AddDatabase adds a new database to HohAddress
func (s *HohAddressService) AddDatabase(req *models.HohAddressDatabaseRequest) (*models.HohAddressDatabase, error) {
	// Validate request
	if req.ConnectionID == "" {
		return nil, fmt.Errorf("connection ID is required")
	}
	if req.DatabaseName == "" {
		return nil, fmt.Errorf("database name is required")
	}

	// Check if connection exists
	if _, err := s.connectionService.GetConnection(req.ConnectionID); err != nil {
		return nil, fmt.Errorf("connection not found: %w", err)
	}

	// Check if database already added
	var existing models.HohAddressDatabase
	if err := s.db.Where("connection_id = ? AND database_name = ?", req.ConnectionID, req.DatabaseName).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("database already added to HohAddress")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing database: %w", err)
	}

	// Set display name if not provided
	displayName := req.DisplayName
	if displayName == "" {
		displayName = req.DatabaseName
	}

	// Create new HohAddress database entry
	hohAddressDB := &models.HohAddressDatabase{
		ID:           uuid.New().String(),
		ConnectionID: req.ConnectionID,
		DatabaseName: req.DatabaseName,
		DisplayName:  displayName,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// Save to database
	if err := s.db.Create(hohAddressDB).Error; err != nil {
		return nil, fmt.Errorf("failed to add database to HohAddress: %w", err)
	}

	return hohAddressDB, nil
}

// GetDatabases retrieves all HohAddress databases with connection details
func (s *HohAddressService) GetDatabases() ([]models.HohAddressDatabaseWithConnection, error) {
	var hohAddressDatabases []models.HohAddressDatabase
	if err := s.db.Order("created_at DESC").Find(&hohAddressDatabases).Error; err != nil {
		return nil, fmt.Errorf("failed to get HohAddress databases: %w", err)
	}

	// Enrich with connection details
	// Initialize as empty slice instead of nil to ensure JSON serializes as [] not null
	result := []models.HohAddressDatabaseWithConnection{}
	for _, db := range hohAddressDatabases {
		conn, err := s.connectionService.GetConnection(db.ConnectionID)
		if err != nil {
			// Skip if connection not found (orphaned entry)
			continue
		}

		result = append(result, models.HohAddressDatabaseWithConnection{
			HohAddressDatabase: db,
			ConnectionName:     conn.Name,
			ConnectionType:     conn.Type,
		})
	}

	return result, nil
}

// GetDatabase retrieves a HohAddress database by ID
func (s *HohAddressService) GetDatabase(id string) (*models.HohAddressDatabaseWithConnection, error) {
	var hohAddressDB models.HohAddressDatabase
	if err := s.db.First(&hohAddressDB, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("HohAddress database not found")
		}
		return nil, fmt.Errorf("failed to get HohAddress database: %w", err)
	}

	// Get connection details
	conn, err := s.connectionService.GetConnection(hohAddressDB.ConnectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection: %w", err)
	}

	return &models.HohAddressDatabaseWithConnection{
		HohAddressDatabase: hohAddressDB,
		ConnectionName:     conn.Name,
		ConnectionType:     conn.Type,
	}, nil
}

// UpdateDatabase updates an existing HohAddress database
func (s *HohAddressService) UpdateDatabase(id string, req *models.HohAddressDatabaseRequest) (*models.HohAddressDatabase, error) {
	// Get existing database
	var hohAddressDB models.HohAddressDatabase
	if err := s.db.First(&hohAddressDB, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("HohAddress database not found")
		}
		return nil, fmt.Errorf("failed to get HohAddress database: %w", err)
	}

	// Validate request
	if req.ConnectionID == "" {
		return nil, fmt.Errorf("connection ID is required")
	}
	if req.DatabaseName == "" {
		return nil, fmt.Errorf("database name is required")
	}

	// Check if connection exists
	if _, err := s.connectionService.GetConnection(req.ConnectionID); err != nil {
		return nil, fmt.Errorf("connection not found: %w", err)
	}

	// Check if another database with same connection and name exists (excluding current)
	var existing models.HohAddressDatabase
	if err := s.db.Where("connection_id = ? AND database_name = ? AND id != ?", req.ConnectionID, req.DatabaseName, id).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("database already added to HohAddress")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing database: %w", err)
	}

	// Set display name if not provided
	displayName := req.DisplayName
	if displayName == "" {
		displayName = req.DatabaseName
	}

	// Update fields
	hohAddressDB.ConnectionID = req.ConnectionID
	hohAddressDB.DatabaseName = req.DatabaseName
	hohAddressDB.DisplayName = displayName
	hohAddressDB.UpdatedAt = time.Now()

	// Save to database
	if err := s.db.Save(&hohAddressDB).Error; err != nil {
		return nil, fmt.Errorf("failed to update HohAddress database: %w", err)
	}

	return &hohAddressDB, nil
}

// DeleteDatabase removes a database from HohAddress
func (s *HohAddressService) DeleteDatabase(id string) error {
	result := s.db.Delete(&models.HohAddressDatabase{}, "id = ?", id)
	if result.Error != nil {
		return fmt.Errorf("failed to delete HohAddress database: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("HohAddress database not found")
	}
	return nil
}

// connectToDatabase connects to the specific HohAddress database
func (s *HohAddressService) connectToDatabase(hohAddressDatabaseID string) (*sql.DB, error) {
	// Get HohAddress database info
	hohAddressDB, err := s.GetDatabase(hohAddressDatabaseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get HohAddress database: %w", err)
	}

	// Get connection
	conn, err := s.connectionService.GetConnection(hohAddressDB.ConnectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection: %w", err)
	}

	// Connect to the specific database
	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		conn.Host, conn.Port, conn.Username, conn.Password, hohAddressDB.DatabaseName, conn.SSLMode)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return db, nil
}

// GetTableColumns retrieves column names for a table in the correct display order
func (s *HohAddressService) GetTableColumns(hohAddressDatabaseID string, tableName string) ([]string, error) {
	db, err := s.connectToDatabase(hohAddressDatabaseID)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	// Use the same ordering logic as getOrderedColumns
	return s.getOrderedColumns(db, tableName)
}

// getOrderedColumns retrieves column names in the correct order from information_schema
// Returns columns in a logical display order: ID first, then address fields, then metadata
func (s *HohAddressService) getOrderedColumns(db *sql.DB, tableName string) ([]string, error) {
	query := `
		SELECT column_name 
		FROM information_schema.columns 
		WHERE table_schema = 'tracking' 
		AND table_name = $1
		ORDER BY ordinal_position
	`
	rows, err := db.Query(query, tableName)
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}
	defer rows.Close()

	var allColumns []string
	for rows.Next() {
		var colName string
		if err := rows.Scan(&colName); err != nil {
			return nil, fmt.Errorf("failed to scan column name: %w", err)
		}
		allColumns = append(allColumns, colName)
	}

	// Define preferred display order
	preferredOrder := []string{
		"id",
		"address1",
		"address2",
		"city",
		"state",
		"zip",
		"description",
		"category",
		"capacity", // Only for whitelist
		"updatedby",
		"updatedon",
		"address1_upd",
		"address2_upd",
		"city_upd",
	}

	// Build ordered list: first preferred order, then any remaining columns
	orderedColumns := []string{}
	usedColumns := make(map[string]bool)

	// Add columns in preferred order
	for _, preferredCol := range preferredOrder {
		for _, col := range allColumns {
			if col == preferredCol && !usedColumns[col] {
				orderedColumns = append(orderedColumns, col)
				usedColumns[col] = true
				break
			}
		}
	}

	// Add any remaining columns that weren't in preferred order
	for _, col := range allColumns {
		if !usedColumns[col] {
			orderedColumns = append(orderedColumns, col)
		}
	}

	return orderedColumns, nil
}

// buildWhereClause builds a WHERE clause with proper type handling for filters
func (s *HohAddressService) buildWhereClause(db *sql.DB, tableName string, filters map[string]string) (string, []interface{}, error) {
	// Get column types to determine appropriate filter operator
	columnTypes := make(map[string]string)
	typeRows, err := db.Query(fmt.Sprintf(`
		SELECT column_name, data_type 
		FROM information_schema.columns 
		WHERE table_schema = 'tracking' 
		AND table_name = '%s'
	`, tableName))
	if err != nil {
		return "", nil, fmt.Errorf("failed to get column types: %w", err)
	}
	defer typeRows.Close()
	
	for typeRows.Next() {
		var colName, dataType string
		if err := typeRows.Scan(&colName, &dataType); err == nil {
			columnTypes[colName] = dataType
		}
	}

	// Check if all filter values are the same (general search)
	allSameValue := ""
	hasMultipleValues := false
	filterCount := 0
	for _, value := range filters {
		if value != "" {
			filterCount++
			if allSameValue == "" {
				allSameValue = value
			} else if allSameValue != value {
				hasMultipleValues = true
				break
			}
		}
	}

	// Build WHERE clause from filters
	whereClause := "1=1"
	args := []interface{}{}
	argIndex := 1

	// If all values are the same (general search), use OR logic
	if !hasMultipleValues && filterCount > 1 && allSameValue != "" {
		// General search: value should match ANY of the fields (OR)
		conditions := []string{}
		for key := range filters {
			if filters[key] != "" {
				dataType, exists := columnTypes[key]
				if exists && (dataType == "integer" || dataType == "bigint" || dataType == "numeric" || dataType == "real" || dataType == "double precision" || dataType == "smallint") {
					conditions = append(conditions, fmt.Sprintf("CAST(%s AS TEXT) ILIKE $%d", key, argIndex))
				} else {
					conditions = append(conditions, fmt.Sprintf("%s ILIKE $%d", key, argIndex))
				}
				args = append(args, "%"+allSameValue+"%")
				argIndex++
			}
		}
		if len(conditions) > 0 {
			whereClause += " AND (" + conditions[0]
			for i := 1; i < len(conditions); i++ {
				whereClause += " OR " + conditions[i]
			}
			whereClause += ")"
		}
	} else {
		// Specific filters: each field must match its value (AND)
		for key, value := range filters {
			if value != "" {
				dataType, exists := columnTypes[key]
				// Use ILIKE for text-like types, CAST to text for numeric types
				if exists && (dataType == "integer" || dataType == "bigint" || dataType == "numeric" || dataType == "real" || dataType == "double precision" || dataType == "smallint") {
					// For numeric types, cast to text and use ILIKE
					whereClause += fmt.Sprintf(" AND CAST(%s AS TEXT) ILIKE $%d", key, argIndex)
					args = append(args, "%"+value+"%")
					argIndex++
				} else {
					// For text types, use ILIKE directly
					whereClause += fmt.Sprintf(" AND %s ILIKE $%d", key, argIndex)
					args = append(args, "%"+value+"%")
					argIndex++
				}
			}
		}
	}

	return whereClause, args, nil
}

// GetStatusList retrieves data from tracking.hohaddressstatuslist (read-only)
func (s *HohAddressService) GetStatusList(hohAddressDatabaseID string, filters map[string]string, limit, offset int, whereClause string) ([]map[string]interface{}, int, error) {
	db, err := s.connectToDatabase(hohAddressDatabaseID)
	if err != nil {
		return nil, 0, err
	}
	defer db.Close()

	// Get ordered columns first
	columns, err := s.getOrderedColumns(db, "hohaddressstatuslist")
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get columns: %w", err)
	}

	// Build column list for SELECT
	columnList := ""
	for i, col := range columns {
		if i > 0 {
			columnList += ", "
		}
		columnList += col
	}

	// Build WHERE clause from filters with proper type handling
	var whereCondition string
	var args []interface{}
	var argIndex int
	
	whereClauseTrimmed := strings.TrimSpace(whereClause)
	if whereClauseTrimmed != "" {
		// Use custom WHERE clause if provided
		whereCondition = whereClauseTrimmed
		args = []interface{}{}
		argIndex = 1
		fmt.Printf("Using custom WHERE clause: %s\n", whereCondition)
	} else {
		// Build WHERE from filters
		builtWhere, builtArgs, err := s.buildWhereClause(db, "hohaddressstatuslist", filters)
		if err != nil {
			return nil, 0, err
		}
		whereCondition = builtWhere
		args = builtArgs
		argIndex = len(args) + 1
		fmt.Printf("Using built WHERE clause: %s\n", whereCondition)
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM tracking.hohaddressstatuslist WHERE %s", whereCondition)
	fmt.Printf("Count query: %s\n", countQuery)
	var totalCount int
	err = db.QueryRow(countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get count: %w", err)
	}

	// Get data with limit and offset using explicit column order
	query := fmt.Sprintf("SELECT %s FROM tracking.hohaddressstatuslist WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d", 
		columnList, whereCondition, columns[0], argIndex, argIndex+1)
	fmt.Printf("Data query: %s\n", query)
	args = append(args, limit, offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query tracking.hohaddressstatuslist: %w", err)
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, 0, fmt.Errorf("failed to scan row: %w", err)
		}

		rowMap := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				rowMap[col] = string(b)
			} else {
				rowMap[col] = val
			}
		}
		results = append(results, rowMap)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating rows: %w", err)
	}

	return results, totalCount, nil
}

// GetBlacklist retrieves data from tracking.hohaddressblacklist
func (s *HohAddressService) GetBlacklist(hohAddressDatabaseID string, filters map[string]string, sortBy string, sortOrder string, limit, offset int, whereClause string) ([]map[string]interface{}, int, error) {
	db, err := s.connectToDatabase(hohAddressDatabaseID)
	if err != nil {
		return nil, 0, err
	}
	defer db.Close()

	// Get ordered columns first
	columns, err := s.getOrderedColumns(db, "hohaddressblacklist")
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get columns: %w", err)
	}

	// Build column list for SELECT
	columnList := ""
	for i, col := range columns {
		if i > 0 {
			columnList += ", "
		}
		columnList += col
	}

	// Build WHERE clause from filters with proper type handling
	var whereCondition string
	var args []interface{}
	var argIndex int
	
	whereClauseTrimmed := strings.TrimSpace(whereClause)
	if whereClauseTrimmed != "" {
		// Use custom WHERE clause if provided
		whereCondition = whereClauseTrimmed
		args = []interface{}{}
		argIndex = 1
	} else {
		// Build WHERE from filters
		builtWhere, builtArgs, err := s.buildWhereClause(db, "hohaddressblacklist", filters)
		if err != nil {
			return nil, 0, err
		}
		whereCondition = builtWhere
		args = builtArgs
		argIndex = len(args) + 1
	}

	// Validate sortBy and sortOrder
	if sortBy == "" {
		sortBy = columns[0] // Default to first column
	}
	if sortOrder != "ASC" && sortOrder != "DESC" {
		sortOrder = "ASC"
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM tracking.hohaddressblacklist WHERE %s", whereCondition)
	var totalCount int
	err = db.QueryRow(countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get count: %w", err)
	}

	// Get data with limit, offset and sorting using explicit column order
	query := fmt.Sprintf("SELECT %s FROM tracking.hohaddressblacklist WHERE %s ORDER BY %s %s LIMIT $%d OFFSET $%d", 
		columnList, whereCondition, sortBy, sortOrder, argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query tracking.hohaddressblacklist: %w", err)
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, 0, fmt.Errorf("failed to scan row: %w", err)
		}

		rowMap := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				rowMap[col] = string(b)
			} else {
				rowMap[col] = val
			}
		}
		results = append(results, rowMap)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating rows: %w", err)
	}

	return results, totalCount, nil
}

// CreateBlacklistRow creates a new row in tracking.hohaddressblacklist
func (s *HohAddressService) CreateBlacklistRow(hohAddressDatabaseID string, data map[string]interface{}, username string) (map[string]interface{}, error) {
	db, err := s.connectToDatabase(hohAddressDatabaseID)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	// Get column names from the table
	columnsQuery := `
		SELECT column_name 
		FROM information_schema.columns 
		WHERE table_schema = 'tracking' 
		AND table_name = 'hohaddressblacklist'
		ORDER BY ordinal_position
	`
	colRows, err := db.Query(columnsQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}
	defer colRows.Close()

	var columnNames []string
	for colRows.Next() {
		var colName string
		if err := colRows.Scan(&colName); err != nil {
			return nil, fmt.Errorf("failed to scan column name: %w", err)
		}
		columnNames = append(columnNames, colName)
	}

	// Build INSERT query with automatic fields
	columns := ""
	placeholders := ""
	values := []interface{}{}
	argIndex := 1

	// Get values for _upd functions
	address1, _ := data["address1"].(string)
	address2, _ := data["address2"].(string)
	city, _ := data["city"].(string)

	for _, colName := range columnNames {
		var colValue interface{}
		var useFunction bool
		var functionExpr string

		// Handle special fields
		switch colName {
		case "address1_upd":
			if address1 != "" {
				useFunction = true
				functionExpr = fmt.Sprintf("tracking.get_hohaddress1($%d)", argIndex)
				colValue = address1
				argIndex++
			}
		case "address2_upd":
			if address2 != "" {
				useFunction = true
				functionExpr = fmt.Sprintf("tracking.get_hohaddress2($%d)", argIndex)
				colValue = address2
				argIndex++
			}
		case "city_upd":
			if city != "" {
				useFunction = true
				functionExpr = fmt.Sprintf("tracking.get_hohcity($%d)", argIndex)
				colValue = city
				argIndex++
			}
		case "updatedby":
			colValue = username
		case "updatedon":
			useFunction = true
			functionExpr = "CURRENT_TIMESTAMP"
		default:
			if val, ok := data[colName]; ok {
				colValue = val
			} else {
				continue // Skip if not provided and not a special field
			}
		}

		if colValue == nil && !useFunction {
			continue
		}

		if columns != "" {
			columns += ", "
			placeholders += ", "
		}
		columns += colName

		if useFunction {
			placeholders += functionExpr
		} else {
			placeholders += fmt.Sprintf("$%d", argIndex)
			values = append(values, colValue)
			argIndex++
		}
	}

	if columns == "" {
		return nil, fmt.Errorf("no valid columns provided")
	}

	insertQuery := fmt.Sprintf("INSERT INTO tracking.hohaddressblacklist (%s) VALUES (%s) RETURNING *", columns, placeholders)

	// Execute query and get result
	row := db.QueryRow(insertQuery, values...)

	// Scan the returned row
	resultValues := make([]interface{}, len(columnNames))
	resultPtrs := make([]interface{}, len(columnNames))
	for i := range resultValues {
		resultPtrs[i] = &resultValues[i]
	}

	if err := row.Scan(resultPtrs...); err != nil {
		return nil, fmt.Errorf("failed to scan inserted row: %w", err)
	}

	// Build result map
	result := make(map[string]interface{})
	for i, colName := range columnNames {
		val := resultValues[i]
		if b, ok := val.([]byte); ok {
			result[colName] = string(b)
		} else {
			result[colName] = val
		}
	}

	return result, nil
}

// UpdateBlacklistRow updates a row in tracking.hohaddressblacklist
func (s *HohAddressService) UpdateBlacklistRow(hohAddressDatabaseID string, rowID interface{}, data map[string]interface{}, username string) (map[string]interface{}, error) {
	db, err := s.connectToDatabase(hohAddressDatabaseID)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	// Get primary key column
	var pkColumn string
	err = db.QueryRow(`
		SELECT column_name 
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
		WHERE tc.table_schema = 'tracking' 
		AND tc.table_name = 'hohaddressblacklist'
		AND tc.constraint_type = 'PRIMARY KEY'
		LIMIT 1
	`).Scan(&pkColumn)

	if err != nil {
		// Fallback to first column
		err = db.QueryRow(`
			SELECT column_name 
			FROM information_schema.columns 
			WHERE table_schema = 'tracking' 
			AND table_name = 'hohaddressblacklist'
			ORDER BY ordinal_position
			LIMIT 1
		`).Scan(&pkColumn)
		if err != nil {
			return nil, fmt.Errorf("failed to determine primary key: %w", err)
		}
	}

	// Get all column names
	columnsQuery := `
		SELECT column_name 
		FROM information_schema.columns 
		WHERE table_schema = 'tracking' 
		AND table_name = 'hohaddressblacklist'
		ORDER BY ordinal_position
	`
	colRows, err := db.Query(columnsQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}
	defer colRows.Close()

	var columnNames []string
	for colRows.Next() {
		var colName string
		if err := colRows.Scan(&colName); err != nil {
			return nil, fmt.Errorf("failed to scan column name: %w", err)
		}
		columnNames = append(columnNames, colName)
	}

	// Get current row to check if uniqueness fields are being changed
	var currentAddress1Upd, currentAddress2Upd, currentCityUpd, currentCity, currentState interface{}
	var currentZip interface{}
	err = db.QueryRow(fmt.Sprintf("SELECT address1_upd, address2_upd, city_upd, city, state, zip FROM tracking.hohaddressblacklist WHERE %s = $1", pkColumn), rowID).Scan(
		&currentAddress1Upd, &currentAddress2Upd, &currentCityUpd, &currentCity, &currentState, &currentZip)
	if err != nil {
		return nil, fmt.Errorf("failed to get current row: %w", err)
	}

	// Get values for _upd functions
	address1, hasAddress1 := data["address1"].(string)
	address2, hasAddress2 := data["address2"].(string)
	city, hasCity := data["city"].(string)
	state, hasState := data["state"]
	zip, hasZip := data["zip"]

	// Calculate new _upd values if fields are being updated
	var address1Upd, address2Upd, cityUpd string
	if hasAddress1 && address1 != "" {
		err = db.QueryRow("SELECT tracking.get_hohaddress1($1)", address1).Scan(&address1Upd)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate address1_upd: %w", err)
		}
	} else {
		address1Upd = fmt.Sprintf("%v", currentAddress1Upd)
	}
	if hasAddress2 && address2 != "" {
		err = db.QueryRow("SELECT tracking.get_hohaddress2($1)", address2).Scan(&address2Upd)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate address2_upd: %w", err)
		}
	} else {
		address2Upd = fmt.Sprintf("%v", currentAddress2Upd)
	}
	if hasCity && city != "" {
		err = db.QueryRow("SELECT tracking.get_hohcity($1)", city).Scan(&cityUpd)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate city_upd: %w", err)
		}
	} else {
		cityUpd = fmt.Sprintf("%v", currentCityUpd)
	}

	// Use new values or current values for uniqueness check
	checkCity := city
	if !hasCity {
		checkCity = fmt.Sprintf("%v", currentCity)
	}
	checkState := state
	if !hasState {
		checkState = currentState
	}
	checkZip := zip
	if !hasZip {
		checkZip = currentZip
	}

	// Check uniqueness: address1_upd, address2_upd, city_upd, city, state, zip (excluding current row)
	checkQuery := fmt.Sprintf(`
		SELECT COUNT(*) 
		FROM tracking.hohaddressblacklist 
		WHERE address1_upd = $1 
		AND address2_upd = $2 
		AND city_upd = $3 
		AND city = $4 
		AND state = $5 
		AND zip = $6
		AND %s != $7
	`, pkColumn)
	var count int
	err = db.QueryRow(checkQuery, address1Upd, address2Upd, cityUpd, checkCity, checkState, checkZip, rowID).Scan(&count)
	if err != nil {
		return nil, fmt.Errorf("failed to check uniqueness: %w", err)
	}
	if count > 0 {
		return nil, fmt.Errorf("a record with this combination of address1_upd, address2_upd, city_upd, city, state, and zip already exists")
	}

	// Build UPDATE query
	setClause := ""
	values := []interface{}{rowID}
	argIndex := 2

	for key, value := range data {
		if key == pkColumn {
			continue // Skip primary key in SET clause
		}
		if setClause != "" {
			setClause += ", "
		}

		// Handle special fields
		switch key {
		case "address1":
			setClause += fmt.Sprintf("%s = $%d", key, argIndex)
			values = append(values, value)
			argIndex++
			// Also update address1_upd if address1 is being updated
			if hasAddress1 && address1 != "" {
				if setClause != "" {
					setClause += ", "
				}
				setClause += fmt.Sprintf("address1_upd = tracking.get_hohaddress1($%d)", argIndex)
				values = append(values, address1)
				argIndex++
			}
			continue
		case "address2":
			setClause += fmt.Sprintf("%s = $%d", key, argIndex)
			values = append(values, value)
			argIndex++
			// Also update address2_upd if address2 is being updated
			if hasAddress2 && address2 != "" {
				if setClause != "" {
					setClause += ", "
				}
				setClause += fmt.Sprintf("address2_upd = tracking.get_hohaddress2($%d)", argIndex)
				values = append(values, address2)
				argIndex++
			}
			continue
		case "city":
			setClause += fmt.Sprintf("%s = $%d", key, argIndex)
			values = append(values, value)
			argIndex++
			// Also update city_upd if city is being updated
			if hasCity && city != "" {
				if setClause != "" {
					setClause += ", "
				}
				setClause += fmt.Sprintf("city_upd = tracking.get_hohcity($%d)", argIndex)
				values = append(values, city)
				argIndex++
			}
			continue
		case "address1_upd", "address2_upd", "city_upd":
			// Skip _upd fields - they are auto-updated
			continue
		case "updatedby":
			setClause += fmt.Sprintf("%s = $%d", key, argIndex)
			values = append(values, username)
			argIndex++
			continue
		case "updatedon":
			setClause += fmt.Sprintf("%s = CURRENT_TIMESTAMP", key)
			continue
		}

		// Regular field
		setClause += fmt.Sprintf("%s = $%d", key, argIndex)
		values = append(values, value)
		argIndex++
	}

	// Always update updatedby and updatedon
	if setClause != "" {
		setClause += ", "
	}
	setClause += fmt.Sprintf("updatedby = $%d, updatedon = CURRENT_TIMESTAMP", argIndex)
	values = append(values, username)
	argIndex++

	if setClause == "" {
		return nil, fmt.Errorf("no fields to update")
	}

	updateQuery := fmt.Sprintf("UPDATE tracking.hohaddressblacklist SET %s WHERE %s = $1 RETURNING *", setClause, pkColumn)

	// Execute query and get result
	row := db.QueryRow(updateQuery, values...)

	// Scan the returned row
	resultValues := make([]interface{}, len(columnNames))
	resultPtrs := make([]interface{}, len(columnNames))
	for i := range resultValues {
		resultPtrs[i] = &resultValues[i]
	}

	if err := row.Scan(resultPtrs...); err != nil {
		return nil, fmt.Errorf("failed to scan updated row: %w", err)
	}

	// Build result map
	result := make(map[string]interface{})
	for i, colName := range columnNames {
		val := resultValues[i]
		if b, ok := val.([]byte); ok {
			result[colName] = string(b)
		} else {
			result[colName] = val
		}
	}

	return result, nil
}

// DeleteBlacklistRow deletes a row from tracking.hohaddressblacklist
func (s *HohAddressService) DeleteBlacklistRow(hohAddressDatabaseID string, rowID interface{}) error {
	db, err := s.connectToDatabase(hohAddressDatabaseID)
	if err != nil {
		return err
	}
	defer db.Close()

	// Get primary key column
	var pkColumn string
	err = db.QueryRow(`
		SELECT column_name 
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
		WHERE tc.table_schema = 'tracking' 
		AND tc.table_name = 'hohaddressblacklist'
		AND tc.constraint_type = 'PRIMARY KEY'
		LIMIT 1
	`).Scan(&pkColumn)

	if err != nil {
		// Fallback to first column
		err = db.QueryRow(`
			SELECT column_name 
			FROM information_schema.columns 
			WHERE table_schema = 'tracking' 
			AND table_name = 'hohaddressblacklist'
			ORDER BY ordinal_position
			LIMIT 1
		`).Scan(&pkColumn)
		if err != nil {
			return fmt.Errorf("failed to determine primary key: %w", err)
		}
	}

	deleteQuery := fmt.Sprintf("DELETE FROM tracking.hohaddressblacklist WHERE %s = $1", pkColumn)
	result, err := db.Exec(deleteQuery, rowID)
	if err != nil {
		return fmt.Errorf("failed to delete row: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("row not found")
	}

	return nil
}

// GetWhitelist retrieves data from tracking.hohaddresswhitelist
func (s *HohAddressService) GetWhitelist(hohAddressDatabaseID string, filters map[string]string, sortBy string, sortOrder string, limit, offset int, whereClause string) ([]map[string]interface{}, int, error) {
	db, err := s.connectToDatabase(hohAddressDatabaseID)
	if err != nil {
		return nil, 0, err
	}
	defer db.Close()

	// Get ordered columns first
	columns, err := s.getOrderedColumns(db, "hohaddresswhitelist")
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get columns: %w", err)
	}

	// Build column list for SELECT
	columnList := ""
	for i, col := range columns {
		if i > 0 {
			columnList += ", "
		}
		columnList += col
	}

	// Build WHERE clause from filters with proper type handling
	var whereCondition string
	var args []interface{}
	var argIndex int
	
	whereClauseTrimmed := strings.TrimSpace(whereClause)
	if whereClauseTrimmed != "" {
		// Use custom WHERE clause if provided
		whereCondition = whereClauseTrimmed
		args = []interface{}{}
		argIndex = 1
	} else {
		// Build WHERE from filters
		builtWhere, builtArgs, err := s.buildWhereClause(db, "hohaddresswhitelist", filters)
		if err != nil {
			return nil, 0, err
		}
		whereCondition = builtWhere
		args = builtArgs
		argIndex = len(args) + 1
	}

	// Validate sortBy and sortOrder
	if sortBy == "" {
		sortBy = columns[0] // Default to first column
	}
	if sortOrder != "ASC" && sortOrder != "DESC" {
		sortOrder = "ASC"
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM tracking.hohaddresswhitelist WHERE %s", whereCondition)
	var totalCount int
	err = db.QueryRow(countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get count: %w", err)
	}

	// Get data with limit, offset and sorting using explicit column order
	query := fmt.Sprintf("SELECT %s FROM tracking.hohaddresswhitelist WHERE %s ORDER BY %s %s LIMIT $%d OFFSET $%d", 
		columnList, whereCondition, sortBy, sortOrder, argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query tracking.hohaddresswhitelist: %w", err)
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, 0, fmt.Errorf("failed to scan row: %w", err)
		}

		rowMap := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				rowMap[col] = string(b)
			} else {
				rowMap[col] = val
			}
		}
		results = append(results, rowMap)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating rows: %w", err)
	}

	return results, totalCount, nil
}

// CreateWhitelistRow creates a new row in tracking.hohaddresswhitelist
func (s *HohAddressService) CreateWhitelistRow(hohAddressDatabaseID string, data map[string]interface{}, username string) (map[string]interface{}, error) {
	db, err := s.connectToDatabase(hohAddressDatabaseID)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	// Get column names from the table
	columnsQuery := `
		SELECT column_name 
		FROM information_schema.columns 
		WHERE table_schema = 'tracking' 
		AND table_name = 'hohaddresswhitelist'
		ORDER BY ordinal_position
	`
	colRows, err := db.Query(columnsQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}
	defer colRows.Close()

	var columnNames []string
	for colRows.Next() {
		var colName string
		if err := colRows.Scan(&colName); err != nil {
			return nil, fmt.Errorf("failed to scan column name: %w", err)
		}
		columnNames = append(columnNames, colName)
	}

	// Get values for _upd functions
	address1, _ := data["address1"].(string)
	address2, _ := data["address2"].(string)
	city, _ := data["city"].(string)
	state, _ := data["state"]
	zip, _ := data["zip"]

	// Calculate _upd values using database functions for uniqueness check
	var address1Upd, address2Upd, cityUpd string
	if address1 != "" {
		err = db.QueryRow("SELECT tracking.get_hohaddress1($1)", address1).Scan(&address1Upd)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate address1_upd: %w", err)
		}
	}
	if address2 != "" {
		err = db.QueryRow("SELECT tracking.get_hohaddress2($1)", address2).Scan(&address2Upd)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate address2_upd: %w", err)
		}
	}
	if city != "" {
		err = db.QueryRow("SELECT tracking.get_hohcity($1)", city).Scan(&cityUpd)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate city_upd: %w", err)
		}
	}

	// Check uniqueness: address1_upd, address2_upd, city_upd, city, state, zip
	checkQuery := `
		SELECT COUNT(*) 
		FROM tracking.hohaddresswhitelist 
		WHERE address1_upd = $1 
		AND address2_upd = $2 
		AND city_upd = $3 
		AND city = $4 
		AND state = $5 
		AND zip = $6
	`
	var count int
	err = db.QueryRow(checkQuery, address1Upd, address2Upd, cityUpd, city, state, zip).Scan(&count)
	if err != nil {
		return nil, fmt.Errorf("failed to check uniqueness: %w", err)
	}
	if count > 0 {
		return nil, fmt.Errorf("a record with this combination of address1_upd, address2_upd, city_upd, city, state, and zip already exists")
	}

	// Build INSERT query with automatic fields
	columns := ""
	placeholders := ""
	values := []interface{}{}
	argIndex := 1

	for _, colName := range columnNames {
		var colValue interface{}
		var useFunction bool
		var functionExpr string

		// Handle special fields
		switch colName {
		case "address1_upd":
			if address1 != "" {
				useFunction = true
				functionExpr = fmt.Sprintf("tracking.get_hohaddress1($%d)", argIndex)
				colValue = address1
				argIndex++
			}
		case "address2_upd":
			if address2 != "" {
				useFunction = true
				functionExpr = fmt.Sprintf("tracking.get_hohaddress2($%d)", argIndex)
				colValue = address2
				argIndex++
			}
		case "city_upd":
			if city != "" {
				useFunction = true
				functionExpr = fmt.Sprintf("tracking.get_hohcity($%d)", argIndex)
				colValue = city
				argIndex++
			}
		case "updatedby":
			colValue = username
		case "updatedon":
			useFunction = true
			functionExpr = "CURRENT_TIMESTAMP"
		default:
			if val, ok := data[colName]; ok {
				colValue = val
			} else {
				continue // Skip if not provided and not a special field
			}
		}

		if colValue == nil && !useFunction {
			continue
		}

		if columns != "" {
			columns += ", "
			placeholders += ", "
		}
		columns += colName

		if useFunction {
			placeholders += functionExpr
		} else {
			placeholders += fmt.Sprintf("$%d", argIndex)
			values = append(values, colValue)
			argIndex++
		}
	}

	if columns == "" {
		return nil, fmt.Errorf("no valid columns provided")
	}

	insertQuery := fmt.Sprintf("INSERT INTO tracking.hohaddresswhitelist (%s) VALUES (%s) RETURNING *", columns, placeholders)

	// Execute query and get result
	row := db.QueryRow(insertQuery, values...)

	// Scan the returned row
	resultValues := make([]interface{}, len(columnNames))
	resultPtrs := make([]interface{}, len(columnNames))
	for i := range resultValues {
		resultPtrs[i] = &resultValues[i]
	}

	if err := row.Scan(resultPtrs...); err != nil {
		return nil, fmt.Errorf("failed to scan inserted row: %w", err)
	}

	// Build result map
	result := make(map[string]interface{})
	for i, colName := range columnNames {
		val := resultValues[i]
		if b, ok := val.([]byte); ok {
			result[colName] = string(b)
		} else {
			result[colName] = val
		}
	}

	return result, nil
}

// UpdateWhitelistRow updates a row in tracking.hohaddresswhitelist
func (s *HohAddressService) UpdateWhitelistRow(hohAddressDatabaseID string, rowID interface{}, data map[string]interface{}, username string) (map[string]interface{}, error) {
	db, err := s.connectToDatabase(hohAddressDatabaseID)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	// Get primary key column
	var pkColumn string
	err = db.QueryRow(`
		SELECT column_name 
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
		WHERE tc.table_schema = 'tracking' 
		AND tc.table_name = 'hohaddresswhitelist'
		AND tc.constraint_type = 'PRIMARY KEY'
		LIMIT 1
	`).Scan(&pkColumn)

	if err != nil {
		// Fallback to first column
		err = db.QueryRow(`
			SELECT column_name 
			FROM information_schema.columns 
			WHERE table_schema = 'tracking' 
			AND table_name = 'hohaddresswhitelist'
			ORDER BY ordinal_position
			LIMIT 1
		`).Scan(&pkColumn)
		if err != nil {
			return nil, fmt.Errorf("failed to determine primary key: %w", err)
		}
	}

	// Get all column names
	columnsQuery := `
		SELECT column_name 
		FROM information_schema.columns 
		WHERE table_schema = 'tracking' 
		AND table_name = 'hohaddresswhitelist'
		ORDER BY ordinal_position
	`
	colRows, err := db.Query(columnsQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}
	defer colRows.Close()

	var columnNames []string
	for colRows.Next() {
		var colName string
		if err := colRows.Scan(&colName); err != nil {
			return nil, fmt.Errorf("failed to scan column name: %w", err)
		}
		columnNames = append(columnNames, colName)
	}

	// Get current row to check if uniqueness fields are being changed
	var currentAddress1Upd, currentAddress2Upd, currentCityUpd, currentCity, currentState interface{}
	var currentZip interface{}
	err = db.QueryRow(fmt.Sprintf("SELECT address1_upd, address2_upd, city_upd, city, state, zip FROM tracking.hohaddresswhitelist WHERE %s = $1", pkColumn), rowID).Scan(
		&currentAddress1Upd, &currentAddress2Upd, &currentCityUpd, &currentCity, &currentState, &currentZip)
	if err != nil {
		return nil, fmt.Errorf("failed to get current row: %w", err)
	}

	// Get values for _upd functions
	address1, hasAddress1 := data["address1"].(string)
	address2, hasAddress2 := data["address2"].(string)
	city, hasCity := data["city"].(string)
	state, hasState := data["state"]
	zip, hasZip := data["zip"]

	// Calculate new _upd values if fields are being updated
	var address1Upd, address2Upd, cityUpd string
	if hasAddress1 && address1 != "" {
		err = db.QueryRow("SELECT tracking.get_hohaddress1($1)", address1).Scan(&address1Upd)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate address1_upd: %w", err)
		}
	} else {
		address1Upd = fmt.Sprintf("%v", currentAddress1Upd)
	}
	if hasAddress2 && address2 != "" {
		err = db.QueryRow("SELECT tracking.get_hohaddress2($1)", address2).Scan(&address2Upd)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate address2_upd: %w", err)
		}
	} else {
		address2Upd = fmt.Sprintf("%v", currentAddress2Upd)
	}
	if hasCity && city != "" {
		err = db.QueryRow("SELECT tracking.get_hohcity($1)", city).Scan(&cityUpd)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate city_upd: %w", err)
		}
	} else {
		cityUpd = fmt.Sprintf("%v", currentCityUpd)
	}

	// Use new values or current values for uniqueness check
	checkCity := city
	if !hasCity {
		checkCity = fmt.Sprintf("%v", currentCity)
	}
	checkState := state
	if !hasState {
		checkState = currentState
	}
	checkZip := zip
	if !hasZip {
		checkZip = currentZip
	}

	// Check uniqueness: address1_upd, address2_upd, city_upd, city, state, zip (excluding current row)
	checkQuery := fmt.Sprintf(`
		SELECT COUNT(*) 
		FROM tracking.hohaddresswhitelist 
		WHERE address1_upd = $1 
		AND address2_upd = $2 
		AND city_upd = $3 
		AND city = $4 
		AND state = $5 
		AND zip = $6
		AND %s != $7
	`, pkColumn)
	var count int
	err = db.QueryRow(checkQuery, address1Upd, address2Upd, cityUpd, checkCity, checkState, checkZip, rowID).Scan(&count)
	if err != nil {
		return nil, fmt.Errorf("failed to check uniqueness: %w", err)
	}
	if count > 0 {
		return nil, fmt.Errorf("a record with this combination of address1_upd, address2_upd, city_upd, city, state, and zip already exists")
	}

	// Build UPDATE query
	setClause := ""
	values := []interface{}{rowID}
	argIndex := 2

	for key, value := range data {
		if key == pkColumn {
			continue // Skip primary key in SET clause
		}
		if setClause != "" {
			setClause += ", "
		}

		// Handle special fields
		switch key {
		case "address1":
			setClause += fmt.Sprintf("%s = $%d", key, argIndex)
			values = append(values, value)
			argIndex++
			// Also update address1_upd if address1 is being updated
			if hasAddress1 && address1 != "" {
				if setClause != "" {
					setClause += ", "
				}
				setClause += fmt.Sprintf("address1_upd = tracking.get_hohaddress1($%d)", argIndex)
				values = append(values, address1)
				argIndex++
			}
			continue
		case "address2":
			setClause += fmt.Sprintf("%s = $%d", key, argIndex)
			values = append(values, value)
			argIndex++
			// Also update address2_upd if address2 is being updated
			if hasAddress2 && address2 != "" {
				if setClause != "" {
					setClause += ", "
				}
				setClause += fmt.Sprintf("address2_upd = tracking.get_hohaddress2($%d)", argIndex)
				values = append(values, address2)
				argIndex++
			}
			continue
		case "city":
			setClause += fmt.Sprintf("%s = $%d", key, argIndex)
			values = append(values, value)
			argIndex++
			// Also update city_upd if city is being updated
			if hasCity && city != "" {
				if setClause != "" {
					setClause += ", "
				}
				setClause += fmt.Sprintf("city_upd = tracking.get_hohcity($%d)", argIndex)
				values = append(values, city)
				argIndex++
			}
			continue
		case "address1_upd", "address2_upd", "city_upd":
			// Skip _upd fields - they are auto-updated
			continue
		case "updatedby":
			setClause += fmt.Sprintf("%s = $%d", key, argIndex)
			values = append(values, username)
			argIndex++
			continue
		case "updatedon":
			setClause += fmt.Sprintf("%s = CURRENT_TIMESTAMP", key)
			continue
		}

		// Regular field
		setClause += fmt.Sprintf("%s = $%d", key, argIndex)
		values = append(values, value)
		argIndex++
	}

	// Always update updatedby and updatedon
	if setClause != "" {
		setClause += ", "
	}
	setClause += fmt.Sprintf("updatedby = $%d, updatedon = CURRENT_TIMESTAMP", argIndex)
	values = append(values, username)
	argIndex++

	if setClause == "" {
		return nil, fmt.Errorf("no fields to update")
	}

	updateQuery := fmt.Sprintf("UPDATE tracking.hohaddresswhitelist SET %s WHERE %s = $1 RETURNING *", setClause, pkColumn)

	// Execute query and get result
	row := db.QueryRow(updateQuery, values...)

	// Scan the returned row
	resultValues := make([]interface{}, len(columnNames))
	resultPtrs := make([]interface{}, len(columnNames))
	for i := range resultValues {
		resultPtrs[i] = &resultValues[i]
	}

	if err := row.Scan(resultPtrs...); err != nil {
		return nil, fmt.Errorf("failed to scan updated row: %w", err)
	}

	// Build result map
	result := make(map[string]interface{})
	for i, colName := range columnNames {
		val := resultValues[i]
		if b, ok := val.([]byte); ok {
			result[colName] = string(b)
		} else {
			result[colName] = val
		}
	}

	return result, nil
}

// DeleteWhitelistRow deletes a row from tracking.hohaddresswhitelist
func (s *HohAddressService) DeleteWhitelistRow(hohAddressDatabaseID string, rowID interface{}) error {
	db, err := s.connectToDatabase(hohAddressDatabaseID)
	if err != nil {
		return err
	}
	defer db.Close()

	// Get primary key column
	var pkColumn string
	err = db.QueryRow(`
		SELECT column_name 
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
		WHERE tc.table_schema = 'tracking' 
		AND tc.table_name = 'hohaddresswhitelist'
		AND tc.constraint_type = 'PRIMARY KEY'
		LIMIT 1
	`).Scan(&pkColumn)

	if err != nil {
		// Fallback to first column
		err = db.QueryRow(`
			SELECT column_name 
			FROM information_schema.columns 
			WHERE table_schema = 'tracking' 
			AND table_name = 'hohaddresswhitelist'
			ORDER BY ordinal_position
			LIMIT 1
		`).Scan(&pkColumn)
		if err != nil {
			return fmt.Errorf("failed to determine primary key: %w", err)
		}
	}

	deleteQuery := fmt.Sprintf("DELETE FROM tracking.hohaddresswhitelist WHERE %s = $1", pkColumn)
	result, err := db.Exec(deleteQuery, rowID)
	if err != nil {
		return fmt.Errorf("failed to delete row: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("row not found")
	}

	return nil
}

// AddressCheckStep represents a single step in the address check process
type AddressCheckStep struct {
	StepName    string `json:"stepName"`
	Status      string `json:"status"`      // "pending", "processing", "completed", "error"
	Message     string `json:"message"`
	Details     string `json:"details"`
	Result      int    `json:"result"`      // 0 = error, 1 = success, -1 = not applicable
	StopProcess bool   `json:"stopProcess"` // If true, stop further checks
}

// AddressCheckResult contains the result of address status check with detailed steps
type AddressCheckResult struct {
	Success      int               `json:"success"`      // 1 = OK, 0 = Error
	Steps        []AddressCheckStep `json:"steps"`
	FinalMessage string            `json:"finalMessage"`
}

// CheckAddressStatus checks an address step by step and returns detailed information
func (s *HohAddressService) CheckAddressStatus(hohAddressDatabaseID string, address1, address2, city, state, zip, programType string) (*AddressCheckResult, error) {
	db, err := s.connectToDatabase(hohAddressDatabaseID)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	steps := []AddressCheckStep{}
	var finalSuccess int = 0
	var finalMessage string

	// Step 1: Normalize address using functions
	step1 := AddressCheckStep{
		StepName:    "Normalize Address",
		Status:      "processing",
		Message:     "Normalizing address using get_hohaddress1, get_hohaddress2, get_hohcity",
		Details:     "",
		Result:      -1,
		StopProcess: false,
	}
	steps = append(steps, step1)

	var normalizedA1, normalizedA2, normalizedCity string
	err = db.QueryRow(`
		SELECT 
			tracking.get_hohaddress1($1),
			tracking.get_hohaddress2($2),
			tracking.get_hohcity($3)
	`, address1, address2, city).Scan(&normalizedA1, &normalizedA2, &normalizedCity)
	if err != nil {
		// If normalization fails, use original values
		normalizedA1 = address1
		normalizedA2 = address2
		normalizedCity = city
		steps[len(steps)-1].Status = "completed"
		steps[len(steps)-1].Message = "Normalization functions failed, using original values"
		steps[len(steps)-1].Details = fmt.Sprintf("Original: %s, %s, %s", address1, address2, city)
	} else {
		steps[len(steps)-1].Status = "completed"
		steps[len(steps)-1].Message = "Address normalized successfully"
		steps[len(steps)-1].Details = fmt.Sprintf("Normalized: %s, %s, %s", normalizedA1, normalizedA2, normalizedCity)
	}

	// Step 2: Check in blacklist
	step2 := AddressCheckStep{
		StepName:    "Check Blacklist",
		Status:      "processing",
		Message:     "Checking if address exists in blacklist",
		Details:     "",
		Result:      -1,
		StopProcess: false,
	}
	steps = append(steps, step2)

	var inBlacklist bool
	err = db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM tracking.hohaddressblacklist
			WHERE address1_upd = $1
				AND address2_upd = $2
				AND city_upd = $3
				AND state = $4
				AND zip = $5
		)
	`, normalizedA1, normalizedA2, normalizedCity, state, zip).Scan(&inBlacklist)
	if err != nil {
		steps[len(steps)-1].Status = "error"
		steps[len(steps)-1].Message = "Error checking blacklist"
		steps[len(steps)-1].Details = err.Error()
		inBlacklist = false
	} else if inBlacklist {
		steps[len(steps)-1].Status = "completed"
		steps[len(steps)-1].Message = "Address found in blacklist"
		steps[len(steps)-1].Details = "Address is blocked"
		steps[len(steps)-1].Result = 0
		steps[len(steps)-1].StopProcess = true
		finalSuccess = 0
		finalMessage = "Address is in blacklist - CHECK FAILED"
		return &AddressCheckResult{
			Success:      finalSuccess,
			Steps:        steps,
			FinalMessage: finalMessage,
		}, nil
	} else {
		steps[len(steps)-1].Status = "completed"
		steps[len(steps)-1].Message = "Address not found in blacklist"
		steps[len(steps)-1].Details = "Proceeding to whitelist check"
		steps[len(steps)-1].Result = 1
	}

	// Step 3: Check in whitelist
	step3 := AddressCheckStep{
		StepName:    "Check Whitelist",
		Status:      "processing",
		Message:     "Checking if address exists in whitelist",
		Details:     "",
		Result:      -1,
		StopProcess: false,
	}
	steps = append(steps, step3)

	// Get occupancy first for whitelist comparison
	var occupancy int
	var programTypeNormalized string
	switch programType {
	case "LL", "LL+EBB", "LL+ACP":
		programTypeNormalized = "LL"
	case "EBB", "EBB+LL", "ACP", "ACP+LL":
		programTypeNormalized = "ACP"
	default:
		programTypeNormalized = programType
	}

	err = db.QueryRow(`
		SELECT COALESCE(MAX(total), 0)
		FROM tracking.hohaddressstatuslist
		WHERE address1 = $1
			AND address2 = $2
			AND city = $3
			AND state = $4
			AND zip = $5
			AND programtype = $6
	`, normalizedA1, normalizedA2, normalizedCity, state, zip, programTypeNormalized).Scan(&occupancy)
	if err != nil {
		occupancy = 0
	}

	var inWhitelist bool
	var whitelistCapacity int
	err = db.QueryRow(`
		SELECT 
			EXISTS(
				SELECT 1 FROM tracking.hohaddresswhitelist
				WHERE address1_upd = $1
					AND address2_upd = $2
					AND city_upd = $3
					AND state = $4
					AND zip = $5
			),
			COALESCE(MAX(capacity), 0)
		FROM tracking.hohaddresswhitelist
		WHERE address1_upd = $1
			AND address2_upd = $2
			AND city_upd = $3
			AND state = $4
			AND zip = $5
	`, normalizedA1, normalizedA2, normalizedCity, state, zip).Scan(&inWhitelist, &whitelistCapacity)
	if err != nil {
		steps[len(steps)-1].Status = "error"
		steps[len(steps)-1].Message = "Error checking whitelist"
		steps[len(steps)-1].Details = err.Error()
		inWhitelist = false
		whitelistCapacity = 0
	} else if inWhitelist {
		if whitelistCapacity > occupancy {
			steps[len(steps)-1].Status = "completed"
			steps[len(steps)-1].Message = "Address found in whitelist with sufficient capacity"
			steps[len(steps)-1].Details = fmt.Sprintf("Capacity: %d, Occupancy: %d", whitelistCapacity, occupancy)
			steps[len(steps)-1].Result = 1
			steps[len(steps)-1].StopProcess = true
			finalSuccess = 1
			finalMessage = fmt.Sprintf("Address is in whitelist with capacity %d (occupancy: %d) - CHECK PASSED", whitelistCapacity, occupancy)
			return &AddressCheckResult{
				Success:      finalSuccess,
				Steps:        steps,
				FinalMessage: finalMessage,
			}, nil
		} else {
			// capacity <= occupancy - это ошибка
			steps[len(steps)-1].Status = "completed"
			steps[len(steps)-1].Message = "Address found in whitelist but capacity exceeded or equal to occupancy"
			steps[len(steps)-1].Details = fmt.Sprintf("Capacity: %d, Occupancy: %d. Capacity must be greater than occupancy", whitelistCapacity, occupancy)
			steps[len(steps)-1].Result = 0
			steps[len(steps)-1].StopProcess = true
			finalSuccess = 0
			finalMessage = fmt.Sprintf("Address is in whitelist but capacity %d is less than or equal to occupancy %d - CHECK FAILED", whitelistCapacity, occupancy)
			return &AddressCheckResult{
				Success:      finalSuccess,
				Steps:        steps,
				FinalMessage: finalMessage,
			}, nil
		}
	} else {
		// Not found in whitelist - proceed to status list check
		steps[len(steps)-1].Status = "completed"
		steps[len(steps)-1].Message = "Address not found in whitelist"
		steps[len(steps)-1].Details = "Proceeding to status list check"
		steps[len(steps)-1].Result = -1
	}

	// Step 4: Check in statuslist
	step4 := AddressCheckStep{
		StepName:    "Check Status List",
		Status:      "processing",
		Message:     "Checking occupancy in status list",
		Details:     "",
		Result:      -1,
		StopProcess: false,
	}
	steps = append(steps, step4)

	if occupancy > 0 {
		if occupancy <= 5 {
			steps[len(steps)-1].Status = "completed"
			steps[len(steps)-1].Message = "Address found in status list with acceptable occupancy"
			steps[len(steps)-1].Details = fmt.Sprintf("Occupancy: %d (limit: 5)", occupancy)
			steps[len(steps)-1].Result = 1
			finalSuccess = 1
			finalMessage = fmt.Sprintf("Address is in status list with occupancy %d (within limit) - CHECK PASSED", occupancy)
		} else {
			steps[len(steps)-1].Status = "completed"
			steps[len(steps)-1].Message = "Address found in status list but occupancy exceeds limit"
			steps[len(steps)-1].Details = fmt.Sprintf("Occupancy: %d (limit: 5)", occupancy)
			steps[len(steps)-1].Result = 0
			finalSuccess = 0
			finalMessage = fmt.Sprintf("Address is in status list with occupancy %d (exceeds limit of 5) - CHECK FAILED", occupancy)
		}
	} else {
		steps[len(steps)-1].Status = "completed"
		steps[len(steps)-1].Message = "Address not found in status list"
		steps[len(steps)-1].Details = "No occupancy data found"
		steps[len(steps)-1].Result = 1
		finalSuccess = 1
		finalMessage = "Address not found in any list - CHECK PASSED"
	}

	return &AddressCheckResult{
		Success:      finalSuccess,
		Steps:        steps,
		FinalMessage: finalMessage,
	}, nil
}

