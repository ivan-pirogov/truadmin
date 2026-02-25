package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"truadmin/internal/models"
	"truadmin/internal/services"
)

// AuthHandler handles authentication HTTP requests
type AuthHandler struct {
	authService *services.AuthService
	logService  *services.UserLogService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService *services.AuthService, logService *services.UserLogService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		logService:  logService,
	}
}

// CheckSetup handles GET /api/v1/auth/setup/status
func (h *AuthHandler) CheckSetup(c *gin.Context) {
	requiresSetup, err := h.authService.RequiresSetup()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.SetupStatusResponse{
		RequiresSetup: requiresSetup,
	})
}

// InitialSetup handles POST /api/v1/auth/setup
func (h *AuthHandler) InitialSetup(c *gin.Context) {
	var req models.SetupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.authService.InitialSetup(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Setup completed successfully"})
}

// Login handles POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// CreateUser handles POST /api/v1/users (admin only)
func (h *AuthHandler) CreateUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	userID, _ := c.Get("userID")
	changedByID := ""
	if userID != nil {
		changedByID = userID.(string)
	}

	user, err := h.authService.CreateUser(&req)
	if err != nil {
		// Log error
		if h.logService != nil {
			h.logService.LogOperation("", changedByID, "create", models.UserSaveStatusError, err.Error())
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Log success
	if h.logService != nil {
		h.logService.LogOperation(user.ID, changedByID, "create", models.UserSaveStatusSuccess, "")
	}

	c.JSON(http.StatusCreated, user)
}

// GetUsers handles GET /api/v1/users (admin only)
func (h *AuthHandler) GetUsers(c *gin.Context) {
	users, err := h.authService.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, users)
}

// DeleteUser handles DELETE /api/v1/users/:id (admin only)
func (h *AuthHandler) DeleteUser(c *gin.Context) {
	userID := c.Param("id")

	// Get user ID from context
	changedByID, _ := c.Get("userID")
	changedByIDStr := ""
	if changedByID != nil {
		changedByIDStr = changedByID.(string)
	}

	if err := h.authService.DeleteUser(userID); err != nil {
		// Log error
		if h.logService != nil {
			h.logService.LogOperation(userID, changedByIDStr, "delete", models.UserSaveStatusError, err.Error())
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Log success
	if h.logService != nil {
		h.logService.LogOperation(userID, changedByIDStr, "delete", models.UserSaveStatusSuccess, "")
	}

	c.JSON(http.StatusNoContent, nil)
}

// GetCurrentUser handles GET /api/v1/auth/me
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	username, _ := c.Get("username")
	role, _ := c.Get("role")

	c.JSON(http.StatusOK, gin.H{
		"id":       userID,
		"username": username,
		"role":     role,
	})
}

// ChangePassword handles PUT /api/v1/users/:id/password (admin only)
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID := c.Param("id")

	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	changedByID, _ := c.Get("userID")
	changedByIDStr := ""
	if changedByID != nil {
		changedByIDStr = changedByID.(string)
	}

	if err := h.authService.ChangePassword(userID, req.NewPassword); err != nil {
		// Log error
		if h.logService != nil {
			h.logService.LogOperation(userID, changedByIDStr, "change_password", models.UserSaveStatusError, err.Error())
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Log success
	if h.logService != nil {
		h.logService.LogOperation(userID, changedByIDStr, "change_password", models.UserSaveStatusSuccess, "")
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

// ToggleBlockUser handles PUT /api/v1/users/:id/block (admin only)
func (h *AuthHandler) ToggleBlockUser(c *gin.Context) {
	userID := c.Param("id")

	var req models.BlockUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	changedByID, _ := c.Get("userID")
	changedByIDStr := ""
	if changedByID != nil {
		changedByIDStr = changedByID.(string)
	}

	operation := "unblock"
	if req.IsBlocked {
		operation = "block"
	}

	if err := h.authService.ToggleBlockUser(userID, req.IsBlocked); err != nil {
		// Log error
		if h.logService != nil {
			h.logService.LogOperation(userID, changedByIDStr, operation, models.UserSaveStatusError, err.Error())
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Log success
	if h.logService != nil {
		h.logService.LogOperation(userID, changedByIDStr, operation, models.UserSaveStatusSuccess, "")
	}

	c.JSON(http.StatusOK, gin.H{"message": "User status updated successfully"})
}
// ChangeOwnPassword handles PUT /api/v1/auth/change-password (authenticated users)
func (h *AuthHandler) ChangeOwnPassword(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req models.ChangeOwnPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.authService.ChangeOwnPassword(userID.(string), req.OldPassword, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

// GetUserLogs handles GET /api/v1/admin/users/logs
func (h *AuthHandler) GetUserLogs(c *gin.Context) {
	// Get optional limit and user_id query parameters
	limit := 100 // default
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	userID := c.Query("user_id")

	var logs []models.UserSaveLog
	var err error

	if userID != "" {
		logs, err = h.logService.GetLogsByUser(userID, limit)
	} else {
		logs, err = h.logService.GetLogs(limit)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs})
}
