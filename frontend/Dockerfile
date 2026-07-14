FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install
COPY frontend/ .
ARG WS_URL=ws://localhost:3001
ARG SSE_URL=http://localhost:3002
ARG WT_URL=https://127.0.0.1:3003
ENV WS_URL=$WS_URL SSE_URL=$SSE_URL WT_URL=$WT_URL
RUN node scripts/inject-env.mjs && npm run build:prod

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/bench-ui/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
