# ---------- Build stage ----------
    FROM node:20-alpine AS build
    WORKDIR /backend
    
    COPY package*.json ./
    COPY api/package*.json ./api/
    COPY worker/package*.json ./worker/
    COPY libs/package*.json ./libs/
    
    RUN npm install -g typescript
    RUN npm ci
    
    COPY . .
    
    RUN npm run build -w worker
    
    # ---------- Runtime stage ----------
    FROM node:20-alpine
    WORKDIR /app
    
    COPY --from=build /backend/worker/dist ./dist
    COPY --from=build /backend/worker/package*.json ./
    RUN npm ci --omit=dev
    
    CMD ["node", "dist/worker/src/index.js"]
    