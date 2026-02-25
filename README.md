# TruAdmin

TruAdmin is a modern web tool for database management inspired by pgAdmin. It provides a unified interface for working with PostgreSQL, MySQL, and Snowflake via browser.

## Architecture
- Backend: Go (Gin, GORM, PostgreSQL, JWT)
- Frontend: React 18, TypeScript, Monaco Editor, Axios

## Key Features
- Authentication & authorization (admin/user roles)
- Manage DB connections (create, edit, test)
- SQL query editor with syntax highlighting
- Monitoring: active queries, locks, deadlocks
- Role & user management
- ETL integration (TruETL)
- Query history

## Project Structure
- backend/: Go API server
- frontend/: React app
- docs/: Documentation

## Deployment
- Local: Go backend, React frontend
- Docker Compose supported

## Security
- JWT authentication
- Passwords hashed (bcrypt)
- CORS configured

## Future Improvements
- Encryption for connection passwords
- Rate limiting, logging, more DB support
- Dark mode, performance optimizations

TruAdmin is modular, scalable, and follows best practices for Go and React apps.