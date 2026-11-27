# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# The API URL is baked into the bundle at build time (Vite env var)
ARG VITE_BASE_URL=http://localhost:8080
ENV VITE_BASE_URL=$VITE_BASE_URL
RUN npm run build

# ---- serve stage ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
