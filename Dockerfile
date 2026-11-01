# Stage 1: Build Angular frontend
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production runtime (Node.js API + Static SPA server + PostgreSQL)
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY --from=build /app/dist/tasker ./dist/tasker

EXPOSE 3000
CMD ["node", "server/server.mjs"]
