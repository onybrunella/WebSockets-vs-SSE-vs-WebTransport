FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/ ./
RUN chmod +x utils/*.sh scripts/*.sh 2>/dev/null || true

ENV HOST=0.0.0.0
EXPOSE 3001 3002 3003
CMD ["node", "sse-server.js"]
