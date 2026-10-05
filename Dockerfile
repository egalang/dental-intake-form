# --- Build stage -----------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build-time frontend config. `.env` is excluded from the build context, so pass
# these through compose build args. Empty values fall back to app defaults.
ARG VITE_REGISTRATION_API_URL=""
ARG VITE_TURNSTILE_SITE_KEY=""
ENV VITE_REGISTRATION_API_URL=$VITE_REGISTRATION_API_URL
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY

RUN npm run build

# --- Runtime stage ---------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
