FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY musical-blocks-client/package*.json ./musical-blocks-client/
COPY shared/package*.json ./shared/

# Install dependencies
RUN cd musical-blocks-client && npm install

# Copy source code
COPY shared ./shared
COPY musical-blocks-client ./musical-blocks-client

# Build Next.js
WORKDIR /app/musical-blocks-client
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js Standalone output automatically copies the required node_modules
COPY --from=builder /app/musical-blocks-client/public ./public
COPY --from=builder /app/musical-blocks-client/.next/standalone/musical-blocks-client ./
COPY --from=builder /app/musical-blocks-client/.next/standalone/node_modules ./node_modules
COPY --from=builder /app/musical-blocks-client/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
