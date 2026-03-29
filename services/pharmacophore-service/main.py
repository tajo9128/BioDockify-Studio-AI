"""
Pharmacophore Service - RDKit-based pharmacophore modeling API
"""

import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("pharmacophore-service")

FEATURE_COLORS = {
    "Donor": "#4169E1",
    "Acceptor": "#DC143C",
    "Hydrophobic": "#FFD700",
    "Aromatic": "#9932CC",
    "PosIonizable": "#32CD32",
    "NegIonizable": "#FF8C00",
    "LumpedHydrophobic": "#DAA520",
}

FEATURE_RADII = {
    "Donor": 1.5,
    "Acceptor": 1.5,
    "Hydrophobic": 1.8,
    "Aromatic": 2.0,
    "PosIonizable": 1.5,
    "NegIonizable": 1.5,
    "LumpedHydrophobic": 1.6,
}


class PharmacophoreRequest(BaseModel):
    smiles: Optional[str] = None
    pdb: Optional[str] = None
    receptor_pdb: Optional[str] = None
    ligand_pdb: Optional[str] = None
    features: Optional[str] = None


class ScreenRequest(BaseModel):
    library: Optional[List[str]] = None
    library_path: Optional[str] = None
    pharmacophore_id: Optional[str] = None
    min_features: int = 3
    required_features: Optional[List[str]] = None


class AlignRequest(BaseModel):
    reference_features: List[Dict[str, Any]]
    mobile_smiles: str


_engine = None


def get_engine():
    global _engine
    if _engine is None:
        from pharmacophore_engine import PharmacophoreEngine

        _engine = PharmacophoreEngine()
    return _engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Pharmacophore Service starting up...")
    yield
    logger.info("Pharmacophore Service shutting down...")


app = FastAPI(
    title="Pharmacophore Service API",
    description="RDKit-based pharmacophore modeling",
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


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "pharmacophore-service",
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/")
def root():
    return {"service": "pharmacophore-service", "version": "2.0.0"}


@app.post("/generate")
def generate_pharmacophore(request: PharmacophoreRequest):
    """Generate pharmacophore from SMILES, PDB, receptor_pdb, or ligand_pdb."""
    try:
        engine = get_engine()

        import uuid

        pharma_id = str(uuid.uuid4())

        input_smiles = request.smiles
        input_pdb = request.pdb or request.receptor_pdb or request.ligand_pdb

        if input_smiles:
            result = engine.generate_from_smiles(input_smiles)
        elif input_pdb:
            result = engine.generate_from_pdb(input_pdb)
        else:
            return {"success": False, "error": "Provide SMILES or PDB input"}

        result["pharmacophore_id"] = pharma_id
        return result

    except Exception as e:
        logger.error(f"Pharmacophore generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/screen")
def screen_library(request: ScreenRequest):
    """Screen a library of compounds against pharmacophore features."""
    try:
        engine = get_engine()

        library_smiles = request.library or []
        if request.library_path and os.path.exists(request.library_path):
            from rdkit import Chem

            supplier = Chem.SDMolSupplier(request.library_path)
            for mol in supplier:
                if mol:
                    smi = Chem.MolToSmiles(mol)
                    library_smiles.append(smi)

        result = engine.screen_library(
            library_smiles=library_smiles,
            min_features=request.min_features,
            required_features=request.required_features or None,
        )
        return result

    except Exception as e:
        logger.error(f"Pharmacophore screening error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/align")
def align_molecule(request: AlignRequest):
    """Align a molecule to a reference pharmacophore."""
    try:
        engine = get_engine()
        result = engine.align_to_pharmacophore(
            ref_features=request.reference_features, mobile_smiles=request.mobile_smiles
        )
        return result

    except Exception as e:
        logger.error(f"Pharmacophore alignment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/features")
def get_feature_info():
    """Get information about available pharmacophore features."""
    features = [
        {
            "name": name,
            "color": FEATURE_COLORS.get(name),
            "radius": FEATURE_RADII.get(name),
            "description": _get_feature_description(name),
        }
        for name in FEATURE_COLORS.keys()
    ]

    return {"features": features, "total_types": len(features)}


def _get_feature_description(name: str) -> str:
    descriptions = {
        "Donor": "Hydrogen bond donor",
        "Acceptor": "Hydrogen bond acceptor",
        "Hydrophobic": "Hydrophobic region",
        "Aromatic": "Aromatic ring center",
        "PosIonizable": "Positive ionizable group",
        "NegIonizable": "Negative ionizable group",
        "LumpedHydrophobic": "Lumped hydrophobic region",
    }
    return descriptions.get(name, "")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8004)
