package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"truadmin/internal/models"
	"truadmin/internal/services"

	"github.com/gin-gonic/gin"
)

// HohAddressHandler handles HTTP requests for HohAddress databases
type HohAddressHandler struct {
	hohAddressService *services.HohAddressService
	logService        *services.HohAddressLogService
}

// NewHohAddressHandler creates a new HohAddress handler
func NewHohAddressHandler(hohAddressService *services.HohAddressService, logService *services.HohAddressLogService) *HohAddressHandler {
	return &HohAddressHandler{
		hohAddressService: hohAddressService,
		logService:        logService,
	}
}

// GetEligibleDatabases handles GET /api/v1/hohaddress/eligible-databases/:connectionId
func (h *HohAddressHandler) GetEligibleDatabases(c *gin.Context) {
	connectionID := c.Param("connectionId")

	databases, err := h.hohAddressService.GetEligibleDatabases(connectionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, databases)
}

// AddDatabase handles POST /api/v1/hohaddress/databases
func (h *HohAddressHandler) AddDatabase(c *gin.Context) {
	var req models.HohAddressDatabaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database, err := h.hohAddressService.AddDatabase(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, database)
}

// GetDatabases handles GET /api/v1/hohaddress/databases
func (h *HohAddressHandler) GetDatabases(c *gin.Context) {
	databases, err := h.hohAddressService.GetDatabases()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, databases)
}

// GetDatabase handles GET /api/v1/hohaddress/databases/:id
func (h *HohAddressHandler) GetDatabase(c *gin.Context) {
	id := c.Param("id")

	database, err := h.hohAddressService.GetDatabase(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, database)
}

// UpdateDatabase handles PUT /api/v1/hohaddress/databases/:id
func (h *HohAddressHandler) UpdateDatabase(c *gin.Context) {
	id := c.Param("id")

	var req models.HohAddressDatabaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database, err := h.hohAddressService.UpdateDatabase(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, database)
}

// DeleteDatabase handles DELETE /api/v1/hohaddress/databases/:id
func (h *HohAddressHandler) DeleteDatabase(c *gin.Context) {
	id := c.Param("id")

	if err := h.hohAddressService.DeleteDatabase(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// GetTableColumns handles GET /api/v1/hohaddress/databases/:id/tables/:tableName/columns
func (h *HohAddressHandler) GetTableColumns(c *gin.Context) {
	id := c.Param("id")
	tableName := c.Param("tableName")

	columns, err := h.hohAddressService.GetTableColumns(id, tableName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"columns": columns})
}

// GetStatusList handles GET /api/v1/hohaddress/databases/:id/statuslist
func (h *HohAddressHandler) GetStatusList(c *gin.Context) {
	id := c.Param("id")

	// Parse query parameters for filters
	filters := make(map[string]string)
	whereClause := c.Query("where")
	fmt.Printf("Handler received whereClause: %s\n", whereClause)
	for key, values := range c.Request.URL.Query() {
		if key != "limit" && key != "offset" && key != "where" && len(values) > 0 {
			filters[key] = values[0]
		}
	}

	// Parse pagination
	limit := 100
	offset := 0
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsed, err := strconv.Atoi(offsetStr); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	data, totalCount, err := h.hohAddressService.GetStatusList(id, filters, limit, offset, whereClause)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       data,
		"totalCount": totalCount,
	})
}

// GetBlacklist handles GET /api/v1/hohaddress/databases/:id/blacklist
func (h *HohAddressHandler) GetBlacklist(c *gin.Context) {
	id := c.Param("id")

	// Parse query parameters for filters
	filters := make(map[string]string)
	whereClause := c.Query("where")
	for key, values := range c.Request.URL.Query() {
		if key != "limit" && key != "offset" && key != "sortBy" && key != "sortOrder" && key != "where" && len(values) > 0 {
			filters[key] = values[0]
		}
	}

	// Parse pagination and sorting
	limit := 100
	offset := 0
	sortBy := c.Query("sortBy")
	sortOrder := c.Query("sortOrder")
	if sortOrder == "" {
		sortOrder = "ASC"
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsed, err := strconv.Atoi(offsetStr); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	data, totalCount, err := h.hohAddressService.GetBlacklist(id, filters, sortBy, sortOrder, limit, offset, whereClause)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       data,
		"totalCount": totalCount,
	})
}

