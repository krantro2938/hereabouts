FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@12.18.0 && apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# The nitro output bundles its own dependencies (better-sqlite3 included).
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 \
	DATABASE_PATH=/data/hereabouts.db AUDIO_DIR=/data/audio PHOTO_DIR=/data/photos
COPY --from=build /app/.output ./.output
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
