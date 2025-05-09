# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /backend

# Copy workspace root files and sub-package manifests
COPY package*.json ./
COPY api/package*.json ./api/
COPY worker/package*.json ./worker/
COPY libs/package*.json ./libs/

# Install deps
RUN npm install -g typescript
RUN npm install

# Copy the entire monorepo
COPY . .

# Build both services
RUN npm run build -w api && npm run build -w worker

# ---------- Runtime stage ----------
FROM node:20-alpine
WORKDIR /app

# Copy production code
COPY --from=build /backend/api/dist ./api/dist
COPY --from=build /backend/worker/dist ./worker/dist

# Copy and install production deps
COPY --from=build /backend/api/package*.json ./api/
COPY --from=build /backend/worker/package*.json ./worker/
RUN npm install --omit=dev --prefix ./api && \
    npm install --omit=dev --prefix ./worker

# Default command (overridden by Fly process groups)
CMD ["node", "api/dist/api/src/index.js"]
