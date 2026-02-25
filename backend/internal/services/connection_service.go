package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"truadmin/internal/database"
	"truadmin/internal/models"
)

// ConnectionService handles business logic for database connections
type ConnectionService struct {
	db *gorm.DB
}

// NewConnectionService creates a new connection service
func NewConnectionService() *ConnectionService {
	return &ConnectionService{
		db: database.GetDB(),
	}
}

// CreateConnection creates a new database connection configuration
func (s *ConnectionService) CreateConnection(req *models.ConnectionRequest) (*models.Connection, error) {
	// Validate connection parameters
	if err := s.validateConnectionRequest(req); err != nil {
		return nil, fmt.Errorf("validation error: %w", err)
	}

	// Check if connection with same name already exists
	var existing models.Connection
	if err := s.db.Where("name = ?", req.Name).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("connection with name '%s' already exists", req.Name)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing connection: %w", err)
	}

	// Create new connection
	conn := &models.Connection{
		ID:        uuid.New().String(),
		Name:      req.Name,
		Type:      req.Type,
		Host:      req.Host,
		Port:      req.Port,
		Database:  req.Database,
		Username:  req.Username,
		Password:  req.Password, // TODO: Encrypt password before storing
		SSLMode:   req.SSLMode,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Save to database
	if err := s.db.Create(conn).Error; err != nil {
		return nil, fmt.Errorf("failed to create connection: %w", err)
	}

	return conn, nil
}

// GetConnection retrieves a connection by ID
func (s *ConnectionService) GetConnection(id string) (*models.Connection, error) {
	var conn models.Connection
	if err := s.db.First(&conn, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("connection not found")
		}
		return nil, fmt.Errorf("failed to get connection: %w", err)
	}
	return &conn, nil
}

// GetAllConnections retrieves all connections
func (s *ConnectionService) GetAllConnections() ([]*models.Connection, error) {
	var connections []*models.Connection
	if err := s.db.Order("created_at DESC").Find(&connections).Error; err != nil {
		return nil, fmt.Errorf("failed to get connections: %w", err)
	}
	return connections, nil
}

// DeleteConnection removes a connection by ID
func (s *ConnectionService) DeleteConnection(id string) error {
	result := s.db.Delete(&models.Connection{}, "id = ?", id)
	if result.Error != nil {
		return fmt.Errorf("failed to delete connection: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("connection not found")
	}
	return nil
}

// UpdateConnection updates an existing connection
func (s *ConnectionService) UpdateConnection(id string, req *models.ConnectionRequest) (*models.Connection, error) {
	// Validate connection parameters
	if err := s.validateConnectionRequest(req); err != nil {
		return nil, fmt.Errorf("validation error: %w", err)
	}

	// Get existing connection
	conn, err := s.GetConnection(id)
	if err != nil {
		return nil, err
	}

	// Check if another connection with same name exists
	var existing models.Connection
	if err := s.db.Where("name = ? AND id != ?", req.Name, id).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("connection with name '%s' already exists", req.Name)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing connection: %w", err)
	}

	// Update connection fields
	conn.Name = req.Name
	conn.Type = req.Type
	conn.Host = req.Host
	conn.Port = req.Port
	conn.Database = req.Database
	conn.Username = req.Username
	if req.Password != "" {
		conn.Password = req.Password // TODO: Encrypt password before storing
	}
	conn.SSLMode = req.SSLMode
	conn.UpdatedAt = time.Now()

	// Save to database
	if err := s.db.Save(conn).Error; err != nil {
		return nil, fmt.Errorf("failed to update connection: %w", err)
	}

	return conn, nil
}

// validateConnectionRequest validates connection request parameters
func (s *ConnectionService) validateConnectionRequest(req *models.ConnectionRequest) error {
	if req.Name == "" {
		return fmt.Errorf("connection name is required")
	}
	if req.Type == "" {
		return fmt.Errorf("connection type is required")
	}
	if req.Host == "" {
		return fmt.Errorf("host is required")
	}
	if req.Port <= 0 || req.Port > 65535 {
		return fmt.Errorf("invalid port number")
	}
	if req.Database == "" {
		return fmt.Errorf("database name is required")
	}
	if req.Username == "" {
		return fmt.Errorf("username is required")
	}

	// Validate connection type
	validTypes := map[string]bool{
		"postgres":  true,
		"mysql":     true,
		"sqlite":    true,
		"mariadb":   true,
		"mssql":     true,
		"snowflake": true,
	}
	if !validTypes[req.Type] {
		return fmt.Errorf("invalid connection type: %s", req.Type)
	}

	return nil
}
