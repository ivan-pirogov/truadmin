package handlers

import (
	"net/http"
	"truadmin/internal/models"
	"truadmin/internal/services"

	"github.com/gin-gonic/gin"
)

// QueryHandler handles HTTP requests for query execution
type QueryHandler struct {
	queryService *services.QueryService
}

// NewQueryHandler creates a new query handler
func NewQueryHandler(queryService *services.QueryService) *QueryHandler {
	return &QueryHandler{
		queryService: queryService,
	}
}

// ExecuteQuery handles POST /api/v1/connections/:id/query
func (h *QueryHandler) ExecuteQuery(c *gin.Context) {
	id := c.Param("id")
	var req models.QueryRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.queryService.ExecuteQuery(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetTables handles GET /api/v1/connections/:id/tables
func (h *QueryHandler) GetTables(c *gin.Context) {
	id := c.Param("id")

	tables, err := h.queryService.GetTables(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tables": tables})
}

// GetColumns handles GET /api/v1/connections/:id/tables/:table/columns
func (h *QueryHandler) GetColumns(c *gin.Context) {
	id := c.Param("id")
	table := c.Param("table")

	columns, err := h.queryService.GetColumns(id, table)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"columns": columns})
}

// TestConnection handles POST /api/v1/connections/:id/test
func (h *QueryHandler) TestConnection(c *gin.Context) {
	id := c.Param("id")

	if err := h.queryService.TestConnection(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "connected"})
}
