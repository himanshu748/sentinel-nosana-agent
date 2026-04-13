FROM oven/bun:1 AS base

LABEL org.opencontainers.image.source=https://github.com/himanshu748/agent-challenge
LABEL org.opencontainers.image.description="Sentinel - Crypto Research Agent powered by ElizaOS and Nosana"

RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  git \
  curl \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_23.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

ENV ELIZAOS_TELEMETRY_DISABLED=true
ENV DO_NOT_TRACK=1

WORKDIR /app

COPY package.json bun.lock* ./
COPY scripts/patch-openai-plugin.js scripts/patch-openai-plugin.js
RUN bun install --frozen-lockfile || bun install

COPY . .

# Replace default ElizaOS client with Sentinel custom frontend
RUN CLIENT_DIR=$(find /app/node_modules/@elizaos/server/dist/client -maxdepth 0 2>/dev/null || echo "") && \
    if [ -n "$CLIENT_DIR" ] && [ -d "$CLIENT_DIR" ]; then \
      cp /app/frontend/index.html "$CLIENT_DIR/index.html" && \
      cp /app/frontend/style.css "$CLIENT_DIR/style.css" && \
      cp /app/frontend/app.js "$CLIENT_DIR/app.js"; \
    fi

RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV SERVER_PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/agents || exit 1

CMD ["bunx", "elizaos", "start"]
