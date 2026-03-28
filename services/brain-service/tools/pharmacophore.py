"""
Pharmacophore tools for Nanobot Brain
"""

import httpx
import os
from typing import Any, Dict

from tools import BaseTool, ToolInput, ToolOutput


class GeneratePharmacophoreInput(ToolInput):
    receptor_pdb: str = None
    ligand_pdb: str = None
    features: str = "HBA,HBD,PI,NI,AR,HY"


class GeneratePharmacophoreTool(BaseTool):
    name = "generate_pharmacophore"
    description = "Generate pharmacophore model from receptor or ligand structure"
    category = "pharmacophore"
    
    input_schema = {
        "type": "object",
        "properties": {
            "receptor_pdb": {"type": "string", "description": "Path to receptor PDB file"},
            "ligand_pdb": {"type": "string", "description": "Path to ligand PDB file"},
            "features": {"type": "string", "description": "Comma-separated features (HBA,HBD,PI,NI,AR,HY)"}
        }
    }
    
    async def execute(self, input_data: GeneratePharmacophoreInput) -> ToolOutput:
        PHARMA_SERVICE = os.getenv("PHARMACOPHORE_SERVICE_URL", "http://pharmacophore-service:8004")
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{PHARMA_SERVICE}/generate",
                    json={
                        "receptor_pdb": input_data.receptor_pdb,
                        "ligand_pdb": input_data.ligand_pdb,
                        "features": input_data.features
                    }
                )
                response.raise_for_status()
                result = response.json()
                
                return ToolOutput(
                    success=True,
                    data={
                        "pharmacophore_id": result.get("pharmacophore_id"),
                        "num_features": result.get("num_features", 0),
                        "features": result.get("features", [])
                    }
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class ScreenLibraryInput(ToolInput):
    pharmacophore_id: str
    library_path: str
    required_features: list = None


class ScreenLibraryTool(BaseTool):
    name = "screen_library"
    description = "Screen compound library against pharmacophore model"
    category = "pharmacophore"
    
    input_schema = {
        "type": "object",
        "properties": {
            "pharmacophore_id": {"type": "string", "description": "Pharmacophore model ID"},
            "library_path": {"type": "string", "description": "Path to compound library (SDF)"},
            "required_features": {"type": "array", "description": "Required feature types to match"}
        },
        "required": ["pharmacophore_id", "library_path"]
    }
    
    async def execute(self, input_data: ScreenLibraryInput) -> ToolOutput:
        PHARMA_SERVICE = os.getenv("PHARMACOPHORE_SERVICE_URL", "http://pharmacophore-service:8004")
        
        try:
            async with httpx.AsyncClient(timeout=3600.0) as client:
                response = await client.post(
                    f"{PHARMA_SERVICE}/screen",
                    json={
                        "pharmacophore_id": input_data.pharmacophore_id,
                        "library_path": input_data.library_path,
                        "required_features": input_data.required_features or []
                    }
                )
                response.raise_for_status()
                result = response.json()
                
                return ToolOutput(
                    success=True,
                    data={
                        "job_id": result.get("job_id"),
                        "num_hits": result.get("num_hits", 0),
                        "hits": result.get("hits", [])[:50]
                    }
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))
