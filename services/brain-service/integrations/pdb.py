"""
PDB integration for Nanobot Brain
"""

import httpx
from typing import Any, Dict

from tools import BaseTool, ToolInput, ToolOutput


class FetchProteinInput(ToolInput):
    pdb_id: str
    format: str = "pdb"


class FetchProteinTool(BaseTool):
    name = "fetch_protein"
    description = "Fetch protein structure from PDB by ID"
    category = "integration"
    
    input_schema = {
        "type": "object",
        "properties": {
            "pdb_id": {"type": "string", "description": "PDB ID (e.g., 1ABC)"},
            "format": {"type": "string", "description": "Format: pdb, cif, json"}
        },
        "required": ["pdb_id"]
    }
    
    async def execute(self, input_data: FetchProteinInput) -> ToolOutput:
        try:
            pdb_id = input_data.pdb_id.upper()
            format_type = input_data.format.lower()
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                if format_type == "json":
                    url = f"https://data.rcsb.org/rest/v1/core/entry/{pdb_id}"
                else:
                    url = f"https://files.rcsb.org/download/{pdb_id}.{format_type}"
                
                response = await client.get(url)
                response.raise_for_status()
                
                content_type = response.headers.get("content-type", "")
                
                if "application/json" in content_type or format_type == "json":
                    data = response.json()
                    title = data.get("struct", {}).get("title", "Unknown")
                else:
                    title = f"PDB {pdb_id}"
                
                return ToolOutput(
                    success=True,
                    data={
                        "pdb_id": pdb_id,
                        "format": format_type,
                        "title": title,
                        "content_length": len(response.content)
                    }
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class FetchLigandInput(ToolInput):
    pdb_id: str
    ligand_id: str


class FetchLigandTool(BaseTool):
    name = "fetch_ligand"
    description = "Fetch ligand structure from a PDB entry"
    category = "integration"
    
    input_schema = {
        "type": "object",
        "properties": {
            "pdb_id": {"type": "string", "description": "PDB ID"},
            "ligand_id": {"type": "string", "description": "Ligand ID (e.g., HEM, ATP)"}
        },
        "required": ["pdb_id", "ligand_id"]
    }
    
    async def execute(self, input_data: FetchLigandInput) -> ToolOutput:
        try:
            pdb_id = input_data.pdb_id.upper()
            ligand_id = input_data.ligand_id.upper()
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"https://files.rcsb.org/download/{pdb_id}_ligand_{ligand_id}.cif"
                response = await client.get(url)
                
                if response.status_code == 404:
                    url = f"https://files.rcsb.org/download/{pdb_id}_{ligand_id}.cif"
                    response = await client.get(url)
                
                response.raise_for_status()
                
                return ToolOutput(
                    success=True,
                    data={
                        "pdb_id": pdb_id,
                        "ligand_id": ligand_id,
                        "format": "cif",
                        "content_length": len(response.content)
                    }
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))
