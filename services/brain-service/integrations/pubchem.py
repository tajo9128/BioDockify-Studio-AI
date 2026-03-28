"""
External database integrations for Nanobot Brain
PubChem, PDB, ChEMBL APIs
"""

import httpx
from typing import Any, Dict, List

from tools import BaseTool, ToolInput, ToolOutput


class FetchCompoundsInput(ToolInput):
    compound_ids: List[str]


class FetchCompoundsTool(BaseTool):
    name = "fetch_compounds"
    description = "Fetch compound information from PubChem by CID"
    category = "integration"
    
    input_schema = {
        "type": "object",
        "properties": {
            "compound_ids": {"type": "array", "description": "List of PubChem CIDs"}
        },
        "required": ["compound_ids"]
    }
    
    async def execute(self, input_data: FetchCompoundsInput) -> ToolOutput:
        try:
            results = []
            async with httpx.AsyncClient(timeout=30.0) as client:
                for cid in input_data.compound_ids[:10]:
                    response = await client.get(
                        f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/property/IsomericSMILES,MolecularFormula,MolecularWeight/JSON"
                    )
                    if response.status_code == 200:
                        data = response.json()
                        props = data.get("PropertyTable", {}).get("Properties", [{}])[0]
                        results.append({
                            "cid": cid,
                            "smiles": props.get("IsomericSMILES"),
                            "formula": props.get("MolecularFormula"),
                            "weight": props.get("MolecularWeight")
                        })
            
            return ToolOutput(
                success=True,
                data={"compounds": results, "count": len(results)}
            )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class SearchCompoundsInput(ToolInput):
    query: str
    max_results: int = 20


class SearchCompoundsTool(BaseTool):
    name = "search_compounds"
    description = "Search PubChem for compounds by name or formula"
    category = "integration"
    
    input_schema = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Search query (compound name or formula)"},
            "max_results": {"type": "integer", "description": "Maximum results to return"}
        },
        "required": ["query"]
    }
    
    async def execute(self, input_data: SearchCompoundsInput) -> ToolOutput:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{input_data.query}/property/IsomericSMILES,MolecularFormula,MolecularWeight/JSON",
                    params={"MaxRecords": input_data.max_results}
                )
                response.raise_for_status()
                data = response.json()
                
                props = data.get("PropertyTable", {}).get("Properties", [])
                
                results = [
                    {
                        "cid": p.get("CID"),
                        "name": input_data.query,
                        "smiles": p.get("IsomericSMILES"),
                        "formula": p.get("MolecularFormula"),
                        "weight": p.get("MolecularWeight")
                    }
                    for p in props
                ]
                
                return ToolOutput(
                    success=True,
                    data={"compounds": results, "count": len(results)}
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class SimilaritySearchInput(ToolInput):
    smiles: str
    similarity: float = 0.9


class SimilaritySearchTool(BaseTool):
    name = "similarity_search"
    description = "Search PubChem for similar compounds using SMILES"
    category = "integration"
    
    input_schema = {
        "type": "object",
        "properties": {
            "smiles": {"type": "string", "description": "Reference SMILES"},
            "similarity": {"type": "number", "description": "Minimum Tanimoto similarity (0-1)"}
        },
        "required": ["smiles"]
    }
    
    async def execute(self, input_data: SimilaritySearchInput) -> ToolOutput:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/similarity/smiles/JSON",
                    params={"threshold": int(input_data.similarity * 100)}
                )
                response.raise_for_status()
                data = response.json()
                
                cids = data.get("IdentifierList", {}).get("CID", [])
                
                return ToolOutput(
                    success=True,
                    data={"cids": cids[:50], "count": len(cids)}
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))
