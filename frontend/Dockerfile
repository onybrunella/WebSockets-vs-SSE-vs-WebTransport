FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
# Le postinstall patch WT n'a pas besoin du backend ici
RUN npm run build -- --configuration production

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/frontend-entrypoint.sh /docker-entrypoint.d/40-env.sh
RUN chmod +x /docker-entrypoint.d/40-env.sh
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
