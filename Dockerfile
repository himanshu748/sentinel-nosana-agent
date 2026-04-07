FROM oven/bun:1 AS base

LABEL org.opencontainers.image.source=https://github.com/himanshu748/sentinel-nosana-agent
LABEL org.opencontainers.image.description="Sentinel - Crypto Research Agent powered by ElizaOS and Nosana"

RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  git \
  curl \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

ENV ELIZAOS_TELEMETRY_DISABLED=true
ENV DO_NOT_TRACK=1

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

COPY . .

RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV SERVER_PORT=3000

CMD ["bunx", "elizaos", "start"]
