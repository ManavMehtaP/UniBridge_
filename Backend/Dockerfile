# Production image for the UniBridge Node/Express API (Render).
# Render injects $PORT; src/config/env.ts already reads PORT (default 4000), so no code change needed.
FROM node:22-slim

WORKDIR /app

# Prisma needs openssl at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy manifests + prisma schema first: `postinstall` runs `prisma generate`, which needs them.
COPY package*.json ./
COPY schema.prisma prisma.config.ts ./

# Install ALL deps (tsx is needed at runtime by `npm start`) before flipping NODE_ENV.
RUN npm ci

COPY . .

# Regenerate against the final schema, then switch to production behaviour.
RUN npx prisma generate
ENV NODE_ENV=production

EXPOSE 4000
CMD ["npm", "start"]
