package services

import (
	"log"
	"time"

	"gorm.io/gorm"

	"truadmin/internal/database"
	"truadmin/internal/models"
)

// TruETLLogService handles logging of TruETL save operations
type TruETLLogService struct {
	db *gorm.DB
}

// NewTruETLLogService creates a new TruETL log service
func NewTruETLLogService() *TruETLLogService {
	return &TruETLLogService{
		db: database.GetDB(),
	}
}

// LogSaveOperation logs a save operation
func (s *TruETLLogService) LogSaveOperation(
	truetlDatabaseID string,
	userID string,
	status models.TruETLSaveLogStatus,
	changesSummary models.ChangesSummary,
	sqlScript string,
	errorMessage string,
	executionTimeMs int,
) error {
	logEntry := models.TruETLSaveLog{
		TruETLDatabaseID: truetlDatabaseID,
		UserID:           userID,
		Status:           status,
		ChangesSummary:   changesSummary,
		SQLScript:        sqlScript,
		ErrorMessage:     errorMessage,
		ExecutionTimeMs:  executionTimeMs,
		CreatedAt:        time.Now(),
	}

	if err := s.db.Create(&logEntry).Error; err != nil {
		log.Printf("ERROR: Failed to log TruETL save operation: %v", err)
		log.Printf("  truetlDatabaseID: %s, userID: %s, status: %s", truetlDatabaseID, userID, status)
		return err
	}

	log.Printf("✅ Logged TruETL save operation: truetlDatabaseID=%s, userID=%s, status=%s, executionTime=%dms",
		truetlDatabaseID, userID, status, executionTimeMs)
	return nil
}

// GetSaveLogs retrieves save logs for a specific TruETL database
func (s *TruETLLogService) GetSaveLogs(truetlDatabaseID string, limit int) ([]models.TruETLSaveLog, error) {
	var logs []models.TruETLSaveLog

	query := s.db.Where("truetl_database_id = ?", truetlDatabaseID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&logs).Error; err != nil {
		return nil, err
	}

	return logs, nil
}
