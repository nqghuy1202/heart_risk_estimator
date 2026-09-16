# syntax=docker/dockerfile:1

# ---- Stage 1: build the React frontend ----
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build          # -> backend/predictor/static/frontend/ (see vite.config.ts)

# ---- Stage 2: python runtime ----
FROM python:3.12-slim AS backend
WORKDIR /app
RUN adduser --disabled-password --uid 10001 app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt gunicorn==23.0.0

COPY backend/ ./backend/
# vite.config.ts outDir points at ../backend/predictor/static/frontend, so stage 1 wrote the
# bundle there (relative to /app/frontend) even though /app/backend didn't exist yet.
COPY --from=frontend /app/backend/predictor/static/frontend /app/backend/predictor/static/frontend
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh && chown -R app:app /app/backend

WORKDIR /app/backend
ENV PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings
EXPOSE 8000
USER app
# db.sqlite3 isn't copied in (see .dockerignore) — the entrypoint runs migrate to create it fresh,
# then hands off to gunicorn. There are no app models, so this is just Django's own admin/session
# tables; nothing is lost between deploys since nothing meaningful is stored there.
CMD ["/app/docker-entrypoint.sh"]
