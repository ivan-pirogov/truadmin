package services

import (
	"log"
	"time"

	"gorm.io/gorm"

	"truadmin/internal/database"
	"truadmin/internal/models"
)

// RoleLogService handles logging of Role operations
type RoleLogService struct {
	db *gorm.DB
}

// NewRoleLogService creates a new Role log service
func NewRoleLogService() *RoleLogService {
	return &RoleLogService{
		db: database.GetDB(),
	}
}

// LogOperation logs a role operation
func (s *RoleLogService) LogOperation(
	connectionID string,
	roleID string,
	userID string,
	operation string, // "create", "update", "delete", "grant_privileges", "revoke_privileges", "grant_membership", "revoke_membership"
	status models.RoleSaveLogStatus,
	errorMessage string,
) error {
	logEntry := models.RoleSaveLog{
		ConnectionID: connectionID,
		RoleID:       roleID,
		UserID:       userID,
		Operation:    operation,
		Status:       status,
		ErrorMessage: errorMessage,
		CreatedAt:    time.Now(),
	}

	if err := s.db.Create(&logEntry).Error; err != nil {
		log.Printf("ERROR: Failed to log Role operation: %v", err)
		log.Printf("  connectionID: %s, roleID: %s, userID: %s, operation: %s, status: %s", connectionID, roleID, userID, operation, status)
		return err
	}

	log.Printf("✅ Logged Role operation: connectionID=%s, roleID=%s, userID=%s, operation=%s, status=%s",
		connectionID, roleID, userID, operation, status)
	return nil
}

// GetLogs retrieves logs for roles
func (s *RoleLogService) GetLogs(limit int) ([]models.RoleSaveLog, error) {
	var logs []models.RoleSaveLog

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
func (s *RoleLogService) GetLogsByConnection(connectionID string, limit int) ([]models.RoleSaveLog, error) {
	var logs []models.RoleSaveLog

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

// GetLogsByRole retrieves logs for a specific role
func (s *RoleLogService) GetLogsByRole(connectionID, roleID string, limit int) ([]models.RoleSaveLog, error) {
	var logs []models.RoleSaveLog

	query := s.db.Where("connection_id = ? AND role_id = ?", connectionID, roleID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&logs).Error; err != nil {
		return nil, err
	}

	return logs, nil
}

