FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY ../../frontend/package*.json ./
RUN npm ci
COPY ../../frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=frontend-builder /app/dist /var/www/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
