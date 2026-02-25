package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// ConnectionSaveLogStatus represents the status of a connection operation
type ConnectionSaveLogStatus string

const (
	ConnectionSaveStatusSuccess ConnectionSaveLogStatus = "success"
	ConnectionSaveStatusError   ConnectionSaveLogStatus = "error"
)

// ConnectionChangesSummary represents a summary of changes made during connection operations
type ConnectionChangesSummary struct {
	Created int `json:"created"`
	Updated int `json:"updated"`
	Deleted int `json:"deleted"`
}

// Value implements driver.Valuer interface for JSON storage
func (c ConnectionChangesSummary) Value() (driver.Value, error) {
	return json.Marshal(c)
}

// Scan implements sql.Scanner interface for JSON retrieval
func (c *ConnectionChangesSummary) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, c)
}

// ConnectionSaveLog represents a log entry for Connection operations
type ConnectionSaveLog struct {
	ID             int                     `gorm:"primaryKey;autoIncrement" json:"id"`
	ConnectionID   string                  `gorm:"column:connection_id;type:varchar(36);index" json:"connection_id"`
	UserID         string                  `gorm:"column:user_id;type:varchar(36);index" json:"user_id"`
	Operation      string                  `gorm:"column:operation;type:varchar(20);not null" json:"operation"` // create, update, delete
	Status         ConnectionSaveLogStatus `gorm:"column:status;type:varchar(20);not null" json:"status"`
	ChangesSummary ConnectionChangesSummary `gorm:"column:changes_summary;type:text" json:"changes_summary"`
	ErrorMessage   string                  `gorm:"column:error_message;type:text" json:"error_message,omitempty"`
	CreatedAt      time.Time               `gorm:"column:created_at;autoCreateTime;index" json:"created_at"`
}

// TableName specifies the table name for GORM
func (ConnectionSaveLog) TableName() string {
	return "connection_save_logs"
}

