"""
Docking Studio v2.0 - API Backend Service
Main gateway that routes requests to specialized services
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DOCKING_SERVICE_URL = os.getenv("DOCKING_SERVICE_URL", "http://docking-service:8000")
RDKIT_SERVICE_URL = os.getenv("RDKIT_SERVICE_URL", "http://rdkit-service:8000")
PHARMACOPHORE_SERVICE_URL = os.getenv(
    "PHARMACOPHORE_SERVICE_URL", "http://pharmacophore-service:8000"
)
BRAIN_SERVICE_URL = os.getenv("BRAIN_SERVICE_URL", "http://brain-service:8000")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

STORAGE_DIR = Path("/app/storage")
UPLOADS_DIR = Path("/app/uploads")
STORAGE_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

# In-memory LLM settings (shared across services)
llm_settings = {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "api_key": "",
    "base_url": "https://api.openai.com/v1",
    "temperature": 0.7,
    "max_tokens": 4096,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("Docking Studio v2.0 - API Backend")
    logger.info("=" * 60)
    logger.info(f"Docking Service: {DOCKING_SERVICE_URL}")
    logger.info(f"RDKit Service: {RDKIT_SERVICE_URL}")
    logger.info(f"Pharmacophore Service: {PHARMACOPHORE_SERVICE_URL}")
    logger.info(f"Brain Service: {BRAIN_SERVICE_URL}")
    yield
    logger.info("API Backend shutting down...")


app = FastAPI(
    title="Docking Studio API",
    description="API Gateway for Docking Studio v2.0 Microservices",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class JobCreate(BaseModel):
    name: str
    job_type: str
    parameters: dict


class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "api-backend", "version": "2.0.0"}


@app.get("/")
async def root():
    return {
        "service": "Docking Studio API Gateway",
        "version": "2.0.0",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "jobs": "/jobs",
            "upload": "/upload",
            "docking": "/docking",
            "rdkit": "/rdkit",
            "pharmacophore": "/pharmacophore",
            "brain": "/brain",
        },
    }


@app.post("/upload", response_model=dict)
async def upload_file(file: UploadFile = File(...)):
    """Upload a molecule or protein file"""
    try:
        file_path = UPLOADS_DIR / file.filename
        content = await file.read()
        file_path.write_bytes(content)

        file_type = "unknown"
        ext = file_path.suffix.lower()
        if ext in [".pdb", ".pdbqt"]:
            file_type = "protein"
        elif ext in [".sdf", ".mol", ".mol2", ".pdb"]:
            file_type = "ligand"
        elif ext in [".smiles", ".smi"]:
            file_type = "smiles"

        return {
            "filename": file.filename,
            "path": str(file_path),
            "type": file_type,
            "size": len(content),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/jobs", response_model=JobResponse)
async def create_job(job: JobCreate, background_tasks: BackgroundTasks):
    """Create a new job and queue it"""
    import uuid

    job_id = str(uuid.uuid4())

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            if job.job_type == "docking":
                response = await client.post(
                    f"{DOCKING_SERVICE_URL}/dock",
                    json={"job_id": job_id, **job.parameters},
                )
            elif job.job_type == "pharmacophore":
                response = await client.post(
                    f"{PHARMACOPHORE_SERVICE_URL}/generate",
                    json={"job_id": job_id, **job.parameters},
                )
            elif job.job_type == "rdkit":
                response = await client.post(
                    f"{RDKIT_SERVICE_URL}/process",
                    json={"job_id": job_id, **job.parameters},
                )
            else:
                raise HTTPException(
                    status_code=400, detail=f"Unknown job type: {job.job_type}"
                )

            response.raise_for_status()
            result = response.json()
            return JobResponse(
                job_id=job_id,
                status="queued",
                message=result.get("message", "Job queued"),
            )
        except httpx.HTTPError as e:
            logger.error(f"Failed to create job: {e}")
            return JobResponse(job_id=job_id, status="error", message=str(e))


@app.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get job status from Redis"""
    import redis

    try:
        r = redis.from_url(REDIS_URL)
        job_data = r.get(f"job:{job_id}")
        if job_data:
            import json

            return json.loads(job_data)
        return {"job_id": job_id, "status": "not_found"}
    except Exception as e:
        return {"job_id": job_id, "status": "error", "message": str(e)}


