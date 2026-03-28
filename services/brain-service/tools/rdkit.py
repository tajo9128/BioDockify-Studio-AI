"""
RDKit tools for Nanobot Brain
"""

import httpx
import os
from typing import Any, Dict

from tools import BaseTool, ToolInput, ToolOutput


class SmilesTo3DInput(ToolInput):
    smiles: str
    name: str = "molecule"


class SmilesTo3DTool(BaseTool):
    name = "smiles_to_3d"
    description = "Convert SMILES notation to 3D structure using RDKit"
    category = "rdkit"
    
    input_schema = {
        "type": "object",
        "properties": {
            "smiles": {"type": "string", "description": "SMILES notation of molecule"},
            "name": {"type": "string", "description": "Name for the molecule"}
        },
        "required": ["smiles"]
    }
    
    async def execute(self, input_data: SmilesTo3DInput) -> ToolOutput:
        RDKIT_SERVICE = os.getenv("RDKIT_SERVICE_URL", "http://rdkit-service:8000")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{RDKIT_SERVICE}/smiles-to-3d",
                    json={
                        "smiles": input_data.smiles,
                        "name": input_data.name
                    }
                )
                response.raise_for_status()
                result = response.json()
                
                return ToolOutput(
                    success=True,
                    data={
                        "pdb_path": result.get("pdb_path"),
                        "sdf_path": result.get("sdf_path"),
                        "num_atoms": result.get("num_atoms", 0),
                        "smiles": input_data.smiles
                    }
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class ConvertFormatInput(ToolInput):
    input_path: str
    output_format: str


class ConvertFormatTool(BaseTool):
    name = "convert_format"
    description = "Convert molecule between formats (PDB, SDF, mol, pdbqt)"
    category = "rdkit"
    
    input_schema = {
        "type": "object",
        "properties": {
            "input_path": {"type": "string", "description": "Input file path"},
            "output_format": {"type": "string", "description": "Target format (pdb, sdf, mol, pdbqt)"}
        },
        "required": ["input_path", "output_format"]
    }
    
    async def execute(self, input_data: ConvertFormatInput) -> ToolOutput:
        RDKIT_SERVICE = os.getenv("RDKIT_SERVICE_URL", "http://rdkit-service:8003")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{RDKIT_SERVICE}/convert",
                    json={
                        "input_path": input_data.input_path,
                        "output_format": input_data.output_format
                    }
                )
                response.raise_for_status()
                result = response.json()
                
                return ToolOutput(
                    success=True,
                    data={
                        "output_path": result.get("output_path"),
                        "num_atoms": result.get("num_atoms", 0)
                    }
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class OptimizeMoleculeInput(ToolInput):
    pdb_path: str


class OptimizeMoleculeTool(BaseTool):
    name = "optimize_molecule"
    description = "Optimize molecule 3D structure using MMFF force field"
    category = "rdkit"
    
    input_schema = {
        "type": "object",
        "properties": {
            "pdb_path": {"type": "string", "description": "Path to PDB file to optimize"}
        },
        "required": ["pdb_path"]
    }
    
    async def execute(self, input_data: OptimizeMoleculeInput) -> ToolOutput:
        RDKIT_SERVICE = os.getenv("RDKIT_SERVICE_URL", "http://rdkit-service:8003")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{RDKIT_SERVICE}/optimize",
                    json={"pdb_path": input_data.pdb_path}
                )
                response.raise_for_status()
                result = response.json()
                
                return ToolOutput(
                    success=True,
                    data={
                        "output_path": result.get("output_path"),
                        "num_atoms": result.get("num_atoms", 0)
                    }
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))
