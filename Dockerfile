FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
ARG GITHUB_SHA=development
ARG SMOKESTACK_RELEASED_AT
ENV GITHUB_SHA=${GITHUB_SHA}
ENV SMOKESTACK_RELEASED_AT=${SMOKESTACK_RELEASED_AT}
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/docs/constitution ./docs/constitution

EXPOSE 8080
CMD ["node", "dist/server.cjs"]
