# Multi-stage build: React frontend + Django backend + nginx
#
# Build the full stack:
#   docker-compose up --build
#
# Or build a single image manually:
#   docker build --build-arg VITE_SUPABASE_URL=... --build-arg VITE_SUPABASE_ANON_KEY=... -t talentflow .

# ============================================================
# Stage 1 - Build React
# ============================================================
FROM node:20-slim AS node-build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci --prefer-offline

COPY frontend/ ./

# Supabase URL and anon key are embedded into the JS bundle at build time.
# VITE_API_URL defaults to /api/v1 so nginx can proxy it to the backend.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL=/api/v1

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_URL=$VITE_API_URL

RUN npm run build


# ============================================================
# Stage 2 - Django backend
# ============================================================
FROM python:3.13-slim AS backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

# cffi (pulled in by cryptography) needs gcc + libffi at compile time
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

# Collect static files during image build using dummy secrets.
# Real secrets are injected at runtime via env_file / environment.
RUN SECRET_KEY=collectstatic-placeholder-key-minimum-50-chars-padded \
    SUPABASE_URL=https://placeholder.supabase.co \
    SUPABASE_ANON_KEY=placeholder \
    SUPABASE_SERVICE_ROLE_KEY=placeholder \
    SUPABASE_JWT_SECRET=placeholder-jwt-secret-minimum-32-chars-here \
    GEMINI_API_KEY=placeholder \
    DB_HOST=placeholder \
    python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "2", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]


# ============================================================
# Stage 3 - nginx serving the React SPA
# ============================================================
FROM nginx:1.27-alpine AS frontend

COPY --from=node-build /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
