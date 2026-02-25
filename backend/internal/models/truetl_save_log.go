package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// TruETLSaveLogStatus represents the status of a save operation
type TruETLSaveLogStatus string

const (
	SaveStatusSuccess TruETLSaveLogStatus = "success"
	SaveStatusError   TruETLSaveLogStatus = "error"
	SaveStatusPartial TruETLSaveLogStatus = "partial"
)

// ChangesSummary represents a summary of changes made during save
type ChangesSummary struct {
	Services struct {
		Deleted int `json:"deleted"`
		Updated int `json:"updated"`
	} `json:"services"`
	Databases struct {
		Deleted int `json:"deleted"`
		Updated int `json:"updated"`
	} `json:"databases"`
	Tables struct {
		Deleted int `json:"deleted"`
		Updated int `json:"updated"`
	} `json:"tables"`
	Fields struct {
		Deleted int `json:"deleted"`
		Updated int `json:"updated"`
		Added   int `json:"added"`
	} `json:"fields"`
}

// Value implements driver.Valuer interface for JSON storage
func (c ChangesSummary) Value() (driver.Value, error) {
	return json.Marshal(c)
}

// Scan implements sql.Scanner interface for JSON retrieval
func (c *ChangesSummary) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, c)
}

// TruETLSaveLog represents a log entry for TruETL save operations
type TruETLSaveLog struct {
	ID               int                 `gorm:"primaryKey;autoIncrement" json:"id"`
	TruETLDatabaseID string              `gorm:"column:truetl_database_id;type:varchar(36);not null;index" json:"truetl_database_id"`
	UserID           string              `gorm:"column:user_id;type:varchar(36);index" json:"user_id"`
	Status           TruETLSaveLogStatus `gorm:"column:status;type:varchar(20);not null" json:"status"`
	ChangesSummary   ChangesSummary      `gorm:"column:changes_summary;type:text" json:"changes_summary"`
	SQLScript        string              `gorm:"column:sql_script;type:text" json:"sql_script,omitempty"`
	ErrorMessage     string              `gorm:"column:error_message;type:text" json:"error_message,omitempty"`
	ExecutionTimeMs  int                 `gorm:"column:execution_time_ms;not null;default:0" json:"execution_time_ms"`
	CreatedAt        time.Time           `gorm:"column:created_at;autoCreateTime;index" json:"created_at"`
}

// TableName specifies the table name for GORM
func (TruETLSaveLog) TableName() string {
	return "truetl_save_logs"
}
