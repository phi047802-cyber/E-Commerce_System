# Dockerfile for INSTASQUAD (Full-stack Containerized Environment)
FROM node:20-alpine AS runner

WORKDIR /app

# Install system dependencies needed for native modules / Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy package manifests
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN npm --prefix client install

# Copy full project source
COPY . .

# Generate Prisma Client & Run build
RUN npx prisma generate
RUN npm run build:server
RUN npm run build:client

# Expose backend (4000) and frontend (5173 / preview)
EXPOSE 4000

# Environment defaults
ENV PORT=4000
ENV NODE_ENV=production
# DATABASE_URL (SQL Server) được truyền từ docker-compose.yml
ENV JWT_SECRET="instasquad_super_secret_jwt_demo_key_2026"
ENV CLIENT_URL="http://localhost:5173"

# Entrypoint: ensure migrations and seed are ready, then launch dev/start
CMD ["sh", "-c", "node scripts/db/ensure-database.mjs && npx prisma migrate deploy && npm run prisma:seed && npm run dev:server"]
