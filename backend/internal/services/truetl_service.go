package services

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	_ "github.com/lib/pq" // PostgreSQL driver
	"gorm.io/gorm"

	"truadmin/internal/database"
	"truadmin/internal/models"
)

// TruETLService handles business logic for TruETL databases
type TruETLService struct {
	db                *gorm.DB
	connectionService *ConnectionService
}

// NewTruETLService creates a new TruETL service
func NewTruETLService(connectionService *ConnectionService) *TruETLService {
	return &TruETLService{
		db:                database.GetDB(),
		connectionService: connectionService,
	}
}

// GetEligibleDatabases returns databases that have meta schema and dms_tables table
func (s *TruETLService) GetEligibleDatabases(connectionID string) ([]models.Database, error) {
	// Get connection
	conn, err := s.connectionService.GetConnection(connectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection: %w", err)
	}

	// Only PostgreSQL is supported for TruETL
	if conn.Type != "postgres" {
		return nil, fmt.Errorf("only PostgreSQL databases are supported for TruETL")
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

	// For each database, check if it has meta schema and dms_tables table
	for rows.Next() {
		var dbName string
		if err := rows.Scan(&dbName); err != nil {
			continue
		}

		fmt.Printf("Checking database: %s\n", dbName)

		// Connect to each database to check for meta.dms_tables
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

		// Check if meta schema and dms_tables table exist (case-insensitive)
		checkQuery := `
			SELECT EXISTS (
				SELECT 1
				FROM information_schema.tables
				WHERE LOWER(table_schema) = 'meta'
				AND LOWER(table_name) = 'dms_tables'
			)
		`

		var exists bool
		if err := dbConn.QueryRow(checkQuery).Scan(&exists); err != nil {
			// Log error for debugging
			fmt.Printf("Error checking database %s: %v\n", dbName, err)
			dbConn.Close()
			continue
		}

		fmt.Printf("Database %s - meta.dms_tables exists: %v\n", dbName, exists)

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

// AddDatabase adds a new database to TruETL
func (s *TruETLService) AddDatabase(req *models.TruETLDatabaseRequest) (*models.TruETLDatabase, error) {
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
	var existing models.TruETLDatabase
	if err := s.db.Where("connection_id = ? AND database_name = ?", req.ConnectionID, req.DatabaseName).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("database already added to TruETL")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing database: %w", err)
	}

	// Set display name if not provided
	displayName := req.DisplayName
	if displayName == "" {
		displayName = req.DatabaseName
	}

	// Create new TruETL database entry
	truETLDB := &models.TruETLDatabase{
		ID:           uuid.New().String(),
		ConnectionID: req.ConnectionID,
		DatabaseName: req.DatabaseName,
		DisplayName:  displayName,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// Save to database
	if err := s.db.Create(truETLDB).Error; err != nil {
		return nil, fmt.Errorf("failed to add database to TruETL: %w", err)
	}

	return truETLDB, nil
}

// GetDatabases retrieves all TruETL databases with connection details
func (s *TruETLService) GetDatabases() ([]models.TruETLDatabaseWithConnection, error) {
	var truETLDatabases []models.TruETLDatabase
	if err := s.db.Order("created_at DESC").Find(&truETLDatabases).Error; err != nil {
		return nil, fmt.Errorf("failed to get TruETL databases: %w", err)
	}

	// Enrich with connection details
	// Initialize as empty slice instead of nil to ensure JSON serializes as [] not null
	result := []models.TruETLDatabaseWithConnection{}
	for _, db := range truETLDatabases {
		conn, err := s.connectionService.GetConnection(db.ConnectionID)
		if err != nil {
			// Skip if connection not found (orphaned entry)
			continue
		}

		result = append(result, models.TruETLDatabaseWithConnection{
			TruETLDatabase: db,
			ConnectionName: conn.Name,
			ConnectionType: conn.Type,
		})
	}

	return result, nil
}

// GetDatabase retrieves a TruETL database by ID
func (s *TruETLService) GetDatabase(id string) (*models.TruETLDatabaseWithConnection, error) {
	var truETLDB models.TruETLDatabase
	if err := s.db.First(&truETLDB, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("TruETL database not found")
		}
		return nil, fmt.Errorf("failed to get TruETL database: %w", err)
	}

	// Get connection details
	conn, err := s.connectionService.GetConnection(truETLDB.ConnectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection: %w", err)
	}

	return &models.TruETLDatabaseWithConnection{
		TruETLDatabase: truETLDB,
		ConnectionName: conn.Name,
		ConnectionType: conn.Type,
	}, nil
}

// UpdateDatabase updates an existing TruETL database
func (s *TruETLService) UpdateDatabase(id string, req *models.TruETLDatabaseRequest) (*models.TruETLDatabase, error) {
	// Get existing database
	var truETLDB models.TruETLDatabase
	if err := s.db.First(&truETLDB, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("TruETL database not found")
		}
		return nil, fmt.Errorf("failed to get TruETL database: %w", err)
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
	var existing models.TruETLDatabase
	if err := s.db.Where("connection_id = ? AND database_name = ? AND id != ?", req.ConnectionID, req.DatabaseName, id).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("database already added to TruETL")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing database: %w", err)
	}

	// Set display name if not provided
	displayName := req.DisplayName
	if displayName == "" {
		displayName = req.DatabaseName
	}

	// Update fields
	truETLDB.ConnectionID = req.ConnectionID
	truETLDB.DatabaseName = req.DatabaseName
	truETLDB.DisplayName = displayName
	truETLDB.UpdatedAt = time.Now()

	// Save to database
	if err := s.db.Save(&truETLDB).Error; err != nil {
		return nil, fmt.Errorf("failed to update TruETL database: %w", err)
	}

	return &truETLDB, nil
}

// DeleteDatabase removes a database from TruETL
func (s *TruETLService) DeleteDatabase(id string) error {
	result := s.db.Delete(&models.TruETLDatabase{}, "id = ?", id)
	if result.Error != nil {
		return fmt.Errorf("failed to delete TruETL database: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("TruETL database not found")
	}
	return nil
}

// GetDMSTables retrieves all tables from meta.dms_tables for a TruETL database
func (s *TruETLService) GetDMSTables(truetlDatabaseID string) ([]map[string]interface{}, error) {
	// Get TruETL database info
	truETLDB, err := s.GetDatabase(truetlDatabaseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get TruETL database: %w", err)
	}

	// Get connection
	conn, err := s.connectionService.GetConnection(truETLDB.ConnectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection: %w", err)
	}

	// Connect to the specific database
	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		conn.Host, conn.Port, conn.Username, conn.Password, truETLDB.DatabaseName, conn.SSLMode)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	defer db.Close()

	// Query meta.dms_tables
	// Note: Using SELECT * to get all columns dynamically, so we can't safely ORDER BY
	// specific columns without knowing the schema. Frontend can sort if needed.
	query := "SELECT * FROM meta.dms_tables"
	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query meta.dms_tables: %w", err)
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}

	// Log column names for debugging
	fmt.Printf("meta.dms_tables columns: %v\n", columns)

	// Scan rows into maps
	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
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
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	fmt.Printf("GetDMSFields returning %d fields\n", len(results))
	return results, nil
}

