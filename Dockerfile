# Multi-stage build for TruAdmin
# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Build backend
FROM golang:1.25-alpine AS backend-builder

WORKDIR /app/backend

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY backend/go.mod backend/go.sum ./

# Download dependencies
RUN go mod download

# Copy backend source
COPY backend/ ./

# Build backend binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o /app/truadmin ./cmd/server

# Stage 3: Final image
FROM alpine:latest

# Install ca-certificates and wget for HTTPS requests and healthcheck
RUN apk --no-cache add ca-certificates tzdata wget

WORKDIR /app

# Copy frontend build from frontend-builder
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Copy backend binary from backend-builder
COPY --from=backend-builder /app/truadmin ./truadmin

# Create directory for logs
RUN mkdir -p /app/logs

# Expose port 80
EXPOSE 80

# Set environment variables
ENV SERVER_PORT=80
ENV GIN_MODE=release
ENV TZ=UTC
ENV FRONTEND_BUILD_PATH=/app/frontend/build

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Run the application
CMD ["./truadmin"]

