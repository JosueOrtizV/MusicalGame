FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY musical-blocks-server/package*.json ./musical-blocks-server/
COPY shared/package*.json ./shared/

# Install dependencies (workspaces support if any, otherwise standard npm)
RUN cd musical-blocks-server && npm install

# Copy source code
COPY shared ./shared
COPY musical-blocks-server ./musical-blocks-server

# Build server
WORKDIR /app/musical-blocks-server
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies only
COPY --from=builder /app/musical-blocks-server/package*.json ./musical-blocks-server/
RUN cd musical-blocks-server && npm ci --omit=dev

COPY --from=builder /app/musical-blocks-server/dist ./musical-blocks-server/dist
COPY --from=builder /app/shared ./shared

WORKDIR /app/musical-blocks-server
EXPOSE 3001
CMD ["npm", "start"]