// GetDMSFields retrieves all fields from meta.dms_fields for given table IDs
func (s *TruETLService) GetDMSFields(truetlDatabaseID string, tableIDs []int) ([]map[string]interface{}, error) {
	fmt.Printf("GetDMSFields called with database ID: %s, table IDs: %v\n", truetlDatabaseID, tableIDs)
	
	if len(tableIDs) == 0 {
		fmt.Println("No table IDs provided, returning empty result")
		return []map[string]interface{}{}, nil
	}

	// Get TruETL database info
	truETLDB, err := s.GetDatabase(truetlDatabaseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get TruETL database: %w", err)
	}

	// Get connection
	conn, err := s.connectionService.GetConnection(truETLDB.ConnectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection: %w", err)
	}

	// Connect to the specific database
	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		conn.Host, conn.Port, conn.Username, conn.Password, truETLDB.DatabaseName, conn.SSLMode)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	defer db.Close()

	// Build query with table IDs
	query := "SELECT * FROM meta.dms_fields WHERE table_id = ANY($1) ORDER BY table_id, row_order"
	fmt.Printf("Executing query: %s with table IDs: %v\n", query, tableIDs)
	rows, err := db.Query(query, pq.Array(tableIDs))
	if err != nil {
		return nil, fmt.Errorf("failed to query meta.dms_fields: %w", err)
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}
	fmt.Printf("meta.dms_fields columns: %v\n", columns)

	// Scan rows into maps
	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
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
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	fmt.Printf("GetDMSFields returning %d fields\n", len(results))
	return results, nil
}
