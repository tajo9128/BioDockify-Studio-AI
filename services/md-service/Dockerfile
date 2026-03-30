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

# Install OpenMM CUDA plugin for GPU acceleration
# Note: For NVIDIA GPU, ensure nvidia-docker is installed on host
RUN pip install --no-cache-dir openmm-cuda

# Add GPU detection info
RUN echo '#!/bin/bash' > /usr/local/bin/check_gpu.sh && \
    echo 'python3 -c "import openmm as mm; platforms = [p.getName() for p in mm.Platform.getPlatforms()]; print(\"Available platforms:\", platforms)"' >> /usr/local/bin/check_gpu.sh && \
    chmod +x /usr/local/bin/check_gpu.sh

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

COPY . .

RUN mkdir -p /app/storage/md && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
