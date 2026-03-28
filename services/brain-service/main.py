"""
Docking Studio v2.0 - Brain Service (Nanobot Agent)
AI-powered planner that orchestrates drug discovery pipelines

BRAIN = PLANNER ONLY, NOT EXECUTOR
Brain -> API -> Redis Queue -> Worker -> Services

Plugin System:
- tools/          -> Core chemistry tools (docking, rdkit, pharmacophore)
- integrations/    -> External DB integrations (PubChem, PDB)
"""

import os
import json
import logging
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from tools import ToolRegistry, register_all_tools

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
API_BACKEND_URL = os.getenv("API_BACKEND_URL", "http://api-backend:8000")

STORAGE_DIR = Path("/app/storage")
UPLOADS_DIR = Path("/app/uploads")
STORAGE_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

registry: Optional[ToolRegistry] = None

app = FastAPI(
    title="Nanobot Brain Service",
    description="AI Agent for Docking Studio - Plans and orchestrates drug discovery pipelines",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    global registry
    logger.info("Initializing Nanobot Brain tool registry...")
    registry = register_all_tools()
    logger.info(f"Registered {len(registry.list_tools())} tools")
    logger.info("Tool categories: " + ", ".join(set(t.category for t in registry._tools.values())))


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    tools_used: List[str]
    plan: Optional[Dict[str, Any]] = None


class PipelineRequest(BaseModel):
    task: str
    target_protein: Optional[str] = None
    ligand_library: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any]


TOOLS = [
    ToolDefinition(
        name="generate_pharmacophore",
        description="Generate a pharmacophore model from a receptor or ligand structure. Use when user wants to identify key interaction features.",
        parameters={
            "type": "object",
            "properties": {
                "receptor_pdb": {"type": "string", "description": "Path to receptor PDB file"},
                "ligand_pdb": {"type": "string", "description": "Optional ligand PDB for reference"},
                "features": {"type": "string", "description": "Comma-separated feature types (HBA,HBD,PI,NI,AR)"}
            },
            "required": ["receptor_pdb"]
        }
    ),
    ToolDefinition(
        name="run_docking",
        description="Run molecular docking between a receptor and ligand. Use for binding affinity prediction.",
        parameters={
            "type": "object",
            "properties": {
                "receptor_pdbqt": {"type": "string", "description": "Path to receptor PDBQT file"},
                "ligand_pdbqt": {"type": "string", "description": "Path to ligand PDBQT file"},
                "exhaustiveness": {"type": "integer", "description": "Docking exhaustiveness (default: 32)"},
                "num_modes": {"type": "integer", "description": "Number of binding modes (default: 10)"}
            },
            "required": ["receptor_pdbqt", "ligand_pdbqt"]
        }
    ),
    ToolDefinition(
        name="screen_library",
        description="Screen a compound library against a pharmacophore or receptor. Use for virtual screening.",
        parameters={
            "type": "object",
            "properties": {
                "receptor_pdbqt": {"type": "string", "description": "Path to receptor PDBQT"},
                "library_path": {"type": "string", "description": "Path to compound library (SDF/mol2)"},
                "pharmacophore_id": {"type": "string", "description": "Optional pharmacophore model ID"}
            },
            "required": ["receptor_pdbqt", "library_path"]
        }
    ),
    ToolDefinition(
        name="convert_molecule",
        description="Convert molecule between formats (SMILES, PDB, SDF, mol2). Use for preparing molecules for docking.",
        parameters={
            "type": "object",
            "properties": {
                "input_path": {"type": "string", "description": "Input file path"},
                "output_format": {"type": "string", "description": "Target format (pdb, sdf, pdbqt)"}
            },
            "required": ["input_path", "output_format"]
        }
    ),
    ToolDefinition(
        name="smiles_to_3d",
        description="Convert SMILES string to 3D structure. Use when user provides a SMILES notation.",
        parameters={
            "type": "object",
            "properties": {
                "smiles": {"type": "string", "description": "SMILES notation"},
                "name": {"type": "string", "description": "Molecule name"}
            },
            "required": ["smiles"]
        }
    ),
    ToolDefinition(
        name="analyze_interactions",
        description="Analyze protein-ligand interactions. Use to understand binding mode.",
        parameters={
            "type": "object",
            "properties": {
                "receptor_pdb": {"type": "string", "description": "Receptor PDB file"},
                "ligand_pdb": {"type": "string", "description": "Ligand PDB file"}
            },
            "required": ["receptor_pdb", "ligand_pdb"]
        }
    ),
    ToolDefinition(
        name="run_full_pipeline",
        description="Run complete virtual screening pipeline: pharmacophore generation -> library screening -> docking -> ranking. Use for comprehensive drug discovery.",
        parameters={
            "type": "object",
            "properties": {
                "target_protein": {"type": "string", "description": "Path to target protein"},
                "ligand_library": {"type": "string", "description": "Path to ligand library"},
                "pharmacophore_params": {"type": "object", "description": "Pharmacophore generation parameters"},
                "docking_params": {"type": "object", "description": "Docking parameters"}
            },
            "required": ["target_protein", "ligand_library"]
        }
    )
]


