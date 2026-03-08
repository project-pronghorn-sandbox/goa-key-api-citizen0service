FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
COPY --from=builder --chown=app:app /app/dist ./dist
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
