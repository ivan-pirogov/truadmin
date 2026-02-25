package services

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	_ "github.com/lib/pq" // PostgreSQL driver
	"truadmin/internal/models"
)

// SaveAllChangesRequest represents all changes to be saved
type SaveAllChangesRequest struct {
	Services struct {
		Deleted []string `json:"deleted"` // service_name_original
		Updated []struct {
			ServiceNameOriginal string `json:"service_name_original"`
			ServiceName         string `json:"service_name"`
			TargetDbType        string `json:"target_db_type"`
		} `json:"updated"`
	} `json:"services"`
	Databases struct {
		Deleted []string `json:"deleted"` // source_db_name_original
		Updated []struct {
			SourceDbNameOriginal string `json:"source_db_name_original"`
			SourceDbName         string `json:"source_db_name"`
			SourceSchemaName     string `json:"source_schema_name"`
			TargetDbName         string `json:"target_db_name"`
			TargetSchemaName     string `json:"target_schema_name"`
			SourceDbType         string `json:"source_db_type"`
		} `json:"updated"`
	} `json:"databases"`
	Tables struct {
		Deleted []string `json:"deleted"` // source_table_name_original
		Updated []struct {
			SourceTableNameOriginal string `json:"source_table_name_original"`
			SourceTableName         string `json:"source_table_name"`
			TargetTableName         string `json:"target_table_name"`
		} `json:"updated"`
	} `json:"tables"`
	Fields struct {
		Deleted []int `json:"deleted"` // ids
		Updated []struct {
			ID              int    `json:"id"`
			SourceFieldName string `json:"source_field_name"`
			SourceFieldType string `json:"source_field_type"`
			TargetFieldName string `json:"target_field_name"`
			TargetFieldType string `json:"target_field_type"`
			TargetFieldValue string `json:"target_field_value"`
			IsID            int    `json:"is_id"`
			RowNum          int    `json:"row_num"`
		} `json:"updated"`
		Added []struct {
			ServiceName      string `json:"service_name"`
			SourceDbName     string `json:"source_db_name"`
			SourceSchemaName string `json:"source_schema_name"`
			SourceTableName  string `json:"source_table_name"`
			SourceFieldName  string `json:"source_field_name"`
			SourceFieldType  string `json:"source_field_type"`
			TargetDbName     string `json:"target_db_name"`
			TargetSchemaName string `json:"target_schema_name"`
			TargetTableName  string `json:"target_table_name"`
			TargetFieldName  string `json:"target_field_name"`
			TargetFieldType  string `json:"target_field_type"`
			TargetFieldValue string `json:"target_field_value"`
			IsID             int    `json:"is_id"`
			RowNum           int    `json:"row_num"`
			SourceDbType     string `json:"source_db_type"`
			TargetDbType     string `json:"target_db_type"`
		} `json:"added"`
	} `json:"fields"`
}

// formatSQLWithArgs formats a SQL query with arguments for logging
func formatSQLWithArgs(query string, args ...interface{}) string {
	result := query
	for i, arg := range args {
		placeholder := fmt.Sprintf("$%d", i+1)
		var value string
		switch v := arg.(type) {
		case string:
			value = fmt.Sprintf("'%s'", strings.ReplaceAll(v, "'", "''"))
		case int:
			value = fmt.Sprintf("%d", v)
		case nil:
			value = "NULL"
		default:
			value = fmt.Sprintf("'%v'", v)
		}
		result = strings.Replace(result, placeholder, value, 1)
	}
	return result
}

