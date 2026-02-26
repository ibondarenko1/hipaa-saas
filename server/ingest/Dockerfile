# server/ingest/Dockerfile
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
COPY migrations ./migrations
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Only runtime deps
COPY package.json ./
RUN npm install --omit=dev

# Built code + migrations
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations

EXPOSE 8080
CMD ["node", "dist/index.js"]
