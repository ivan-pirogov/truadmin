package models

import "time"

// UserRole represents the role of a user
type UserRole string

const (
	RoleAdmin UserRole = "admin"
	RoleUser  UserRole = "user"
)

// User represents a user in the system
type User struct {
	ID        string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Username  string    `gorm:"type:varchar(255);not null;uniqueIndex" json:"username"`
	Password  string    `gorm:"type:text;not null" json:"-"` // Never return password in JSON
	Role      UserRole  `gorm:"type:varchar(50);not null;default:'user'" json:"role"`
	IsBlocked bool      `gorm:"type:boolean;not null;default:false" json:"is_blocked"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// SetupRequest represents the initial setup request payload
type SetupRequest struct {
	Password string `json:"password" binding:"required,min=6"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

// CreateUserRequest represents the request to create a new user (admin only)
type CreateUserRequest struct {
	Username string   `json:"username" binding:"required"`
	Password string   `json:"password" binding:"required,min=6"`
	Role     UserRole `json:"role" binding:"required"`
}

// SetupStatusResponse represents the setup status
type SetupStatusResponse struct {
	RequiresSetup bool `json:"requires_setup"`
}

// ChangePasswordRequest represents the request to change user password
type ChangePasswordRequest struct {
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// BlockUserRequest represents the request to block/unblock a user
type BlockUserRequest struct {
	IsBlocked bool `json:"is_blocked"`
}

// ChangeOwnPasswordRequest represents the request to change own password
type ChangeOwnPasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}
