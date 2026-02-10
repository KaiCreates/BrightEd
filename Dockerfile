
# =====================
# Build Stage
# =====================
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
# This will generate the .next/standalone folder because output: 'standalone' is in next.config.js
RUN npm run build

# =====================
# Production Stage
# =====================
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOSTNAME="0.0.0.0"

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone build
# This includes the server and the necessary dependencies
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# CRITICAL: Copy static assets
# standalone build does NOT include public or .next/static folders by default
# verification: these COPY commands fix the MIME type/404 errors
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 4000

CMD ["node", "server.js"]
