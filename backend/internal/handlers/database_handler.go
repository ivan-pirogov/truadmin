package handlers

import (
	"net/http"
	"strconv"
	"truadmin/internal/models"
	"truadmin/internal/services"

	"github.com/gin-gonic/gin"
)

// DatabaseHandler handles HTTP requests for database operations
type DatabaseHandler struct {
	databaseService *services.DatabaseService
	logService      *services.RoleLogService
}

// NewDatabaseHandler creates a new database handler
func NewDatabaseHandler(dbService *services.DatabaseService, logService *services.RoleLogService) *DatabaseHandler {
	return &DatabaseHandler{
		databaseService: dbService,
		logService:      logService,
	}
}

// GetDatabases handles GET /api/v1/connections/:id/databases
func (h *DatabaseHandler) GetDatabases(c *gin.Context) {
	connectionID := c.Param("id")

	databases, err := h.databaseService.GetDatabases(connectionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, databases)
}

// GetRoles handles GET /api/v1/connections/:id/roles
func (h *DatabaseHandler) GetRoles(c *gin.Context) {
	connectionID := c.Param("id")

	roles, err := h.databaseService.GetRoles(connectionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, roles)
}

// GetRole handles GET /api/v1/connections/:id/roles/:roleId
func (h *DatabaseHandler) GetRole(c *gin.Context) {
	connectionID := c.Param("id")
	roleID := c.Param("roleId")

	role, err := h.databaseService.GetRole(connectionID, roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, role)
}

