"""
Analysis tools for Nanobot Brain
"""

import httpx
import os
from typing import Any, Dict

from tools import BaseTool, ToolInput, ToolOutput


class AnalyzeInteractionsInput(ToolInput):
    receptor_pdb: str
    ligand_pdb: str


class AnalyzeInteractionsTool(BaseTool):
    name = "analyze_interactions"
    description = "Analyze protein-ligand interactions (H-bonds, hydrophobic, etc.)"
    category = "analysis"
    
    input_schema = {
        "type": "object",
        "properties": {
            "receptor_pdb": {"type": "string", "description": "Path to receptor PDB"},
            "ligand_pdb": {"type": "string", "description": "Path to ligand PDB"}
        },
        "required": ["receptor_pdb", "ligand_pdb"]
    }
    
    async def execute(self, input_data: AnalyzeInteractionsInput) -> ToolOutput:
        API_BACKEND = os.getenv("API_BACKEND_URL", "http://api-backend:8000")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{API_BACKEND}/analyze/interactions",
                    json={
                        "receptor_pdb": input_data.receptor_pdb,
                        "ligand_pdb": input_data.ligand_pdb
                    }
                )
                response.raise_for_status()
                result = response.json()
                
                return ToolOutput(
                    success=True,
                    data={
                        "interactions": result.get("interactions", []),
                        "num_hbonds": result.get("num_hbonds", 0),
                        "num_hydrophobic": result.get("num_hydrophobic", 0)
                    }
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class PredictBindingInput(ToolInput):
    smiles: str
    target_pdb: str


class PredictBindingTool(BaseTool):
    name = "predict_binding"
    description = "Predict binding affinity using ML model (or Vina scoring)"
    category = "analysis"
    
    input_schema = {
        "type": "object",
        "properties": {
            "smiles": {"type": "string", "description": "Ligand SMILES"},
            "target_pdb": {"type": "string", "description": "Target protein PDB ID or file"}
        },
        "required": ["smiles", "target_pdb"]
    }
    
    async def execute(self, input_data: PredictBindingInput) -> ToolOutput:
        RDKIT_SERVICE = os.getenv("RDKIT_SERVICE_URL", "http://rdkit-service:8003")
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                smiles_resp = await client.post(
                    f"{RDKIT_SERVICE}/smiles-to-3d",
                    json={"smiles": input_data.smiles, "name": "predict_binding"}
                )
                smiles_resp.raise_for_status()
                mol_data = smiles_resp.json()
                
                return ToolOutput(
                    success=True,
                    data={
                        "smiles": input_data.smiles,
                        "pdb_path": mol_data.get("pdb_path"),
                        "num_atoms": mol_data.get("num_atoms", 0),
                        "note": "Docking required for binding prediction"
                    }
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class CompareLigandsInput(ToolInput):
    ligand_ids: list


class CompareLigandsTool(BaseTool):
    name = "compare_ligands"
    description = "Compare and rank multiple ligands by docking score"
    category = "analysis"
    
    input_schema = {
        "type": "object",
        "properties": {
            "ligand_ids": {"type": "array", "description": "List of ligand IDs to compare"}
        },
        "required": ["ligand_ids"]
    }
    
    async def execute(self, input_data: CompareLigandsInput) -> ToolOutput:
        return ToolOutput(
            success=True,
            data={
                "ligands": input_data.ligand_ids,
                "note": "Run docking on each ligand then compare scores"
            }
        )
