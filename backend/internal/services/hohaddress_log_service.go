package services

import (
	"log"
	"time"

	"gorm.io/gorm"

	"truadmin/internal/database"
	"truadmin/internal/models"
)

// HohAddressLogService handles logging of HohAddress save operations
type HohAddressLogService struct {
	db *gorm.DB
}

// NewHohAddressLogService creates a new HohAddress log service
func NewHohAddressLogService() *HohAddressLogService {
	return &HohAddressLogService{
		db: database.GetDB(),
	}
}

// LogSaveOperation logs a save operation
func (s *HohAddressLogService) LogSaveOperation(
	hohAddressDatabaseID string,
	userID string,
	status models.HohAddressSaveLogStatus,
	changesSummary models.HohAddressChangesSummary,
	sqlScript string,
	errorMessage string,
	executionTimeMs int,
) error {
	logEntry := models.HohAddressSaveLog{
		HohAddressDatabaseID: hohAddressDatabaseID,
		UserID:               userID,
		Status:               status,
		ChangesSummary:       changesSummary,
		SQLScript:            sqlScript,
		ErrorMessage:         errorMessage,
		ExecutionTimeMs:      executionTimeMs,
		CreatedAt:            time.Now(),
	}

	if err := s.db.Create(&logEntry).Error; err != nil {
		log.Printf("ERROR: Failed to log HohAddress save operation: %v", err)
		log.Printf("  hohAddressDatabaseID: %s, userID: %s, status: %s", hohAddressDatabaseID, userID, status)
		return err
	}

	log.Printf("✅ Logged HohAddress save operation: hohAddressDatabaseID=%s, userID=%s, status=%s, executionTime=%dms",
		hohAddressDatabaseID, userID, status, executionTimeMs)
	return nil
}

// GetSaveLogs retrieves save logs for a specific HohAddress database
func (s *HohAddressLogService) GetSaveLogs(hohAddressDatabaseID string, limit int) ([]models.HohAddressSaveLog, error) {
	var logs []models.HohAddressSaveLog

	query := s.db.Where("hohaddress_database_id = ?", hohAddressDatabaseID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&logs).Error; err != nil {
		return nil, err
	}

	return logs, nil
}

