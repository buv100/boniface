# Boniface API — Node + better-sqlite3
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY server ./server
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data

RUN mkdir -p /data

EXPOSE 3001

CMD ["npx", "tsx", "server/src/index.ts"]
