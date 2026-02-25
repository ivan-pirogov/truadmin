package services

import (
	"log"
	"time"

	"gorm.io/gorm"

	"truadmin/internal/database"
	"truadmin/internal/models"
)

// ConnectionLogService handles logging of Connection operations
type ConnectionLogService struct {
	db *gorm.DB
}

// NewConnectionLogService creates a new Connection log service
func NewConnectionLogService() *ConnectionLogService {
	return &ConnectionLogService{
		db: database.GetDB(),
	}
}

// LogOperation logs a connection operation
func (s *ConnectionLogService) LogOperation(
	connectionID string,
	userID string,
	operation string, // "create", "update", "delete"
	status models.ConnectionSaveLogStatus,
	changesSummary models.ConnectionChangesSummary,
	errorMessage string,
) error {
	logEntry := models.ConnectionSaveLog{
		ConnectionID:   connectionID,
		UserID:         userID,
		Operation:      operation,
		Status:         status,
		ChangesSummary: changesSummary,
		ErrorMessage:   errorMessage,
		CreatedAt:      time.Now(),
	}

	if err := s.db.Create(&logEntry).Error; err != nil {
		log.Printf("ERROR: Failed to log Connection operation: %v", err)
		log.Printf("  connectionID: %s, userID: %s, operation: %s, status: %s", connectionID, userID, operation, status)
		return err
	}

	log.Printf("✅ Logged Connection operation: connectionID=%s, userID=%s, operation=%s, status=%s",
		connectionID, userID, operation, status)
	return nil
}

// GetLogs retrieves logs for connections
func (s *ConnectionLogService) GetLogs(limit int) ([]models.ConnectionSaveLog, error) {
	var logs []models.ConnectionSaveLog

	query := s.db.Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&logs).Error; err != nil {
		return nil, err
	}

	return logs, nil
}

// GetLogsByConnection retrieves logs for a specific connection
func (s *ConnectionLogService) GetLogsByConnection(connectionID string, limit int) ([]models.ConnectionSaveLog, error) {
	var logs []models.ConnectionSaveLog

	query := s.db.Where("connection_id = ?", connectionID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&logs).Error; err != nil {
		return nil, err
	}

	return logs, nil
}

