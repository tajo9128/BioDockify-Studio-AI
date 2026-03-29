FROM python:3.11-slim

LABEL maintainer="BioDockify"
LABEL description="MD Service - OpenMM molecular dynamics simulation"

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    git \
    build-essential \
    libopenbabel7 \
    libhdf5-dev \
    libopenblas-dev \
    libglib2.0-0 \
    libgfortran5 \
    libsm6 \
    libxml2 \
    libxslt1.1 \
    libxrender1 \
    libxext6 \
    libeigen3-dev \
    cmake \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    rdkit-pypi \
    openmm \
    openmmforcefields \
    fastapi \
    uvicorn \
    pydantic \
    python-multipart==0.0.22 \
    requests \
    redis \
    numpy \
    pandas \
    matplotlib \
    httpx \
    biopython \
    scipy

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

COPY . .

RUN mkdir -p /app/storage/md && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
