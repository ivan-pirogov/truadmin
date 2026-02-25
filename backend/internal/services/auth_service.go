package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"truadmin/internal/database"
	"truadmin/internal/models"
)

// AuthService handles authentication logic
type AuthService struct {
	db        *gorm.DB
	jwtSecret string
}

// NewAuthService creates a new auth service
func NewAuthService(jwtSecret string) *AuthService {
	return &AuthService{
		db:        database.GetDB(),
		jwtSecret: jwtSecret,
	}
}

// JWTClaims represents the JWT claims
type JWTClaims struct {
	UserID   string           `json:"user_id"`
	Username string           `json:"username"`
	Role     models.UserRole  `json:"role"`
	jwt.RegisteredClaims
}

// RequiresSetup checks if the application requires initial setup
func (s *AuthService) RequiresSetup() (bool, error) {
	var count int64
	if err := s.db.Model(&models.User{}).Count(&count).Error; err != nil {
		return false, fmt.Errorf("failed to count users: %w", err)
	}
	return count == 0, nil
}

// InitialSetup creates the initial admin user
func (s *AuthService) InitialSetup(password string) error {
	// Check if setup is actually required
	requiresSetup, err := s.RequiresSetup()
	if err != nil {
		return err
	}
	if !requiresSetup {
		return fmt.Errorf("setup already completed")
	}

	// Validate password
	if len(password) < 6 {
		return fmt.Errorf("password must be at least 6 characters")
	}

	// Hash password
	hashedPassword, err := s.hashPassword(password)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Create admin user
	admin := &models.User{
		ID:        uuid.New().String(),
		Username:  "admin",
		Password:  hashedPassword,
		Role:      models.RoleAdmin,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.db.Create(admin).Error; err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	return nil
}

// Login authenticates a user and returns a JWT token
func (s *AuthService) Login(username, password string) (*models.LoginResponse, error) {
	// Find user by username
	var user models.User
	if err := s.db.Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invalid credentials")
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	// Check if user is blocked
	if user.IsBlocked {
		return nil, fmt.Errorf("user account is blocked")
	}

	// Verify password
	if !s.checkPassword(password, user.Password) {
		return nil, fmt.Errorf("invalid credentials")
	}

	// Generate JWT token
	token, err := s.generateToken(&user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &models.LoginResponse{
		Token: token,
		User:  &user,
	}, nil
}

// CreateUser creates a new user (admin only)
func (s *AuthService) CreateUser(req *models.CreateUserRequest) (*models.User, error) {
	// Validate request
	if req.Username == "" {
		return nil, fmt.Errorf("username is required")
	}
	if len(req.Password) < 6 {
		return nil, fmt.Errorf("password must be at least 6 characters")
	}
	if req.Role != models.RoleAdmin && req.Role != models.RoleUser {
		return nil, fmt.Errorf("invalid role")
	}

	// Check if user already exists
	var existing models.User
	if err := s.db.Where("username = ?", req.Username).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("user with username '%s' already exists", req.Username)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}

	// Hash password
	hashedPassword, err := s.hashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &models.User{
		ID:        uuid.New().String(),
		Username:  req.Username,
		Password:  hashedPassword,
		Role:      req.Role,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// GetAllUsers retrieves all users (admin only)
func (s *AuthService) GetAllUsers() ([]*models.User, error) {
	var users []*models.User
	if err := s.db.Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}
	return users, nil
}

// GetUserByID retrieves a user by ID
func (s *AuthService) GetUserByID(userID string) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}
	return &user, nil
}

// DeleteUser deletes a user by ID (admin only)
func (s *AuthService) DeleteUser(userID string) error {
	// Prevent deleting the last admin
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to find user: %w", err)
	}

	// Prevent deleting the "admin" user - this user can never be deleted
	if user.Username == "admin" {
		return fmt.Errorf("the default admin user cannot be deleted")
	}

	if user.Role == models.RoleAdmin {
		var adminCount int64
		if err := s.db.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&adminCount).Error; err != nil {
			return fmt.Errorf("failed to count admins: %w", err)
		}
		if adminCount <= 1 {
			return fmt.Errorf("cannot delete the last admin user")
		}
	}

	result := s.db.Delete(&models.User{}, "id = ?", userID)
	if result.Error != nil {
		return fmt.Errorf("failed to delete user: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// ValidateToken validates a JWT token and returns the claims
func (s *AuthService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token claims")
}

// hashPassword hashes a password using bcrypt
func (s *AuthService) hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// checkPassword checks if a password matches the hash
func (s *AuthService) checkPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// generateToken generates a JWT token for a user
func (s *AuthService) generateToken(user *models.User) (string, error) {
	claims := JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

// ChangePassword changes a user's password (admin only)
func (s *AuthService) ChangePassword(userID, newPassword string) error {
	// Validate password
	if len(newPassword) < 6 {
		return fmt.Errorf("password must be at least 6 characters")
	}

	// Find user
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to find user: %w", err)
	}

	// Hash new password
	hashedPassword, err := s.hashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password
	if err := s.db.Model(&user).Update("password", hashedPassword).Error; err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

// ToggleBlockUser blocks or unblocks a user (admin only)
func (s *AuthService) ToggleBlockUser(userID string, isBlocked bool) error {
	// Find user
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to find user: %w", err)
	}

	// Prevent blocking the "admin" user - this user can never be blocked
	if isBlocked && user.Username == "admin" {
		return fmt.Errorf("the default admin user cannot be blocked")
	}

	// Prevent blocking the last admin
	if isBlocked && user.Role == models.RoleAdmin {
		var activeAdminCount int64
		if err := s.db.Model(&models.User{}).Where("role = ? AND is_blocked = ?", models.RoleAdmin, false).Count(&activeAdminCount).Error; err != nil {
			return fmt.Errorf("failed to count active admins: %w", err)
		}
		if activeAdminCount <= 1 {
			return fmt.Errorf("cannot block the last active admin user")
		}
	}

	// Update blocked status
	if err := s.db.Model(&user).Update("is_blocked", isBlocked).Error; err != nil {
		return fmt.Errorf("failed to update user blocked status: %w", err)
	}

	return nil
}

// ChangeOwnPassword changes the current user's password
func (s *AuthService) ChangeOwnPassword(userID, oldPassword, newPassword string) error {
	// Validate new password
	if len(newPassword) < 6 {
		return fmt.Errorf("password must be at least 6 characters")
	}

	// Find user
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to find user: %w", err)
	}

	// Verify old password
	if !s.checkPassword(oldPassword, user.Password) {
		return fmt.Errorf("incorrect old password")
	}

	// Hash new password
	hashedPassword, err := s.hashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password
	if err := s.db.Model(&user).Update("password", hashedPassword).Error; err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}