SYSTEM_PROMPT = """You are Nanobot, an AI agent specialized in drug discovery and molecular docking.

Your role is PLANNER ONLY - you do NOT execute computations directly. Instead, you:
1. Understand user requests about drug discovery
2. Create execution plans using available tools
3. Queue jobs via the API for background execution
4. Report results when jobs complete

Available tools:
- generate_pharmacophore: Create pharmacophore models from receptor/ligand
- run_docking: Perform molecular docking simulations
- screen_library: Virtual screening of compound libraries
- convert_molecule: Format conversion for molecules
- smiles_to_3d: Convert SMILES to 3D structure
- analyze_interactions: Analyze protein-ligand interactions
- run_full_pipeline: Execute complete virtual screening workflow

When user asks for something:
1. Parse the request to understand the goal
2. Select appropriate tools
3. Create a plan with clear steps
4. Execute via API calls (not direct computation)
5. Summarize what will happen

Always be concise and scientific. Focus on the drug discovery workflow.
"""


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "brain-service", "version": "2.0.0"}


@app.get("/")
async def root():
    tool_count = len(registry.list_tools()) if registry else 0
    categories = list(set(t.category for t in registry._tools.values())) if registry else []
    return {
        "service": "Nanobot Brain Service",
        "version": "2.0.0",
        "role": "AI Planner for Drug Discovery",
        "ollama_url": OLLAMA_URL,
        "ollama_model": OLLAMA_MODEL,
        "tools_registered": tool_count,
        "categories": categories
    }


@app.get("/tools")
async def list_tools():
    if registry:
        return {"tools": registry.list_tools()}
    return {"tools": []}


@app.get("/tools/{category}")
async def list_tools_by_category(category: str):
    if registry:
        tools = registry.list_by_category(category)
        return {"category": category, "tools": [t.to_definition() for t in tools]}
    return {"category": category, "tools": []}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint - Nanobot interprets user requests and creates execution plans"""
    conversation_id = request.conversation_id or str(uuid.uuid4())
    
    logger.info(f"Chat request: {request.message[:100]}... (conv: {conversation_id})")
    
    try:
        ollama_response = await call_ollama(request.message, conversation_id)
        
        if ollama_response.get("tool_calls"):
            tools_used = [tc["name"] for tc in ollama_response["tool_calls"]]
            plan = await execute_plan(ollama_response["tool_calls"])
            
            return ChatResponse(
                response=ollama_response.get("response", "Executing your request..."),
                conversation_id=conversation_id,
                tools_used=tools_used,
                plan=plan
            )
        else:
            return ChatResponse(
                response=ollama_response.get("response", "I understand. How can I help with your drug discovery project?"),
                conversation_id=conversation_id,
                tools_used=[],
                plan=None
            )
            
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return ChatResponse(
            response=f"I encountered an error processing your request: {str(e)}",
            conversation_id=conversation_id,
            tools_used=[],
            plan=None
        )


@app.post("/pipeline", response_model=Dict[str, Any])
async def run_pipeline(request: PipelineRequest):
    """Execute a full drug discovery pipeline"""
    job_id = str(uuid.uuid4())
    
    logger.info(f"Starting pipeline: {request.task} (job: {job_id})")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        if request.task == "virtual_screening":
            plan = {
                "steps": [
                    {"name": "generate_pharmacophore", "params": {"receptor_pdb": request.target_protein}},
                    {"name": "screen_library", "params": {"library_path": request.ligand_library}},
                    {"name": "rank_results", "params": {}}
                ]
            }
            
            response = await client.post(
                f"{API_BACKEND_URL}/jobs",
                json={
                    "name": f"Virtual Screening {job_id[:8]}",
                    "job_type": "pipeline",
                    "parameters": {
                        "pipeline": "virtual_screening",
                        "target_protein": request.target_protein,
                        "ligand_library": request.ligand_library,
                        **(request.parameters or {})
                    }
                }
            )
            response.raise_for_status()
            
            return {
                "job_id": job_id,
                "status": "queued",
                "plan": plan,
                "message": "Virtual screening pipeline queued"
            }
            
        elif request.task == "pharmacophore_screening":
            plan = {
                "steps": [
                    {"name": "generate_pharmacophore", "params": {"receptor_pdb": request.target_protein}},
                    {"name": "screen_library", "params": {"library_path": request.ligand_library}},
                    {"name": "rank_by_pharmacophore", "params": {}}
                ]
            }
            
            response = await client.post(
                f"{API_BACKEND_URL}/jobs",
                json={
                    "name": f"Pharmacophore Screening {job_id[:8]}",
                    "job_type": "pharmacophore",
                    "parameters": {
                        "receptor_pdb": request.target_protein,
                        "library_path": request.ligand_library,
                        **(request.parameters or {})
                    }
                }
            )
            response.raise_for_status()
            
            return {
                "job_id": job_id,
                "status": "queued",
                "plan": plan,
                "message": "Pharmacophore screening pipeline queued"
            }
            
        else:
            raise HTTPException(status_code=400, detail=f"Unknown pipeline task: {request.task}")


@app.post("/converse")
async def converse(messages: List[ChatMessage]):
    """Multi-turn conversation with Nanobot"""
    conversation_id = str(uuid.uuid4())
    
    full_context = "\n".join([f"{m.role}: {m.content}" for m in messages])
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{OLLAMA_URL}/api/generate",
                    json={
                        "model": OLLAMA_MODEL,
                        "prompt": f"{SYSTEM_PROMPT}\n\nConversation:\n{full_context}",
                        "stream": False
                    }
                )
                response.raise_for_status()
                result = response.json()
                
                return {
                    "response": result.get("response", "I'm thinking..."),
                    "conversation_id": conversation_id
                }
            except httpx.HTTPError as e:
                logger.warning(f"Ollama not available: {e}")
                return {
                    "response": "I'm ready to help with your drug discovery tasks. You can ask me to:\n- Generate pharmacophores\n- Run molecular docking\n- Screen compound libraries\n- Analyze protein-ligand interactions\n- Run full virtual screening pipelines",
                    "conversation_id": conversation_id,
                    "ollama_available": False
                }
                
    except Exception as e:
        logger.error(f"Converse error: {e}")
        return {
            "response": f"I encountered an issue: {str(e)}",
            "conversation_id": conversation_id
        }


async def call_ollama(prompt: str, conversation_id: str) -> Dict[str, Any]:
    """Call Ollama for AI interpretation"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": f"{SYSTEM_PROMPT}\n\nUser: {prompt}",
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "num_predict": 512
                    }
                }
            )
            response.raise_for_status()
            result = response.json()
            
            response_text = result.get("response", "")
            
            tool_calls = parse_tool_calls(response_text)
            
            return {
                "response": response_text,
                "tool_calls": tool_calls
            }
        except httpx.HTTPError as e:
            logger.warning(f"Ollama unavailable: {e}")
            return {
                "response": "I'm ready to help with drug discovery. Available commands:\n- 'dock ligand X with receptor Y'\n- 'generate pharmacophore from receptor'\n- 'screen my library against the target'\n- 'run full virtual screening pipeline'",
                "tool_calls": []
            }


