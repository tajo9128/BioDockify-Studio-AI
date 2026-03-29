# Worker Service - Celery-based background job processor
FROM python:3.11-slim

LABEL maintainer="BioDockify"
LABEL description="Redis Worker - Celery background job processor"

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

# Install RDKit and Vina
RUN pip install --no-cache-dir \
    rdkit \
    meeko \
    vina

# Install Celery and dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/storage /app/uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

# Start Celery worker
CMD ["celery", "-A", "worker:app", "worker", "--loglevel=info", "--concurrency=4"]
