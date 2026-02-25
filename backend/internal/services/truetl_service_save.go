package services

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq" // PostgreSQL driver
)

// SaveDMSFields saves field changes to meta.dms_tables
func (s *TruETLService) SaveDMSFields(truetlDatabaseID string, tableKey string, changes []map[string]interface{}) error {
	// Get TruETL database info
	truETLDB, err := s.GetDatabase(truetlDatabaseID)
	if err != nil {
		return fmt.Errorf("failed to get TruETL database: %w", err)
	}

	// Get connection
	conn, err := s.connectionService.GetConnection(truETLDB.ConnectionID)
	if err != nil {
		return fmt.Errorf("failed to get connection: %w", err)
	}

	// Connect to the specific database
	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		conn.Host, conn.Port, conn.Username, conn.Password, truETLDB.DatabaseName, conn.SSLMode)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer db.Close()

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Process each change
	for _, change := range changes {
		status, ok := change["_changeStatus"].(string)
		if !ok {
			continue
		}

		switch status {
		case "added":
			// Insert new record
			// Calculate next id from max(id) + 1 (since id is NOT NULL and may not have sequence)
			isPrimaryKey := 0
			if pk, ok := change["is_primary_key"].(bool); ok && pk {
				isPrimaryKey = 1
			}
			
			// Convert row_order to int
			rowOrder := 0
			if ro, ok := change["row_order"].(float64); ok {
				rowOrder = int(ro)
			} else if ro, ok := change["row_order"].(int); ok {
				rowOrder = ro
			}
			
			// Get max id first
			var maxID sql.NullInt64
			maxIDQuery := `SELECT MAX(id) FROM meta.dms_tables`
			err := tx.QueryRow(maxIDQuery).Scan(&maxID)
			nextID := 1
			if err == nil && maxID.Valid {
				nextID = int(maxID.Int64) + 1
			}
			
			insertQuery := `
				INSERT INTO meta.dms_tables (
					id, service_name, source_db_name, source_db_type, source_schema_name, source_table_name,
					source_field_name, source_field_type,
					target_db_name, target_db_type, target_schema_name, target_table_name,
					target_field_name, target_field_type, target_field_value,
					is_id, row_num
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
				RETURNING id
			`
			
			var newID int
			err = tx.QueryRow(insertQuery,
				nextID,
				getStringValue(change["service_name"]),
				getStringValue(change["source_db_name"]),
				getStringValue(change["source_db_type"]),
				getStringValue(change["source_schema"]),
				getStringValue(change["source_table"]),
				getStringValue(change["source_field"]),
				getStringValue(change["source_type"]),
				getStringValue(change["target_db_name"]),
				getStringValue(change["target_db_type"]),
				getStringValue(change["target_schema"]),
				getStringValue(change["target_table"]),
				getStringValue(change["target_field"]),
				getStringValue(change["target_type"]),
				getStringValue(change["target_value"]),
				isPrimaryKey,
				rowOrder,
			).Scan(&newID)
			if err != nil {
				return fmt.Errorf("failed to insert field: %w", err)
			}
			fmt.Printf("Inserted new field with id: %d\n", newID)

		case "modified":
			// Update existing record by id
			var id int
			if idFloat, ok := change["id"].(float64); ok && idFloat > 0 {
				id = int(idFloat)
			} else if idInt, ok := change["id"].(int); ok && idInt > 0 {
				id = idInt
			} else {
				continue
			}
			
			updateQuery := `
				UPDATE meta.dms_tables SET
					source_field_name = $1,
					source_field_type = $2,
					target_field_name = $3,
					target_field_type = $4,
					target_field_value = $5,
					is_id = $6,
					row_num = $7
				WHERE id = $8
			`
			isPrimaryKey := 0
			if pk, ok := change["is_primary_key"].(bool); ok && pk {
				isPrimaryKey = 1
			}
			
			// Convert row_order to int
			rowOrder := 0
			if ro, ok := change["row_order"].(float64); ok {
				rowOrder = int(ro)
			} else if ro, ok := change["row_order"].(int); ok {
				rowOrder = ro
			}
			
			_, err := tx.Exec(updateQuery,
				getStringValue(change["source_field"]),
				getStringValue(change["source_type"]),
				getStringValue(change["target_field"]),
				getStringValue(change["target_type"]),
				getStringValue(change["target_value"]),
				isPrimaryKey,
				rowOrder,
				id,
			)
			if err != nil {
				return fmt.Errorf("failed to update field: %w", err)
			}

		case "deleted":
			// Delete record by id
			var id int
			if idFloat, ok := change["id"].(float64); ok && idFloat > 0 {
				id = int(idFloat)
			} else if idInt, ok := change["id"].(int); ok && idInt > 0 {
				id = idInt
			} else {
				continue
			}
			
			deleteQuery := `DELETE FROM meta.dms_tables WHERE id = $1`
			_, err := tx.Exec(deleteQuery, id)
			if err != nil {
				return fmt.Errorf("failed to delete field: %w", err)
			}
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	fmt.Printf("Successfully saved %d field changes\n", len(changes))
	return nil
}

// Helper function to safely extract string value from interface{}
func getStringValue(v interface{}) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}

