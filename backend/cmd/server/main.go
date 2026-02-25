package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"

	"truadmin/internal/config"
	"truadmin/internal/database"
	"truadmin/internal/handlers"
	"truadmin/internal/router"
	"truadmin/internal/services"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Set Gin mode
	if cfg.GinMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database (non-blocking - server will start even if DB connection fails)
	dbConfig := database.DatabaseConfig{
		Host:     cfg.DBHost,
		Port:     cfg.DBPort,
		Username: cfg.DBUsername,
		Password: cfg.DBPassword,
		DBName:   cfg.DBName,
	}
	if err := database.InitDatabase(dbConfig); err != nil {
		log.Printf("WARNING: Database initialization failed: %v", err)
		log.Println("Server will start but database operations will be unavailable")
		log.Println("Please check database connection settings and restart server")
	} else {
		defer database.Close()
	}

	// Initialize services
	authService := services.NewAuthService(os.Getenv("JWT_SECRET"))
	connectionService := services.NewConnectionService()
	connectionLogService := services.NewConnectionLogService()
	userLogService := services.NewUserLogService()
	roleLogService := services.NewRoleLogService()
	queryService := services.NewQueryService(connectionService)
	databaseService := services.NewDatabaseService(connectionService)
	truETLService := services.NewTruETLService(connectionService)
	truETLLogService := services.NewTruETLLogService()
	hohAddressService := services.NewHohAddressService(connectionService)
	hohAddressLogService := services.NewHohAddressLogService()

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler()
	authHandler := handlers.NewAuthHandler(authService, userLogService)
	connHandler := handlers.NewConnectionHandler(connectionService, connectionLogService)
	queryHandler := handlers.NewQueryHandler(queryService)
	databaseHandler := handlers.NewDatabaseHandler(databaseService, roleLogService)
	truETLHandler := handlers.NewTruETLHandler(truETLService, truETLLogService)
	hohAddressHandler := handlers.NewHohAddressHandler(hohAddressService, hohAddressLogService)

	// Initialize router
	r := router.NewRouter(healthHandler, authHandler, connHandler, queryHandler, databaseHandler, truETLHandler, hohAddressHandler)
	r.SetupRoutes(authService)

	// Get port from environment or use default
	port := cfg.ServerPort
	if port == "" {
		port = "8080"
	}

	// Start server
	log.Printf("Server starting on port %s...", port)
	if err := r.GetEngine().Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
		os.Exit(1)
	}
}