def parse_tool_calls(response: str) -> List[Dict[str, Any]]:
    """Parse tool calls from Ollama response"""
    tool_calls = []
    
    lines = response.split("\n")
    current_tool = None
    current_params = {}
    
    for line in lines:
        line = line.strip()
        
        if line.startswith("TOOL:"):
            if current_tool:
                tool_calls.append({"name": current_tool, "parameters": current_params})
            current_tool = line.replace("TOOL:", "").strip()
            current_params = {}
        elif line.startswith("PARAM:") and current_tool:
            param_line = line.replace("PARAM:", "").strip()
            if ":" in param_line:
                key, value = param_line.split(":", 1)
                current_params[key.strip()] = value.strip()
    
    if current_tool:
        tool_calls.append({"name": current_tool, "parameters": current_params})
    
    return tool_calls


async def execute_plan(tool_calls: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Execute a plan by queuing jobs via API"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        results = []
        
        for tool_call in tool_calls:
            tool_name = tool_call["name"]
            params = tool_call.get("parameters", {})
            
            job_id = str(uuid.uuid4())
            
            if tool_name == "generate_pharmacophore":
                response = await client.post(
                    f"{API_BACKEND_URL}/jobs",
                    json={
                        "name": f"Pharmacophore {job_id[:8]}",
                        "job_type": "pharmacophore",
                        "parameters": params
                    }
                )
            elif tool_name == "run_docking":
                response = await client.post(
                    f"{API_BACKEND_URL}/jobs",
                    json={
                        "name": f"Docking {job_id[:8]}",
                        "job_type": "docking",
                        "parameters": params
                    }
                )
            elif tool_name == "smiles_to_3d":
                response = await client.post(
                    f"{API_BACKEND_URL}/rdkit/smiles-to-3d",
                    json=params
                )
            elif tool_name == "screen_library":
                response = await client.post(
                    f"{API_BACKEND_URL}/jobs",
                    json={
                        "name": f"Library Screen {job_id[:8]}",
                        "job_type": "pharmacophore",
                        "parameters": params
                    }
                )
            else:
                response = await client.post(
                    f"{API_BACKEND_URL}/jobs",
                    json={
                        "name": f"Task {job_id[:8]}",
                        "job_type": "rdkit",
                        "parameters": params
                    }
                )
            
            results.append({
                "tool": tool_name,
                "job_id": job_id,
                "status": "queued" if response.status_code == 200 else f"error: {response.status_code}"
            })
        
        return {
            "steps": results,
            "total_steps": len(results)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
