package models

import (
	"time"
)

// RoleSaveLogStatus represents the status of a role operation
type RoleSaveLogStatus string

const (
	RoleSaveStatusSuccess RoleSaveLogStatus = "success"
	RoleSaveStatusError   RoleSaveLogStatus = "error"
)

// RoleSaveLog represents a log entry for Role operations
type RoleSaveLog struct {
	ID           int               `gorm:"primaryKey;autoIncrement" json:"id"`
	ConnectionID string            `gorm:"column:connection_id;type:varchar(36);index" json:"connection_id"`
	RoleID       string            `gorm:"column:role_id;type:varchar(36);index" json:"role_id"`
	UserID       string            `gorm:"column:user_id;type:varchar(36);index" json:"user_id"`
	Operation    string            `gorm:"column:operation;type:varchar(30);not null" json:"operation"` // create, update, delete, grant_privileges, revoke_privileges, grant_membership, revoke_membership
	Status       RoleSaveLogStatus `gorm:"column:status;type:varchar(20);not null" json:"status"`
	ErrorMessage string            `gorm:"column:error_message;type:text" json:"error_message,omitempty"`
	CreatedAt    time.Time         `gorm:"column:created_at;autoCreateTime;index" json:"created_at"`
}

// TableName specifies the table name for GORM
func (RoleSaveLog) TableName() string {
	return "role_save_logs"
}

