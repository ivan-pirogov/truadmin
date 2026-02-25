package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"truadmin/internal/database"
)

// HealthHandler handles health check requests
type HealthHandler struct{}

// NewHealthHandler creates a new health handler
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// Health handles GET /health
func (h *HealthHandler) Health(c *gin.Context) {
	dbStatus := "connected"
	if !database.IsConnected() {
		dbStatus = "disconnected"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":      "ok",
		"service":     "truadmin-backend",
		"database":    dbStatus,
	})
}

// DatabaseStatus handles GET /api/v1/database/status
func (h *HealthHandler) DatabaseStatus(c *gin.Context) {
	isConnected := database.IsConnected()
	dbError := database.GetDBError()
	dbConfig := database.GetDBConfig()

	response := gin.H{
		"connected": isConnected,
	}

	if isConnected {
		response["message"] = "Database connection is active"
	} else {
		response["message"] = "Database connection failed"
		if dbError != nil {
			response["error"] = dbError.Error()
		}
		// Include connection info (without password)
		response["connection_info"] = gin.H{
			"host":     dbConfig.Host,
			"port":     dbConfig.Port,
			"database": dbConfig.DBName,
			"username": dbConfig.Username,
			"password": "***", // Never expose password
		}
	}

	c.JSON(http.StatusOK, response)
}

// Root handles GET / - API info
func (h *HealthHandler) Root(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"service": "TruAdmin Backend API",
		"version": "1.0.0",
		"endpoints": gin.H{
			"health":        "/health",
			"connections":   "/api/v1/connections",
			"query":         "/api/v1/connections/:id/query",
			"tables":        "/api/v1/connections/:id/tables",
			"table_columns": "/api/v1/connections/:id/tables/:table/columns",
		},
	})
}