// CreateRole handles POST /api/v1/connections/:id/roles
func (h *DatabaseHandler) CreateRole(c *gin.Context) {
	connectionID := c.Param("id")
	var req models.RoleRequest

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

	role, err := h.databaseService.CreateRole(connectionID, &req)
	if err != nil {
		// Log error
		if h.logService != nil {
			h.logService.LogOperation(connectionID, "", userIDStr, "create", models.RoleSaveStatusError, err.Error())
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log success
	if h.logService != nil {
		h.logService.LogOperation(connectionID, role.ID, userIDStr, "create", models.RoleSaveStatusSuccess, "")
	}

	c.JSON(http.StatusCreated, role)
}

// UpdateRole handles PUT /api/v1/connections/:id/roles/:roleId
func (h *DatabaseHandler) UpdateRole(c *gin.Context) {
	connectionID := c.Param("id")
	roleID := c.Param("roleId")
	var req models.RoleRequest

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

	role, err := h.databaseService.UpdateRole(connectionID, roleID, &req)
	if err != nil {
		// Log error
		if h.logService != nil {
			h.logService.LogOperation(connectionID, roleID, userIDStr, "update", models.RoleSaveStatusError, err.Error())
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log success
	if h.logService != nil {
		h.logService.LogOperation(connectionID, roleID, userIDStr, "update", models.RoleSaveStatusSuccess, "")
	}

	c.JSON(http.StatusOK, role)
}

// DeleteRole handles DELETE /api/v1/connections/:id/roles/:roleId
func (h *DatabaseHandler) DeleteRole(c *gin.Context) {
	connectionID := c.Param("id")
	roleID := c.Param("roleId")

	// Get user ID from context
	userID, _ := c.Get("userID")
	userIDStr := ""
	if userID != nil {
		userIDStr = userID.(string)
	}

	if err := h.databaseService.DeleteRole(connectionID, roleID); err != nil {
		// Log error
		if h.logService != nil {
			h.logService.LogOperation(connectionID, roleID, userIDStr, "delete", models.RoleSaveStatusError, err.Error())
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log success
	if h.logService != nil {
		h.logService.LogOperation(connectionID, roleID, userIDStr, "delete", models.RoleSaveStatusSuccess, "")
	}

	c.JSON(http.StatusNoContent, nil)
}

// GetActiveQueries handles GET /api/v1/connections/:id/databases/:dbName/active-queries
func (h *DatabaseHandler) GetActiveQueries(c *gin.Context) {
	connectionID := c.Param("id")
	dbName := c.Param("dbName")
	onlyActive := c.DefaultQuery("only_active", "true") == "true"

	queries, err := h.databaseService.GetActiveQueries(connectionID, dbName, onlyActive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, queries)
}

// GetDeadlocks handles GET /api/v1/connections/:id/databases/:dbName/deadlocks
func (h *DatabaseHandler) GetDeadlocks(c *gin.Context) {
	connectionID := c.Param("id")
	dbName := c.Param("dbName")

	deadlocks, err := h.databaseService.GetDeadlocks(connectionID, dbName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, deadlocks)
}

// GetLocks handles GET /api/v1/connections/:id/databases/:dbName/locks
func (h *DatabaseHandler) GetLocks(c *gin.Context) {
	connectionID := c.Param("id")
	dbName := c.Param("dbName")
	showSystem := c.Query("show_system") == "true"

	locks, err := h.databaseService.GetLocks(connectionID, dbName, showSystem)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, locks)
}

// TerminateQueries handles POST /api/v1/connections/:id/databases/:dbName/terminate-queries
func (h *DatabaseHandler) TerminateQueries(c *gin.Context) {
	connectionID := c.Param("id")
	dbName := c.Param("dbName")

	var req struct {
		PIDs []string `json:"pids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	terminated, err := h.databaseService.TerminateQueries(connectionID, dbName, req.PIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"terminated": terminated})
}

// GetQueryHistory handles GET /api/v1/connections/:id/databases/:dbName/query-history
func (h *DatabaseHandler) GetQueryHistory(c *gin.Context) {
	connectionID := c.Param("id")
	dbName := c.Param("dbName")

	statements, err := h.databaseService.GetQueryHistory(connectionID, dbName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, statements)
}

// ExecuteQuery handles POST /api/v1/connections/:id/databases/:dbName/query
func (h *DatabaseHandler) ExecuteQuery(c *gin.Context) {
	connectionID := c.Param("id")
	dbName := c.Param("dbName")
	var req models.QueryRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.databaseService.ExecuteQuery(connectionID, dbName, req.Query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetDetailedRole handles GET /api/v1/connections/:id/roles/:roleId/details
func (h *DatabaseHandler) GetDetailedRole(c *gin.Context) {
	connectionID := c.Param("id")
	roleID := c.Param("roleId")

	role, err := h.databaseService.GetDetailedRole(connectionID, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, role)
}

// GetRoleMembership handles GET /api/v1/connections/:id/roles/:roleId/membership
func (h *DatabaseHandler) GetRoleMembership(c *gin.Context) {
	connectionID := c.Param("id")
	roleID := c.Param("roleId")

	parentRoles, childRoles, err := h.databaseService.GetRoleMembership(connectionID, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"parent_roles": parentRoles,
		"child_roles":  childRoles,
	})
}

// GetSchemas handles GET /api/v1/connections/:id/databases/:dbName/schemas
func (h *DatabaseHandler) GetSchemas(c *gin.Context) {
	connectionID := c.Param("id")
	dbName := c.Param("dbName")

	schemas, err := h.databaseService.GetSchemas(connectionID, dbName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, schemas)
}

// GetTablesInSchema handles GET /api/v1/connections/:id/databases/:dbName/schemas/:schemaName/tables
func (h *DatabaseHandler) GetTablesInSchema(c *gin.Context) {
	connectionID := c.Param("id")
	dbName := c.Param("dbName")
	schemaName := c.Param("schemaName")

	tables, err := h.databaseService.GetTablesInSchema(connectionID, dbName, schemaName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tables)
}

// GetViewsInSchema handles GET /api/v1/connections/:id/databases/:dbName/schemas/:schemaName/views
func (h *DatabaseHandler) GetViewsInSchema(c *gin.Context) {
	connectionID := c.Param("id")
	dbName := c.Param("dbName")
	schemaName := c.Param("schemaName")

	views, err := h.databaseService.GetViewsInSchema(connectionID, dbName, schemaName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, views)
}

// GetFunctionsInSchema handles GET /api/v1/connections/:id/databases/:dbName/schemas/:schemaName/functions
func (h *DatabaseHandler) GetFunctionsInSchema(c *gin.Context) {
	connectionID := c.Param("id")
	dbName := c.Param("dbName")
	schemaName := c.Param("schemaName")

	functions, err := h.databaseService.GetFunctionsInSchema(connectionID, dbName, schemaName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, functions)
}

// GetRolePrivileges handles GET /api/v1/connections/:id/roles/:roleId/privileges
func (h *DatabaseHandler) GetRolePrivileges(c *gin.Context) {
	connectionID := c.Param("id")
	roleID := c.Param("roleId")

	privileges, err := h.databaseService.GetRolePrivileges(connectionID, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, privileges)
}

// GrantPrivileges handles POST /api/v1/connections/:id/roles/:roleId/grant
func (h *DatabaseHandler) GrantPrivileges(c *gin.Context) {
	connectionID := c.Param("id")
	roleID := c.Param("roleId")
	var req models.GrantRequest

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

	if err := h.databaseService.GrantPrivileges(connectionID, roleID, &req); err != nil {
		// Log error
		if h.logService != nil {
			h.logService.LogOperation(connectionID, roleID, userIDStr, "grant_privileges", models.RoleSaveStatusError, err.Error())
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log success
	if h.logService != nil {
		h.logService.LogOperation(connectionID, roleID, userIDStr, "grant_privileges", models.RoleSaveStatusSuccess, "")
	}

	c.JSON(http.StatusOK, gin.H{"message": "Privileges granted successfully"})
}

// RevokePrivileges handles POST /api/v1/connections/:id/roles/:roleId/revoke
func (h *DatabaseHandler) RevokePrivileges(c *gin.Context) {
	connectionID := c.Param("id")
	roleID := c.Param("roleId")
	var req models.GrantRequest

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

	if err := h.databaseService.RevokePrivileges(connectionID, roleID, &req); err != nil {
		// Log error
		if h.logService != nil {
			h.logService.LogOperation(connectionID, roleID, userIDStr, "revoke_privileges", models.RoleSaveStatusError, err.Error())
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log success
	if h.logService != nil {
		h.logService.LogOperation(connectionID, roleID, userIDStr, "revoke_privileges", models.RoleSaveStatusSuccess, "")
	}

	c.JSON(http.StatusOK, gin.H{"message": "Privileges revoked successfully"})
}

// GrantMembership handles POST /api/v1/connections/:id/roles/:roleId/grant-membership
func (h *DatabaseHandler) GrantMembership(c *gin.Context) {
	connectionID := c.Param("id")
	roleID := c.Param("roleId")
	var req models.MembershipRequest

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

	if err := h.databaseService.GrantMembership(connectionID, roleID, &req); err != nil {
		// Log error
		if h.logService != nil {
			h.logService.LogOperation(connectionID, roleID, userIDStr, "grant_membership", models.RoleSaveStatusError, err.Error())
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log success
	if h.logService != nil {
		h.logService.LogOperation(connectionID, roleID, userIDStr, "grant_membership", models.RoleSaveStatusSuccess, "")
	}

	c.JSON(http.StatusOK, gin.H{"message": "Membership granted successfully"})
}

// RevokeMembership handles POST /api/v1/connections/:id/roles/:roleId/revoke-membership
func (h *DatabaseHandler) RevokeMembership(c *gin.Context) {
	connectionID := c.Param("id")
	roleID := c.Param("roleId")
	var req models.MembershipRequest

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

	if err := h.databaseService.RevokeMembership(connectionID, roleID, &req); err != nil {
		// Log error
		if h.logService != nil {
			h.logService.LogOperation(connectionID, roleID, userIDStr, "revoke_membership", models.RoleSaveStatusError, err.Error())
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log success
	if h.logService != nil {
		h.logService.LogOperation(connectionID, roleID, userIDStr, "revoke_membership", models.RoleSaveStatusSuccess, "")
	}

	c.JSON(http.StatusOK, gin.H{"message": "Membership revoked successfully"})
}

// GetRoleLogs handles GET /api/v1/connections/:id/roles/logs or GET /api/v1/connections/:id/roles/:roleId/logs
func (h *DatabaseHandler) GetRoleLogs(c *gin.Context) {
	connectionID := c.Param("id")
	roleID := c.Param("roleId")

	// Get optional limit query parameter
	limit := 100 // default
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	var logs []models.RoleSaveLog
	var err error

	if roleID != "" {
		// Get logs for specific role
		logs, err = h.logService.GetLogsByRole(connectionID, roleID, limit)
	} else {
		// Get logs for connection
		logs, err = h.logService.GetLogsByConnection(connectionID, limit)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs})
}
