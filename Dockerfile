# =====================
# Build Stage
# =====================
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install git for fetching dependencies
RUN apk add --no-cache git ca-certificates

# Copy go module files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /brighted .

# =====================
# Production Stage
# =====================
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user
RUN adduser -D -g '' appuser

# Copy binary from builder
COPY --from=builder /brighted /app/brighted

# Copy static files and templates
COPY templates/ /app/templates/
COPY public/ /app/public/
COPY syllabuses/ /app/syllabuses/

# Copy logo
COPY BrightEdLogo.png /app/BrightEdLogo.png

# Set ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/ || exit 1

# Run the binary
CMD ["/app/brighted"]