// CreateBlacklistRow handles POST /api/v1/hohaddress/databases/:id/blacklist
func (h *HohAddressHandler) CreateBlacklistRow(c *gin.Context) {
	id := c.Param("id")

	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get username from context
	username, _ := c.Get("username")
	usernameStr := ""
	if username != nil {
		usernameStr = username.(string)
	}

	result, err := h.hohAddressService.CreateBlacklistRow(id, data, usernameStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, result)
}

// UpdateBlacklistRow handles PUT /api/v1/hohaddress/databases/:id/blacklist/:rowId
func (h *HohAddressHandler) UpdateBlacklistRow(c *gin.Context) {
	id := c.Param("id")
	rowID := c.Param("rowId")

	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get username from context
	username, _ := c.Get("username")
	usernameStr := ""
	if username != nil {
		usernameStr = username.(string)
	}

	result, err := h.hohAddressService.UpdateBlacklistRow(id, rowID, data, usernameStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// DeleteBlacklistRow handles DELETE /api/v1/hohaddress/databases/:id/blacklist/:rowId
func (h *HohAddressHandler) DeleteBlacklistRow(c *gin.Context) {
	id := c.Param("id")
	rowID := c.Param("rowId")

	if err := h.hohAddressService.DeleteBlacklistRow(id, rowID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// GetWhitelist handles GET /api/v1/hohaddress/databases/:id/whitelist
func (h *HohAddressHandler) GetWhitelist(c *gin.Context) {
	id := c.Param("id")

	// Parse query parameters for filters
	filters := make(map[string]string)
	whereClause := c.Query("where")
	for key, values := range c.Request.URL.Query() {
		if key != "limit" && key != "offset" && key != "sortBy" && key != "sortOrder" && key != "where" && len(values) > 0 {
			filters[key] = values[0]
		}
	}

	// Parse pagination and sorting
	limit := 100
	offset := 0
	sortBy := c.Query("sortBy")
	sortOrder := c.Query("sortOrder")
	if sortOrder == "" {
		sortOrder = "ASC"
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsed, err := strconv.Atoi(offsetStr); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	data, totalCount, err := h.hohAddressService.GetWhitelist(id, filters, sortBy, sortOrder, limit, offset, whereClause)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       data,
		"totalCount": totalCount,
	})
}

// CreateWhitelistRow handles POST /api/v1/hohaddress/databases/:id/whitelist
func (h *HohAddressHandler) CreateWhitelistRow(c *gin.Context) {
	id := c.Param("id")

	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get username from context
	username, _ := c.Get("username")
	usernameStr := ""
	if username != nil {
		usernameStr = username.(string)
	}

	result, err := h.hohAddressService.CreateWhitelistRow(id, data, usernameStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, result)
}

// UpdateWhitelistRow handles PUT /api/v1/hohaddress/databases/:id/whitelist/:rowId
func (h *HohAddressHandler) UpdateWhitelistRow(c *gin.Context) {
	id := c.Param("id")
	rowID := c.Param("rowId")

	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get username from context
	username, _ := c.Get("username")
	usernameStr := ""
	if username != nil {
		usernameStr = username.(string)
	}

	result, err := h.hohAddressService.UpdateWhitelistRow(id, rowID, data, usernameStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// DeleteWhitelistRow handles DELETE /api/v1/hohaddress/databases/:id/whitelist/:rowId
func (h *HohAddressHandler) DeleteWhitelistRow(c *gin.Context) {
	id := c.Param("id")
	rowID := c.Param("rowId")

	if err := h.hohAddressService.DeleteWhitelistRow(id, rowID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// GetSaveLogs handles GET /api/v1/hohaddress/databases/:id/logs
func (h *HohAddressHandler) GetSaveLogs(c *gin.Context) {
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

// CheckAddressStatus handles POST /api/v1/hohaddress/databases/:id/check-address
func (h *HohAddressHandler) CheckAddressStatus(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Address1    string `json:"address1" binding:"required"`
		Address2    string `json:"address2"`
		City        string `json:"city" binding:"required"`
		State       string `json:"state" binding:"required"`
		Zip         string `json:"zip" binding:"required"`
		ProgramType string `json:"programType" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.hohAddressService.CheckAddressStatus(id, req.Address1, req.Address2, req.City, req.State, req.Zip, req.ProgramType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