@app.get("/jobs")
async def list_jobs(limit: int = 50):
    """List recent jobs"""
    import redis

    try:
        r = redis.from_url(REDIS_URL)
        job_keys = r.keys("job:*")[:limit]
        jobs = []
        for key in job_keys:
            job_data = r.get(key)
            if job_data:
                import json

                jobs.append(json.loads(job_data))
        return {"jobs": jobs, "count": len(jobs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/docking/{job_id}/cancel")
async def cancel_docking_job(job_id: str):
    """Cancel a running docking job"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(f"{DOCKING_SERVICE_URL}/cancel/{job_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.get("/docking/{job_id}/results")
async def get_docking_results(job_id: str):
    """Get docking results"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(f"{DOCKING_SERVICE_URL}/results/{job_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=404, detail=str(e))


@app.post("/pharmacophore/generate")
async def generate_pharmacophore(
    receptor_pdb: str, ligand_pdb: Optional[str] = None, features: Optional[str] = None
):
    """Generate pharmacophore from receptor or ligand"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                f"{PHARMACOPHORE_SERVICE_URL}/generate",
                json={
                    "receptor_pdb": receptor_pdb,
                    "ligand_pdb": ligand_pdb,
                    "features": features,
                },
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/pharmacophore/screen")
async def screen_pharmacophore(pharmacophore_id: str, library_path: str):
    """Screen a library against a pharmacophore"""
    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            response = await client.post(
                f"{PHARMACOPHORE_SERVICE_URL}/screen",
                json={
                    "pharmacophore_id": pharmacophore_id,
                    "library_path": library_path,
                },
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/rdkit/smiles-to-3d")
async def smiles_to_3d(smiles: str, name: Optional[str] = None):
    """Convert SMILES to 3D structure"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{RDKIT_SERVICE_URL}/smiles-to-3d",
                json={"smiles": smiles, "name": name},
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/rdkit/optimize")
async def optimize_molecule(pdb_path: str):
    """Optimize molecule 3D structure"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{RDKIT_SERVICE_URL}/optimize", json={"pdb_path": pdb_path}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
async def get_stats():
    """Get system statistics"""
    import redis

    try:
        r = redis.from_url(REDIS_URL)
        total_jobs = len(r.keys("job:*"))

        stats = {
            "total_jobs": total_jobs,
            "services": {
                "api_backend": "healthy",
                "docking_service": "unknown",
                "rdkit_service": "unknown",
                "pharmacophore_service": "unknown",
                "brain_service": "unknown",
            },
        }

        async with httpx.AsyncClient(timeout=5.0) as client:
            for service_name, service_url in [
                ("docking_service", DOCKING_SERVICE_URL),
                ("rdkit_service", RDKIT_SERVICE_URL),
                ("pharmacophore_service", PHARMACOPHORE_SERVICE_URL),
                ("brain_service", BRAIN_SERVICE_URL),
            ]:
                try:
                    response = await client.get(f"{service_url}/health")
                    if response.status_code == 200:
                        stats["services"][service_name] = "healthy"
                except:
                    stats["services"][service_name] = "unhealthy"

        return stats
    except Exception as e:
        return {"error": str(e)}


@app.get("/llm/settings")
async def get_llm_settings():
    """Get current LLM settings"""
    return {**llm_settings, "api_key": "***" if llm_settings.get("api_key") else ""}


class LLMSettingsUpdate(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


@app.put("/llm/settings")
async def update_llm_settings(settings: LLMSettingsUpdate):
    """Update LLM settings"""
    global llm_settings
    update_data = settings.model_dump(exclude_none=True)
    llm_settings.update(update_data)
    logger.info(
        f"LLM settings updated: provider={llm_settings['provider']}, model={llm_settings['model']}"
    )
    return {
        "status": "ok",
        "settings": {
            **llm_settings,
            "api_key": "***" if llm_settings.get("api_key") else "",
        },
    }


@app.post("/llm/test")
async def test_llm_connection():
    """Test LLM connection with current settings"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            headers = {}
            if llm_settings.get("api_key"):
                headers["Authorization"] = f"Bearer {llm_settings['api_key']}"

            response = await client.post(
                f"{llm_settings['base_url']}/chat/completions",
                json={
                    "model": llm_settings["model"],
                    "messages": [
                        {"role": "user", "content": "Hi, reply with 'OK' only."}
                    ],
                    "max_tokens": 10,
                },
                headers=headers,
            )
            response.raise_for_status()
            result = response.json()
            return {
                "status": "ok",
                "response": result["choices"][0]["message"]["content"],
            }
        except httpx.HTTPStatusError as e:
            return {
                "status": "error",
                "error": f"HTTP {e.response.status_code}: {e.response.text[:200]}",
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
