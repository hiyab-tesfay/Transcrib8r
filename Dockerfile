# syntax=docker/dockerfile:1

FROM node:24.19-alpine AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=10000

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist/

EXPOSE 10000

WORKDIR /app/backend

CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]
