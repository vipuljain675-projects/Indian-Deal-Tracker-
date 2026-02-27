FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o notifier main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/notifier .
CMD ["./notifier"]