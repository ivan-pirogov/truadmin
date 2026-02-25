package router

import (
	"net/http"
	"os"
	"path/filepath"
	"truadmin/internal/handlers"
	"truadmin/internal/middleware"
	"truadmin/internal/services"

	"github.com/gin-gonic/gin"
)

// Router holds the Gin router and all handlers
type Router struct {
	engine           *gin.Engine
	healthHandler    *handlers.HealthHandler
	authHandler      *handlers.AuthHandler
	connHandler      *handlers.ConnectionHandler
	queryHandler     *handlers.QueryHandler
	databaseHandler  *handlers.DatabaseHandler
	truETLHandler    *handlers.TruETLHandler
	hohAddressHandler *handlers.HohAddressHandler
}

// NewRouter creates a new router with all handlers
func NewRouter(
	healthHandler *handlers.HealthHandler,
	authHandler *handlers.AuthHandler,
	connHandler *handlers.ConnectionHandler,
	queryHandler *handlers.QueryHandler,
	databaseHandler *handlers.DatabaseHandler,
	truETLHandler *handlers.TruETLHandler,
	hohAddressHandler *handlers.HohAddressHandler,
) *Router {
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	engine.Use(gin.Recovery())

	return &Router{
		engine:            engine,
		healthHandler:     healthHandler,
		authHandler:       authHandler,
		connHandler:       connHandler,
		queryHandler:      queryHandler,
		databaseHandler:   databaseHandler,
		truETLHandler:     truETLHandler,
		hohAddressHandler: hohAddressHandler,
	}
}

