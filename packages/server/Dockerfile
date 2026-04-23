FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the project (assuming it's a TypeScript project that needs compilation)
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm and production dependencies in one layer
RUN npm install -g pnpm

# Copy package files and install production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose port 3000
EXPOSE 3000

# Start the server
# Environment variables should be passed at runtime via --env-file or -e flags
CMD ["node", "dist/index.js"]
