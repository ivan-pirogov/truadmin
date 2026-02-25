package handlers

import (
	"net/http"
	"strconv"
	"truadmin/internal/models"
	"truadmin/internal/services"

	"github.com/gin-gonic/gin"
)

// TruETLHandler handles HTTP requests for TruETL databases
type TruETLHandler struct {
	truETLService *services.TruETLService
	logService    *services.TruETLLogService
}

// NewTruETLHandler creates a new TruETL handler
func NewTruETLHandler(truETLService *services.TruETLService, logService *services.TruETLLogService) *TruETLHandler {
	return &TruETLHandler{
		truETLService: truETLService,
		logService:    logService,
	}
}

// GetEligibleDatabases handles GET /api/v1/truetl/eligible-databases/:connectionId
func (h *TruETLHandler) GetEligibleDatabases(c *gin.Context) {
	connectionID := c.Param("connectionId")

	databases, err := h.truETLService.GetEligibleDatabases(connectionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, databases)
}

// AddDatabase handles POST /api/v1/truetl/databases
func (h *TruETLHandler) AddDatabase(c *gin.Context) {
	var req models.TruETLDatabaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database, err := h.truETLService.AddDatabase(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, database)
}

// GetDatabases handles GET /api/v1/truetl/databases
func (h *TruETLHandler) GetDatabases(c *gin.Context) {
	databases, err := h.truETLService.GetDatabases()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, databases)
}

// GetDatabase handles GET /api/v1/truetl/databases/:id
func (h *TruETLHandler) GetDatabase(c *gin.Context) {
	id := c.Param("id")

	database, err := h.truETLService.GetDatabase(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, database)
}

// UpdateDatabase handles PUT /api/v1/truetl/databases/:id
func (h *TruETLHandler) UpdateDatabase(c *gin.Context) {
	id := c.Param("id")

	var req models.TruETLDatabaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database, err := h.truETLService.UpdateDatabase(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, database)
}

// DeleteDatabase handles DELETE /api/v1/truetl/databases/:id
func (h *TruETLHandler) DeleteDatabase(c *gin.Context) {
	id := c.Param("id")

	if err := h.truETLService.DeleteDatabase(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// GetDMSTables handles GET /api/v1/truetl/databases/:id/tables
func (h *TruETLHandler) GetDMSTables(c *gin.Context) {
	id := c.Param("id")

	tables, err := h.truETLService.GetDMSTables(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tables": tables})
}

// GetDMSFields handles POST /api/v1/truetl/databases/:id/fields
func (h *TruETLHandler) GetDMSFields(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		TableIDs []int `json:"table_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fields, err := h.truETLService.GetDMSFields(id, req.TableIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"fields": fields})
}

// SaveDMSFields handles PUT /api/v1/truetl/databases/:id/fields
func (h *TruETLHandler) SaveDMSFields(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		TableKey string                   `json:"table_key" binding:"required"`
		Changes  []map[string]interface{} `json:"changes" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.truETLService.SaveDMSFields(id, req.TableKey, req.Changes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Fields saved successfully"})
}

// SaveAllChanges handles PUT /api/v1/truetl/databases/:id/save-all
func (h *TruETLHandler) SaveAllChanges(c *gin.Context) {
	id := c.Param("id")

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		userID = "" // Empty string if not available
	}
	userIDStr := ""
	if userID != nil {
		userIDStr = userID.(string)
	}

	var req services.SaveAllChangesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if logService is available
	if h.logService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "log service is not initialized"})
		return
	}

	if err := h.truETLService.SaveAllChanges(id, userIDStr, &req, h.logService); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All changes saved successfully"})
}

// GetSaveLogs handles GET /api/v1/truetl/databases/:id/logs
func (h *TruETLHandler) GetSaveLogs(c *gin.Context) {
	id := c.Param("id")
	
	// Get optional limit query parameter
	limit := 100 // default
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}
	
	logs, err := h.logService.GetSaveLogs(id, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"logs": logs})
}
