package models

import (
	"time"
)

// UserSaveLogStatus represents the status of a user operation
type UserSaveLogStatus string

const (
	UserSaveStatusSuccess UserSaveLogStatus = "success"
	UserSaveStatusError   UserSaveLogStatus = "error"
)

// UserSaveLog represents a log entry for User operations
type UserSaveLog struct {
	ID          int               `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      string            `gorm:"column:user_id;type:varchar(36);index" json:"user_id"`
	ChangedByID string            `gorm:"column:changed_by_id;type:varchar(36);index" json:"changed_by_id"`
	Operation   string            `gorm:"column:operation;type:varchar(20);not null" json:"operation"` // create, delete, change_password, block, unblock
	Status      UserSaveLogStatus `gorm:"column:status;type:varchar(20);not null" json:"status"`
	ErrorMessage string           `gorm:"column:error_message;type:text" json:"error_message,omitempty"`
	CreatedAt   time.Time         `gorm:"column:created_at;autoCreateTime;index" json:"created_at"`
}

// TableName specifies the table name for GORM
func (UserSaveLog) TableName() string {
	return "user_save_logs"
}