// SaveAllChanges saves all changes (services, databases, tables, fields) to meta.dms_tables in one transaction
func (s *TruETLService) SaveAllChanges(truetlDatabaseID string, userID string, req *SaveAllChangesRequest, logService *TruETLLogService) error {
	startTime := time.Now()
	
	// Prepare changes summary for logging
	changesSummary := models.ChangesSummary{
		Services: struct {
			Deleted int `json:"deleted"`
			Updated int `json:"updated"`
		}{
			Deleted: len(req.Services.Deleted),
			Updated: len(req.Services.Updated),
		},
		Databases: struct {
			Deleted int `json:"deleted"`
			Updated int `json:"updated"`
		}{
			Deleted: len(req.Databases.Deleted),
			Updated: len(req.Databases.Updated),
		},
		Tables: struct {
			Deleted int `json:"deleted"`
			Updated int `json:"updated"`
		}{
			Deleted: len(req.Tables.Deleted),
			Updated: len(req.Tables.Updated),
		},
		Fields: struct {
			Deleted int `json:"deleted"`
			Updated int `json:"updated"`
			Added   int `json:"added"`
		}{
			Deleted: len(req.Fields.Deleted),
			Updated: len(req.Fields.Updated),
			Added:   len(req.Fields.Added),
		},
	}

	// Collect all SQL queries for logging
	var sqlQueries []string
	// Get TruETL database info
	truETLDB, err := s.GetDatabase(truetlDatabaseID)
	if err != nil {
		executionTime := int(time.Since(startTime).Milliseconds())
		if logService != nil {
			logService.LogSaveOperation(
				truetlDatabaseID,
				userID,
				models.SaveStatusError,
				changesSummary,
				"",
				fmt.Sprintf("failed to get TruETL database: %v", err),
				executionTime,
			)
		}
		return fmt.Errorf("failed to get TruETL database: %w", err)
	}

	// Get connection
	conn, err := s.connectionService.GetConnection(truETLDB.ConnectionID)
	if err != nil {
		executionTime := int(time.Since(startTime).Milliseconds())
		if logService != nil {
			logService.LogSaveOperation(
				truetlDatabaseID,
				userID,
				models.SaveStatusError,
				changesSummary,
				"",
				fmt.Sprintf("failed to get connection: %v", err),
				executionTime,
			)
		}
		return fmt.Errorf("failed to get connection: %w", err)
	}

	// Connect to the specific database
	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		conn.Host, conn.Port, conn.Username, conn.Password, truETLDB.DatabaseName, conn.SSLMode)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		executionTime := int(time.Since(startTime).Milliseconds())
		if logService != nil {
			logService.LogSaveOperation(
				truetlDatabaseID,
				userID,
				models.SaveStatusError,
				changesSummary,
				"",
				fmt.Sprintf("failed to connect to database: %v", err),
				executionTime,
			)
		}
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer db.Close()

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		executionTime := int(time.Since(startTime).Milliseconds())
		if logService != nil {
			logService.LogSaveOperation(
				truetlDatabaseID,
				userID,
				models.SaveStatusError,
				changesSummary,
				"",
				fmt.Sprintf("failed to begin transaction: %v", err),
				executionTime,
			)
		}
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Add BEGIN TRANSACTION to SQL log
	sqlQueries = append(sqlQueries, "BEGIN;")

	// 1. DELETE deleted services
	if len(req.Services.Deleted) > 0 {
		placeholders := make([]string, len(req.Services.Deleted))
		args := make([]interface{}, len(req.Services.Deleted))
		for i, name := range req.Services.Deleted {
			placeholders[i] = fmt.Sprintf("$%d", i+1)
			args[i] = name
		}
		query := fmt.Sprintf("DELETE FROM meta.dms_tables WHERE service_name IN (%s)", strings.Join(placeholders, ", "))
		sqlQueries = append(sqlQueries, formatSQLWithArgs(query, args...))
		_, err = tx.Exec(query, args...)
		if err != nil {
			executionTime := int(time.Since(startTime).Milliseconds())
			sqlScript := strings.Join(sqlQueries, "\n\n")
			if logService != nil {
				logService.LogSaveOperation(
					truetlDatabaseID,
					userID,
					models.SaveStatusError,
					changesSummary,
					sqlScript,
					fmt.Sprintf("failed to delete services: %v", err),
					executionTime,
				)
			}
			return fmt.Errorf("failed to delete services: %w", err)
		}
	}

	// 2. UPDATE updated services
	for _, service := range req.Services.Updated {
		query := `
			UPDATE meta.dms_tables 
			SET service_name = $1, target_db_type = $2
			WHERE service_name = $3
		`
		sqlQueries = append(sqlQueries, formatSQLWithArgs(query, service.ServiceName, service.TargetDbType, service.ServiceNameOriginal))
		_, err = tx.Exec(query, service.ServiceName, service.TargetDbType, service.ServiceNameOriginal)
		if err != nil {
			executionTime := int(time.Since(startTime).Milliseconds())
			sqlScript := strings.Join(sqlQueries, "\n\n")
			if logService != nil {
				logService.LogSaveOperation(
					truetlDatabaseID,
					userID,
					models.SaveStatusError,
					changesSummary,
					sqlScript,
					fmt.Sprintf("failed to update service %s: %v", service.ServiceNameOriginal, err),
					executionTime,
				)
			}
			return fmt.Errorf("failed to update service %s: %w", service.ServiceNameOriginal, err)
		}
	}

	// 3. DELETE deleted databases
	if len(req.Databases.Deleted) > 0 {
		placeholders := make([]string, len(req.Databases.Deleted))
		args := make([]interface{}, len(req.Databases.Deleted))
		for i, name := range req.Databases.Deleted {
			placeholders[i] = fmt.Sprintf("$%d", i+1)
			args[i] = name
		}
		query := fmt.Sprintf("DELETE FROM meta.dms_tables WHERE source_db_name IN (%s)", strings.Join(placeholders, ", "))
		sqlQueries = append(sqlQueries, formatSQLWithArgs(query, args...))
		_, err = tx.Exec(query, args...)
		if err != nil {
			executionTime := int(time.Since(startTime).Milliseconds())
			sqlScript := strings.Join(sqlQueries, "\n\n")
			if logService != nil {
				logService.LogSaveOperation(
					truetlDatabaseID,
					userID,
					models.SaveStatusError,
					changesSummary,
					sqlScript,
					fmt.Sprintf("failed to delete databases: %v", err),
					executionTime,
				)
			}
			return fmt.Errorf("failed to delete databases: %w", err)
		}
	}

	// 4. UPDATE updated databases
	for _, database := range req.Databases.Updated {
		query := `
			UPDATE meta.dms_tables 
			SET 
				source_db_name = $1,
				source_schema_name = $2,
				target_db_name = $3,
				target_schema_name = $4,
				source_db_type = $5
			WHERE source_db_name = $6
		`
		sqlQueries = append(sqlQueries, formatSQLWithArgs(query,
			database.SourceDbName,
			database.SourceSchemaName,
			database.TargetDbName,
			database.TargetSchemaName,
			database.SourceDbType,
			database.SourceDbNameOriginal,
		))
		_, err = tx.Exec(query,
			database.SourceDbName,
			database.SourceSchemaName,
			database.TargetDbName,
			database.TargetSchemaName,
			database.SourceDbType,
			database.SourceDbNameOriginal,
		)
		if err != nil {
			executionTime := int(time.Since(startTime).Milliseconds())
			sqlScript := strings.Join(sqlQueries, "\n\n")
			if logService != nil {
				logService.LogSaveOperation(
					truetlDatabaseID,
					userID,
					models.SaveStatusError,
					changesSummary,
					sqlScript,
					fmt.Sprintf("failed to update database %s: %v", database.SourceDbNameOriginal, err),
					executionTime,
				)
			}
			return fmt.Errorf("failed to update database %s: %w", database.SourceDbNameOriginal, err)
		}
	}

	// 5. DELETE deleted tables
	if len(req.Tables.Deleted) > 0 {
		placeholders := make([]string, len(req.Tables.Deleted))
		args := make([]interface{}, len(req.Tables.Deleted))
		for i, name := range req.Tables.Deleted {
			placeholders[i] = fmt.Sprintf("$%d", i+1)
			args[i] = name
		}
		query := fmt.Sprintf("DELETE FROM meta.dms_tables WHERE source_table_name IN (%s)", strings.Join(placeholders, ", "))
		sqlQueries = append(sqlQueries, formatSQLWithArgs(query, args...))
		_, err = tx.Exec(query, args...)
		if err != nil {
			executionTime := int(time.Since(startTime).Milliseconds())
			sqlScript := strings.Join(sqlQueries, "\n\n")
			if logService != nil {
				logService.LogSaveOperation(
					truetlDatabaseID,
					userID,
					models.SaveStatusError,
					changesSummary,
					sqlScript,
					fmt.Sprintf("failed to delete tables: %v", err),
					executionTime,
				)
			}
			return fmt.Errorf("failed to delete tables: %w", err)
		}
	}

	// 6. UPDATE updated tables
	for _, table := range req.Tables.Updated {
		query := `
			UPDATE meta.dms_tables 
			SET 
				source_table_name = $1,
				target_table_name = $2
			WHERE source_table_name = $3
		`
		sqlQueries = append(sqlQueries, formatSQLWithArgs(query, table.SourceTableName, table.TargetTableName, table.SourceTableNameOriginal))
		_, err = tx.Exec(query, table.SourceTableName, table.TargetTableName, table.SourceTableNameOriginal)
		if err != nil {
			executionTime := int(time.Since(startTime).Milliseconds())
			sqlScript := strings.Join(sqlQueries, "\n\n")
			if logService != nil {
				logService.LogSaveOperation(
					truetlDatabaseID,
					userID,
					models.SaveStatusError,
					changesSummary,
					sqlScript,
					fmt.Sprintf("failed to update table %s: %v", table.SourceTableNameOriginal, err),
					executionTime,
				)
			}
			return fmt.Errorf("failed to update table %s: %w", table.SourceTableNameOriginal, err)
		}
	}

	// 7. DELETE deleted fields
	if len(req.Fields.Deleted) > 0 {
		placeholders := make([]string, len(req.Fields.Deleted))
		args := make([]interface{}, len(req.Fields.Deleted))
		for i, id := range req.Fields.Deleted {
			placeholders[i] = fmt.Sprintf("$%d", i+1)
			args[i] = id
		}
		query := fmt.Sprintf("DELETE FROM meta.dms_tables WHERE id IN (%s)", strings.Join(placeholders, ", "))
		sqlQueries = append(sqlQueries, formatSQLWithArgs(query, args...))
		_, err = tx.Exec(query, args...)
		if err != nil {
			executionTime := int(time.Since(startTime).Milliseconds())
			sqlScript := strings.Join(sqlQueries, "\n\n")
			if logService != nil {
				logService.LogSaveOperation(
					truetlDatabaseID,
					userID,
					models.SaveStatusError,
					changesSummary,
					sqlScript,
					fmt.Sprintf("failed to delete fields: %v", err),
					executionTime,
				)
			}
			return fmt.Errorf("failed to delete fields: %w", err)
		}
	}

	// 8. UPDATE updated fields
	for _, field := range req.Fields.Updated {
		query := `
			UPDATE meta.dms_tables 
			SET 
				source_field_name = $1,
				source_field_type = $2,
				target_field_name = $3,
				target_field_type = $4,
				target_field_value = $5,
				is_id = $6,
				row_num = $7
			WHERE id = $8
		`
		sqlQueries = append(sqlQueries, formatSQLWithArgs(query,
			field.SourceFieldName,
			field.SourceFieldType,
			field.TargetFieldName,
			field.TargetFieldType,
			field.TargetFieldValue,
			field.IsID,
			field.RowNum,
			field.ID,
		))
		_, err = tx.Exec(query,
			field.SourceFieldName,
			field.SourceFieldType,
			field.TargetFieldName,
			field.TargetFieldType,
			field.TargetFieldValue,
			field.IsID,
			field.RowNum,
			field.ID,
		)
		if err != nil {
			executionTime := int(time.Since(startTime).Milliseconds())
			sqlScript := strings.Join(sqlQueries, "\n\n")
			if logService != nil {
				logService.LogSaveOperation(
					truetlDatabaseID,
					userID,
					models.SaveStatusError,
					changesSummary,
					sqlScript,
					fmt.Sprintf("failed to update field id %d: %v", field.ID, err),
					executionTime,
				)
			}
			return fmt.Errorf("failed to update field id %d: %w", field.ID, err)
		}
	}

	// 9. INSERT added fields (batch insert)
	if len(req.Fields.Added) > 0 {
		// Build batch INSERT query (id is auto-increment, so we don't include it)
		values := make([]string, len(req.Fields.Added))
		args := make([]interface{}, 0, len(req.Fields.Added)*16) // 16 fields (without id)
		argIndex := 1

		for i, field := range req.Fields.Added {
			valueParts := make([]string, 16) // 16 parameters (without id)
			for j := 0; j < 16; j++ {
				valueParts[j] = fmt.Sprintf("$%d", argIndex)
				argIndex++
			}
			values[i] = fmt.Sprintf("(%s)", strings.Join(valueParts, ", "))

			args = append(args,
				field.ServiceName,
				field.SourceDbName,
				field.SourceDbType,
				field.SourceSchemaName,
				field.SourceTableName,
				field.SourceFieldName,
				field.SourceFieldType,
				field.TargetDbName,
				field.TargetDbType,
				field.TargetSchemaName,
				field.TargetTableName,
				field.TargetFieldName,
				field.TargetFieldType,
				field.TargetFieldValue,
				field.IsID,
				field.RowNum,
			)
		}

		insertQuery := fmt.Sprintf(`
			INSERT INTO meta.dms_tables (
				service_name, source_db_name, source_db_type, source_schema_name, source_table_name,
				source_field_name, source_field_type,
				target_db_name, target_db_type, target_schema_name, target_table_name,
				target_field_name, target_field_type, target_field_value,
				is_id, row_num
			) VALUES %s
		`, strings.Join(values, ", "))

		sqlQueries = append(sqlQueries, formatSQLWithArgs(insertQuery, args...))
		_, err = tx.Exec(insertQuery, args...)
		if err != nil {
			executionTime := int(time.Since(startTime).Milliseconds())
			sqlScript := strings.Join(sqlQueries, "\n\n")
			if logService != nil {
				logService.LogSaveOperation(
					truetlDatabaseID,
					userID,
					models.SaveStatusError,
					changesSummary,
					sqlScript,
					fmt.Sprintf("failed to insert fields: %v", err),
					executionTime,
				)
			}
			return fmt.Errorf("failed to insert fields: %w", err)
		}
	}

	// Add COMMIT to SQL log
	sqlQueries = append(sqlQueries, "COMMIT;")

	// Commit transaction
	if err := tx.Commit(); err != nil {
		executionTime := int(time.Since(startTime).Milliseconds())
		sqlScript := strings.Join(sqlQueries, "\n\n")
		// Log error
		if logService != nil {
			logService.LogSaveOperation(
				truetlDatabaseID,
				userID,
				models.SaveStatusError,
				changesSummary,
				sqlScript,
				fmt.Sprintf("failed to commit transaction: %v", err),
				executionTime,
			)
		}
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Log successful save
	executionTime := int(time.Since(startTime).Milliseconds())
	sqlScript := strings.Join(sqlQueries, "\n\n")
	if logService != nil {
		if err := logService.LogSaveOperation(
			truetlDatabaseID,
			userID,
			models.SaveStatusSuccess,
			changesSummary,
			sqlScript,
			"",
			executionTime,
		); err != nil {
			// Log error but don't fail the save operation
			fmt.Printf("WARNING: Failed to log save operation: %v\n", err)
		}
	} else {
		fmt.Printf("WARNING: logService is nil, cannot log save operation\n")
	}

	return nil
}

