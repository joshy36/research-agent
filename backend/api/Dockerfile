# ---------- Build stage ----------
    FROM node:20-alpine AS build
    WORKDIR /backend
    
    # Copy workspace root files and sub-package manifests
    COPY package*.json ./
    COPY api/package*.json ./api/
    COPY worker/package*.json ./worker/
    COPY libs/package*.json ./libs/
    
    # Install deps (including devDependencies)
    RUN npm install -g typescript
    RUN npm ci
    
    # Copy all code
    COPY . .
    
    # Build only the API workspace
    RUN npm run build -w api
    
    # ---------- Runtime stage ----------
    FROM node:20-alpine
    WORKDIR /app
    
    # Copy built code and production dependencies only
    COPY --from=build /backend/api/dist ./dist
    COPY --from=build /backend/api/package*.json ./
    RUN npm ci --omit=dev
    
    CMD ["node", "dist/api/src/index.js"]
    