// SetupRoutes configures all application routes
func (r *Router) SetupRoutes(authService *services.AuthService) {
	// Apply CORS middleware
	r.engine.Use(middleware.CORS())

	// Health check routes (public) - keep these before static files
	r.engine.GET("/health", r.healthHandler.Health)
	r.engine.GET("/api/health", r.healthHandler.Health)

	// API v1 routes - must be registered before static files
	api := r.engine.Group("/api/v1")
	{
		// Public database status route (no authentication required)
		api.GET("/database/status", r.healthHandler.DatabaseStatus)

		// Public auth routes (no authentication required)
		auth := api.Group("/auth")
		{
			auth.GET("/setup/status", r.authHandler.CheckSetup)
			auth.POST("/setup", r.authHandler.InitialSetup)
			auth.POST("/login", r.authHandler.Login)
		}

		// Protected routes (authentication required)
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			// Current user
			protected.GET("/auth/me", r.authHandler.GetCurrentUser)

			// Database connections
			protected.POST("/connections", r.connHandler.CreateConnection)
			protected.GET("/connections", r.connHandler.GetConnections)
			protected.GET("/connections/:id", r.connHandler.GetConnection)
			protected.PUT("/connections/:id", r.connHandler.UpdateConnection)
			protected.DELETE("/connections/:id", r.connHandler.DeleteConnection)
			protected.GET("/connections/logs", r.connHandler.GetLogs)
			protected.POST("/connections/:id/test", r.queryHandler.TestConnection)

			// Query execution
			protected.POST("/connections/:id/query", r.queryHandler.ExecuteQuery)

			// Database metadata
			protected.GET("/connections/:id/tables", r.queryHandler.GetTables)
			protected.GET("/connections/:id/tables/:table/columns", r.queryHandler.GetColumns)

			// Databases
			protected.GET("/connections/:id/databases", r.databaseHandler.GetDatabases)

			// Roles
			protected.GET("/connections/:id/roles", r.databaseHandler.GetRoles)
			protected.GET("/connections/:id/roles/:roleId", r.databaseHandler.GetRole)
			protected.POST("/connections/:id/roles", r.databaseHandler.CreateRole)
			protected.PUT("/connections/:id/roles/:roleId", r.databaseHandler.UpdateRole)
			protected.DELETE("/connections/:id/roles/:roleId", r.databaseHandler.DeleteRole)
			protected.GET("/connections/:id/roles/logs", r.databaseHandler.GetRoleLogs)
			protected.GET("/connections/:id/roles/:roleId/logs", r.databaseHandler.GetRoleLogs)

			// Detailed role info
			protected.GET("/connections/:id/roles/:roleId/details", r.databaseHandler.GetDetailedRole)
			protected.GET("/connections/:id/roles/:roleId/membership", r.databaseHandler.GetRoleMembership)
			protected.GET("/connections/:id/roles/:roleId/privileges", r.databaseHandler.GetRolePrivileges)

			// Database objects
			protected.GET("/connections/:id/databases/:dbName/schemas", r.databaseHandler.GetSchemas)
			protected.GET("/connections/:id/databases/:dbName/schemas/:schemaName/tables", r.databaseHandler.GetTablesInSchema)
			protected.GET("/connections/:id/databases/:dbName/schemas/:schemaName/views", r.databaseHandler.GetViewsInSchema)
			protected.GET("/connections/:id/databases/:dbName/schemas/:schemaName/functions", r.databaseHandler.GetFunctionsInSchema)

			// Grant/Revoke
			protected.POST("/connections/:id/roles/:roleId/grant", r.databaseHandler.GrantPrivileges)
			protected.POST("/connections/:id/roles/:roleId/revoke", r.databaseHandler.RevokePrivileges)
			protected.POST("/connections/:id/roles/:roleId/grant-membership", r.databaseHandler.GrantMembership)
			protected.POST("/connections/:id/roles/:roleId/revoke-membership", r.databaseHandler.RevokeMembership)

			// Monitoring
			protected.GET("/connections/:id/databases/:dbName/active-queries", r.databaseHandler.GetActiveQueries)
			protected.GET("/connections/:id/databases/:dbName/deadlocks", r.databaseHandler.GetDeadlocks)
			protected.GET("/connections/:id/databases/:dbName/locks", r.databaseHandler.GetLocks)
			protected.POST("/connections/:id/databases/:dbName/terminate-queries", r.databaseHandler.TerminateQueries)
			protected.GET("/connections/:id/databases/:dbName/query-history", r.databaseHandler.GetQueryHistory)
			protected.POST("/connections/:id/databases/:dbName/query", r.databaseHandler.ExecuteQuery)

			// Change own password (all authenticated users)
			protected.PUT("/auth/change-password", r.authHandler.ChangeOwnPassword)

			// TruETL routes
			protected.GET("/truetl/eligible-databases/:connectionId", r.truETLHandler.GetEligibleDatabases)
			protected.POST("/truetl/databases", r.truETLHandler.AddDatabase)
			protected.GET("/truetl/databases", r.truETLHandler.GetDatabases)
			protected.GET("/truetl/databases/:id", r.truETLHandler.GetDatabase)
			protected.PUT("/truetl/databases/:id", r.truETLHandler.UpdateDatabase)
			protected.DELETE("/truetl/databases/:id", r.truETLHandler.DeleteDatabase)
			protected.GET("/truetl/databases/:id/tables", r.truETLHandler.GetDMSTables)
			protected.POST("/truetl/databases/:id/fields", r.truETLHandler.GetDMSFields)
			protected.PUT("/truetl/databases/:id/fields", r.truETLHandler.SaveDMSFields)
			protected.PUT("/truetl/databases/:id/save-all", r.truETLHandler.SaveAllChanges)
			protected.GET("/truetl/databases/:id/logs", r.truETLHandler.GetSaveLogs)

			// HohAddress routes
			protected.GET("/hohaddress/eligible-databases/:connectionId", r.hohAddressHandler.GetEligibleDatabases)
			protected.POST("/hohaddress/databases", r.hohAddressHandler.AddDatabase)
			protected.GET("/hohaddress/databases", r.hohAddressHandler.GetDatabases)
			protected.GET("/hohaddress/databases/:id", r.hohAddressHandler.GetDatabase)
			protected.PUT("/hohaddress/databases/:id", r.hohAddressHandler.UpdateDatabase)
			protected.DELETE("/hohaddress/databases/:id", r.hohAddressHandler.DeleteDatabase)
			
			// HohAddress table routes
			protected.GET("/hohaddress/databases/:id/tables/:tableName/columns", r.hohAddressHandler.GetTableColumns)
			protected.GET("/hohaddress/databases/:id/statuslist", r.hohAddressHandler.GetStatusList)
			protected.GET("/hohaddress/databases/:id/blacklist", r.hohAddressHandler.GetBlacklist)
			protected.POST("/hohaddress/databases/:id/blacklist", r.hohAddressHandler.CreateBlacklistRow)
			protected.PUT("/hohaddress/databases/:id/blacklist/:rowId", r.hohAddressHandler.UpdateBlacklistRow)
			protected.DELETE("/hohaddress/databases/:id/blacklist/:rowId", r.hohAddressHandler.DeleteBlacklistRow)
			protected.GET("/hohaddress/databases/:id/whitelist", r.hohAddressHandler.GetWhitelist)
			protected.POST("/hohaddress/databases/:id/whitelist", r.hohAddressHandler.CreateWhitelistRow)
			protected.PUT("/hohaddress/databases/:id/whitelist/:rowId", r.hohAddressHandler.UpdateWhitelistRow)
			protected.DELETE("/hohaddress/databases/:id/whitelist/:rowId", r.hohAddressHandler.DeleteWhitelistRow)
			protected.POST("/hohaddress/databases/:id/check-address", r.hohAddressHandler.CheckAddressStatus)
			protected.GET("/hohaddress/databases/:id/logs", r.hohAddressHandler.GetSaveLogs)

			// Admin-only routes
			admin := protected.Group("")
			admin.Use(middleware.AdminOnlyMiddleware())
			{
				admin.POST("/users", r.authHandler.CreateUser)
				admin.GET("/users", r.authHandler.GetUsers)
				admin.DELETE("/users/:id", r.authHandler.DeleteUser)
				admin.PUT("/users/:id/password", r.authHandler.ChangePassword)
				admin.PUT("/users/:id/block", r.authHandler.ToggleBlockUser)
				admin.GET("/users/logs", r.authHandler.GetUserLogs)
			}
		}
	}

	// Path to frontend build directory
	// In Docker: /app/frontend/build
	// In development: ../frontend/build (relative to backend directory)
	frontendPath := os.Getenv("FRONTEND_BUILD_PATH")
	if frontendPath == "" {
		// Default to relative path for development
		frontendPath = filepath.Join("..", "frontend", "build")
	}

	// Serve static assets (JS, CSS, images, etc.)
	r.engine.Static("/static", filepath.Join(frontendPath, "static"))

	// Serve favicon
	r.engine.StaticFile("/favicon.png", filepath.Join(frontendPath, "favicon.png"))

	// Serve other static files from build root
	r.engine.StaticFile("/suppress-ws.js", filepath.Join(frontendPath, "suppress-ws.js"))

	// Serve index.html for root (React Router fallback)
	r.engine.GET("/", func(c *gin.Context) {
		c.File(filepath.Join(frontendPath, "index.html"))
	})

	// Fallback for all other routes (React Router)
	r.engine.NoRoute(func(c *gin.Context) {
		// Don't serve index.html for API routes (return 404 JSON)
		if len(c.Request.URL.Path) >= 4 && c.Request.URL.Path[:4] == "/api" {
			c.JSON(http.StatusNotFound, gin.H{"error": "API endpoint not found"})
			return
		}
		// For all other routes, serve index.html (React Router will handle routing)
		c.File(filepath.Join(frontendPath, "index.html"))
	})
}

// GetEngine returns the Gin engine
func (r *Router) GetEngine() *gin.Engine {
	return r.engine
}
