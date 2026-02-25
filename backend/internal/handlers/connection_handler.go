package handlers

import (
	"net/http"
	"strconv"
	"truadmin/internal/models"
	"truadmin/internal/services"

	"github.com/gin-gonic/gin"
)

// ConnectionHandler handles HTTP requests for database connections
type ConnectionHandler struct {
	connectionService *services.ConnectionService
	logService        *services.ConnectionLogService
}

// NewConnectionHandler creates a new connection handler
func NewConnectionHandler(connService *services.ConnectionService, logService *services.ConnectionLogService) *ConnectionHandler {
	return &ConnectionHandler{
		connectionService: connService,
		logService:        logService,
	}
}

// CreateConnection handles POST /api/v1/connections
func (h *ConnectionHandler) CreateConnection(c *gin.Context) {
	var req models.ConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	userID, _ := c.Get("userID")
	userIDStr := ""
	if userID != nil {
		userIDStr = userID.(string)
	}

	conn, err := h.connectionService.CreateConnection(&req)
	if err != nil {
		// Log error
		if h.logService != nil {
			changesSummary := models.ConnectionChangesSummary{
				Created: 1,
			}
			h.logService.LogOperation("", userIDStr, "create", models.ConnectionSaveStatusError, changesSummary, err.Error())
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log success
	if h.logService != nil {
		changesSummary := models.ConnectionChangesSummary{
			Created: 1,
		}
		h.logService.LogOperation(conn.ID, userIDStr, "create", models.ConnectionSaveStatusSuccess, changesSummary, "")
	}

	c.JSON(http.StatusCreated, conn)
}

// GetConnections handles GET /api/v1/connections
func (h *ConnectionHandler) GetConnections(c *gin.Context) {
	connections, err := h.connectionService.GetAllConnections()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, connections)
}

// GetConnection handles GET /api/v1/connections/:id
func (h *ConnectionHandler) GetConnection(c *gin.Context) {
	id := c.Param("id")

	conn, err := h.connectionService.GetConnection(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, conn)
}

// DeleteConnection handles DELETE /api/v1/connections/:id
func (h *ConnectionHandler) DeleteConnection(c *gin.Context) {
	id := c.Param("id")

	// Get user ID from context
	userID, _ := c.Get("userID")
	userIDStr := ""
	if userID != nil {
		userIDStr = userID.(string)
	}

	if err := h.connectionService.DeleteConnection(id); err != nil {
		// Log error
		if h.logService != nil {
			changesSummary := models.ConnectionChangesSummary{
				Deleted: 1,
			}
			h.logService.LogOperation(id, userIDStr, "delete", models.ConnectionSaveStatusError, changesSummary, err.Error())
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log success
	if h.logService != nil {
		changesSummary := models.ConnectionChangesSummary{
			Deleted: 1,
		}
		h.logService.LogOperation(id, userIDStr, "delete", models.ConnectionSaveStatusSuccess, changesSummary, "")
	}

	c.JSON(http.StatusNoContent, nil)
}

// UpdateConnection handles PUT /api/v1/connections/:id
func (h *ConnectionHandler) UpdateConnection(c *gin.Context) {
	id := c.Param("id")
	var req models.ConnectionRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	userID, _ := c.Get("userID")
	userIDStr := ""
	if userID != nil {
		userIDStr = userID.(string)
	}

	conn, err := h.connectionService.UpdateConnection(id, &req)
	if err != nil {
		// Log error
		if h.logService != nil {
			changesSummary := models.ConnectionChangesSummary{
				Updated: 1,
			}
			h.logService.LogOperation(id, userIDStr, "update", models.ConnectionSaveStatusError, changesSummary, err.Error())
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log success
	if h.logService != nil {
		changesSummary := models.ConnectionChangesSummary{
			Updated: 1,
		}
		h.logService.LogOperation(id, userIDStr, "update", models.ConnectionSaveStatusSuccess, changesSummary, "")
	}

	c.JSON(http.StatusOK, conn)
}

// GetLogs handles GET /api/v1/connections/logs
func (h *ConnectionHandler) GetLogs(c *gin.Context) {
	// Get optional limit and connection_id query parameters
	limit := 100 // default
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	connectionID := c.Query("connection_id")

	var logs []models.ConnectionSaveLog
	var err error

	if connectionID != "" {
		logs, err = h.logService.GetLogsByConnection(connectionID, limit)
	} else {
		logs, err = h.logService.GetLogs(limit)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs})
}
