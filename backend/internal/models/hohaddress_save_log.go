package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// HohAddressSaveLogStatus represents the status of a save operation
type HohAddressSaveLogStatus string

const (
	HohAddressSaveStatusSuccess HohAddressSaveLogStatus = "success"
	HohAddressSaveStatusError   HohAddressSaveLogStatus = "error"
	HohAddressSaveStatusPartial HohAddressSaveLogStatus = "partial"
)

// HohAddressChangesSummary represents a summary of changes made during save
type HohAddressChangesSummary struct {
	Blacklist struct {
		Deleted int `json:"deleted"`
		Updated int `json:"updated"`
		Added   int `json:"added"`
	} `json:"blacklist"`
	Whitelist struct {
		Deleted int `json:"deleted"`
		Updated int `json:"updated"`
		Added   int `json:"added"`
	} `json:"whitelist"`
}

// Value implements driver.Valuer interface for JSON storage
func (c HohAddressChangesSummary) Value() (driver.Value, error) {
	return json.Marshal(c)
}

// Scan implements sql.Scanner interface for JSON retrieval
func (c *HohAddressChangesSummary) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, c)
}

// HohAddressSaveLog represents a log entry for HohAddress save operations
type HohAddressSaveLog struct {
	ID                  int                       `gorm:"primaryKey;autoIncrement" json:"id"`
	HohAddressDatabaseID string                    `gorm:"column:hohaddress_database_id;type:varchar(36);not null;index" json:"hohaddress_database_id"`
	UserID              string                    `gorm:"column:user_id;type:varchar(36);index" json:"user_id"`
	Status              HohAddressSaveLogStatus   `gorm:"column:status;type:varchar(20);not null" json:"status"`
	ChangesSummary      HohAddressChangesSummary  `gorm:"column:changes_summary;type:text" json:"changes_summary"`
	SQLScript           string                    `gorm:"column:sql_script;type:text" json:"sql_script,omitempty"`
	ErrorMessage        string                    `gorm:"column:error_message;type:text" json:"error_message,omitempty"`
	ExecutionTimeMs     int                       `gorm:"column:execution_time_ms;not null;default:0" json:"execution_time_ms"`
	CreatedAt           time.Time                 `gorm:"column:created_at;autoCreateTime;index" json:"created_at"`
}

// TableName specifies the table name for GORM
func (HohAddressSaveLog) TableName() string {
	return "hohaddress_save_logs"
}

