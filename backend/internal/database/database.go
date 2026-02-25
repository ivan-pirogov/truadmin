package database

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"truadmin/internal/models"
)

var DB *gorm.DB
var DBError error
var DBConfig DatabaseConfig

// DatabaseConfig holds database connection parameters
type DatabaseConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	DBName   string
}

// GetDBError returns the database connection error if any
func GetDBError() error {
	return DBError
}

// GetDBConfig returns the database configuration
func GetDBConfig() DatabaseConfig {
	return DBConfig
}

// IsConnected checks if database is connected
func IsConnected() bool {
	return DB != nil && DBError == nil
}

// InitDatabase initializes the PostgreSQL database connection and runs migrations
// Returns error but does not stop server startup - error is stored for later retrieval
func InitDatabase(cfg DatabaseConfig) error {
	DBConfig = cfg
	DBError = nil

	// Configure GORM logger
	gormLogger := logger.Default.LogMode(logger.Info)

	// Build PostgreSQL connection string
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		cfg.Host,
		cfg.Username,
		cfg.Password,
		cfg.DBName,
		cfg.Port,
	)

	// Open PostgreSQL connection
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		DBError = fmt.Errorf("failed to connect to database: %w", err)
		log.Printf("WARNING: Database connection failed: %v", DBError)
		log.Printf("Server will start but database operations will be unavailable")
		log.Printf("Database config: host=%s, port=%s, dbname=%s, user=%s", cfg.Host, cfg.Port, cfg.DBName, cfg.Username)
		return DBError
	}

	// Get underlying SQL database for connection pool settings
	sqlDB, err := db.DB()
	if err != nil {
		DBError = fmt.Errorf("failed to get database instance: %w", err)
		log.Printf("WARNING: Database initialization failed: %v", DBError)
		return DBError
	}

	// Set connection pool settings for PostgreSQL
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)

	DB = db

	// Run auto migrations
	if err := runMigrations(); err != nil {
		DBError = fmt.Errorf("failed to run migrations: %w", err)
		log.Printf("WARNING: Database migrations failed: %v", DBError)
		return DBError
	}

	DBError = nil
	log.Println("Database initialized successfully")
	return nil
}

// runMigrations runs automatic migrations for all models
func runMigrations() error {
	log.Println("Running database migrations...")

	// Add all models that need to be migrated here
	models := []interface{}{
		&models.Connection{},
		&models.User{},
		&models.TruETLDatabase{},
		&models.TruETLSaveLog{},
		&models.HohAddressDatabase{},
		&models.HohAddressSaveLog{},
		&models.ConnectionSaveLog{},
		&models.UserSaveLog{},
		&models.RoleSaveLog{},
		// Add more models here as needed (scripts, etc.)
		
	}

	for _, model := range models {
		if err := DB.AutoMigrate(model); err != nil {
			return fmt.Errorf("failed to migrate model %T: %w", model, err)
		}
	}

	log.Println("Database migrations completed successfully")
	return nil
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}

// Close closes the database connection
func Close() error {
	if DB != nil {
		sqlDB, err := DB.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}
