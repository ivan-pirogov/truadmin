package services

import (
	"log"
	"time"

	"gorm.io/gorm"

	"truadmin/internal/database"
	"truadmin/internal/models"
)

// UserLogService handles logging of User operations
type UserLogService struct {
	db *gorm.DB
}

// NewUserLogService creates a new User log service
func NewUserLogService() *UserLogService {
	return &UserLogService{
		db: database.GetDB(),
	}
}

// LogOperation logs a user operation
func (s *UserLogService) LogOperation(
	userID string,
	changedByID string,
	operation string, // "create", "delete", "change_password", "block", "unblock"
	status models.UserSaveLogStatus,
	errorMessage string,
) error {
	logEntry := models.UserSaveLog{
		UserID:       userID,
		ChangedByID:  changedByID,
		Operation:    operation,
		Status:       status,
		ErrorMessage: errorMessage,
		CreatedAt:    time.Now(),
	}

	if err := s.db.Create(&logEntry).Error; err != nil {
		log.Printf("ERROR: Failed to log User operation: %v", err)
		log.Printf("  userID: %s, changedByID: %s, operation: %s, status: %s", userID, changedByID, operation, status)
		return err
	}

	log.Printf("✅ Logged User operation: userID=%s, changedByID=%s, operation=%s, status=%s",
		userID, changedByID, operation, status)
	return nil
}

// GetLogs retrieves logs for users
func (s *UserLogService) GetLogs(limit int) ([]models.UserSaveLog, error) {
	var logs []models.UserSaveLog

	query := s.db.Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&logs).Error; err != nil {
		return nil, err
	}

	return logs, nil
}

// GetLogsByUser retrieves logs for a specific user
func (s *UserLogService) GetLogsByUser(userID string, limit int) ([]models.UserSaveLog, error) {
	var logs []models.UserSaveLog

	query := s.db.Where("user_id = ?", userID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&logs).Error; err != nil {
		return nil, err
	}

	return logs, nil
}

