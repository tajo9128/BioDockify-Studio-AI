"""
Docking Studio v2.0 - Enhanced Brain Service
Simplified nanobot-inspired architecture for drug discovery

Key features from nanobot:
- Tool registry with JSON schema validation
- Streaming support
- Conversation memory
- Multi-model support (OpenAI, Anthropic, Ollama)
"""

import os
import json
import logging
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any, Callable
from abc import ABC, abstractmethod

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_BACKEND_URL = os.getenv("API_BACKEND_URL", "http://api-backend:8000")
BRAIN_SERVICE_URL = os.getenv("BRAIN_SERVICE_URL", "http://brain-service:8000")

STORAGE_DIR = Path("/app/storage")
UPLOADS_DIR = Path("/app/uploads")
STORAGE_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="Nanobot Brain Service",
    description="AI Agent for Docking Studio with drug discovery tools",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BaseTool(ABC):
    """Base class for tools (simplified from nanobot)"""

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        pass

    @property
    @abstractmethod
    def parameters(self) -> dict:
        pass

    @abstractmethod
    async def execute(self, **kwargs) -> Any:
        pass

    def to_schema(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


class ToolRegistry:
    """Simple tool registry with validation"""

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}

    def register(self, tool: BaseTool) -> None:
        self._tools[tool.name] = tool
        logger.info(f"Registered tool: {tool.name}")

    def get(self, name: str) -> Optional[BaseTool]:
        return self._tools.get(name)

    def list_tools(self) -> List[Dict]:
        return [tool.to_schema()["function"] for tool in self._tools.values()]

    async def execute(self, name: str, params: dict) -> Any:
        tool = self.get(name)
        if not tool:
            return f"Error: Tool '{name}' not found"
        try:
            return await tool.execute(**params)
        except Exception as e:
            return f"Error: {str(e)}"


class ConversationMemory:
    """Simple conversation memory"""

    def __init__(self, max_turns: int = 20):
        self.max_turns = max_turns
        self._conversations: Dict[str, List[Dict]] = {}

    def add(
        self,
        conversation_id: str,
        role: str,
        content: str,
        tools_used: List[str] = None,
    ) -> None:
        if conversation_id not in self._conversations:
            self._conversations[conversation_id] = []

        entry = {"role": role, "content": content}
        if tools_used:
            entry["tools_used"] = tools_used

        self._conversations[conversation_id].append(entry)

        if len(self._conversations[conversation_id]) > self.max_turns:
            self._conversations[conversation_id] = self._conversations[conversation_id][
                -self.max_turns :
            ]

    def get_history(self, conversation_id: str, max_turns: int = 0) -> List[Dict]:
        history = self._conversations.get(conversation_id, [])
        if max_turns > 0:
            return history[-max_turns:]
        return history

    def clear(self, conversation_id: str) -> None:
        if conversation_id in self._conversations:
            del self._conversations[conversation_id]


class LLMProvider(ABC):
    """Abstract LLM provider"""

    @abstractmethod
    async def chat(self, messages: List[dict], tools: List[dict] = None) -> dict:
        pass

    @abstractmethod
    async def chat_stream(self, messages: List[dict], tools: List[dict] = None):
        pass


class OpenAIProvider(LLMProvider):
    """OpenAI-compatible provider (works with Ollama too)"""

    def __init__(self, api_key: str, base_url: str, model: str):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.client = None

    async def chat(self, messages: List[dict], tools: List[dict] = None) -> dict:
        if not self.client:
            import httpx

            self.client = httpx.AsyncClient(timeout=120.0)

        payload = {"model": self.model, "messages": messages, "stream": False}
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        response = await self.client.post(
            f"{self.base_url}/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {self.api_key}"},
        )
        response.raise_for_status()
        return response.json()

    async def chat_stream(self, messages: List[dict], tools: List[dict] = None):
        if not self.client:
            import httpx

            self.client = httpx.AsyncClient(timeout=120.0)

        payload = {"model": self.model, "messages": messages, "stream": True}
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        async with self.client.stream(
            "POST",
            f"{self.base_url}/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {self.api_key}"},
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data != "[DONE]":
                        yield json.loads(data)


class AnthropicProvider(LLMProvider):
    """Anthropic Claude provider"""

    def __init__(self, api_key: str, model: str = "claude-3-sonnet-20240229"):
        self.api_key = api_key
        self.model = model
        self.client = None

    async def chat(self, messages: List[dict], tools: List[dict] = None) -> dict:
        if not self.client:
            import httpx

            self.client = httpx.AsyncClient(timeout=120.0)

        payload = {"model": self.model, "messages": messages, "max_tokens": 4096}
        if tools:
            payload["tools"] = tools

        response = await self.client.post(
            "https://api.anthropic.com/v1/messages",
            json=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
            },
        )
        response.raise_for_status()
        return response.json()

    async def chat_stream(self, messages: List[dict], tools: List[dict] = None):
        raise NotImplementedError("Streaming not implemented for Anthropic")


registry = ToolRegistry()
memory = ConversationMemory()


async def get_llm_settings() -> dict:
    """Fetch LLM settings from api-backend"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{API_BACKEND_URL}/llm/settings")
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch LLM settings: {e}")
        return {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "api_key": "",
            "base_url": "https://api.openai.com/v1",
            "temperature": 0.7,
            "max_tokens": 4096,
        }


async def get_provider() -> LLMProvider:
    settings = await get_llm_settings()
    api_key = settings.get("api_key", "")
    base_url = settings.get("base_url", "https://api.openai.com/v1")
    model = settings.get("model", "gpt-4o-mini")

    provider_type = settings.get("provider", "openai")

    if provider_type == "anthropic":
        return AnthropicProvider(api_key, model)
    else:
        return OpenAIProvider(api_key, base_url, model)


def create_system_prompt() -> str:
    return """You are Nanobot, an expert AI assistant specialized in drug discovery and molecular modeling.

You have access to these tools:
- dock_ligand: Run molecular docking with AutoDock Vina
- run_batch_docking: Batch dock multiple ligands
- smiles_to_3d: Convert SMILES to 3D structure
- convert_format: Convert molecule file formats
- optimize_molecule: Optimize 3D geometry
- generate_pharmacophore: Create pharmacophore from receptor/ligand
- screen_library: Screen compounds against pharmacophore
- fetch_protein: Fetch protein from PDB
- fetch_compounds: Fetch compounds from PubChem
- search_compounds: Search PubChem by name
- similarity_search: Find similar compounds
- analyze_interactions: Analyze protein-ligand interactions
- predict_binding: Predict binding affinity

When user asks about drug discovery:
1. Understand the goal
2. Select appropriate tools
3. Execute in logical order
4. Explain results

Be concise and scientific. Focus on helping with:
- Virtual screening
- Lead optimization
- Binding analysis
- ADMET prediction
"""


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    stream: bool = False


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    tools_used: List[str]
    model: str
    provider: str = "openai"
    available: bool = True


@app.on_event("startup")
async def startup():
    from tools import register_all_tools

    tools = register_all_tools()

    for tool_def in tools.list_tools():
        logger.info(f"Tool available: {tool_def['name']}")

    logger.info(f"Brain service started with {len(tools.list_tools())} tools")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "brain-service", "version": "2.0.0"}


@app.get("/")
async def root():
    settings = await get_llm_settings()
    return {
        "service": "Nanobot Brain Service",
        "version": "2.0.0",
        "model": settings.get("model", "unknown"),
        "provider": settings.get("provider", "unknown"),
        "tools": len(registry.list_tools()),
    }


@app.get("/tools")
async def list_tools():
    return {"tools": registry.list_tools()}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    conv_id = request.conversation_id or str(uuid.uuid4())

    memory.add(conv_id, "user", request.message)
    history = memory.get_history(conv_id)

    messages = [{"role": "system", "content": create_system_prompt()}]
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})

    tools = registry.list_tools()
    p = await get_provider()

    try:
        response = await p.chat(messages, tools)

        if "choices" in response:
            choice = response["choices"][0]
            assistant_message = choice["message"]

            if "tool_calls" in assistant_message:
                tool_calls = assistant_message["tool_calls"]
                memory.add(
                    conv_id,
                    "assistant",
                    assistant_message.get("content", "") or "Using tools...",
                )

                tool_results = []
                tools_used = []

                for tc in tool_calls:
                    func = tc["function"]
                    tool_name = func["name"]
                    args = (
                        json.loads(func["arguments"])
                        if isinstance(func["arguments"], str)
                        else func["arguments"]
                    )

                    tools_used.append(tool_name)
                    result = await registry.execute(tool_name, args)
                    tool_results.append(
                        {"tool_call_id": tc["id"], "name": tool_name, "result": result}
                    )

                messages.append(assistant_message)
                for tr in tool_results:
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tr["tool_call_id"],
                            "name": tr["name"],
                            "content": str(tr["result"]),
                        }
                    )

                follow_up = await p.chat(messages, tools)
                if "choices" in follow_up:
                    final_content = follow_up["choices"][0]["message"]["content"]
                else:
                    final_content = follow_up.get("content", "Done")
            else:
                final_content = assistant_message.get("content", "I'm ready to help!")
        else:
            final_content = response.get("content", "I'm ready to help!")

        memory.add(
            conv_id,
            "assistant",
            final_content,
            tools_used if "tools_used" in dir() else [],
        )

        settings = await get_llm_settings()
        return ChatResponse(
            response=final_content or "Completed",
            conversation_id=conv_id,
            tools_used=tools_used if "tools_used" in dir() else [],
            model=settings.get("model", "unknown"),
            provider=settings.get("provider", "openai"),
            available=True,
        )

    except Exception as e:
        logger.error(f"Chat error: {e}")
        return ChatResponse(
            response=f"I encountered an error: {str(e)}",
            conversation_id=conv_id,
            tools_used=[],
            model="error",
            provider="error",
            available=False,
        )


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint"""
    conv_id = request.conversation_id or str(uuid.uuid4())

    memory.add(conv_id, "user", request.message)
    history = memory.get_history(conv_id)

    messages = [{"role": "system", "content": create_system_prompt()}]
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})

    p = await get_provider()

    async def generate():
        try:
            async for chunk in p.chat_stream(messages, registry.list_tools()):
                if "choices" in chunk:
                    delta = chunk["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield f"data: {json.dumps({'content': delta['content']})}\n\n"
                elif "content_block" in chunk:
                    delta = chunk.get("content_block", {})
                    if "text" in delta:
                        yield f"data: {json.dumps({'content': delta['text']})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/chat/status")
async def chat_status():
    """Get chat service status"""
    settings = await get_llm_settings()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{settings['base_url']}/models",
                headers={"Authorization": f"Bearer {settings['api_key']}"},
            )
            models = [m.get("id") for m in response.json().get("data", [])[:10]]
            available = True
    except Exception:
        models = []
        available = False

    return {
        "provider": settings.get("provider", "openai"),
        "ollama_available": available,
        "models": [{"name": m} for m in models],
    }


@app.get("/memory/{conversation_id}")
async def get_memory(conversation_id: str):
    return {"history": memory.get_history(conversation_id)}


@app.delete("/memory/{conversation_id}")
async def clear_memory(conversation_id: str):
    memory.clear(conversation_id)
    return {"status": "cleared"}


@app.post("/pipeline")
async def run_pipeline(task: str, target: str = None, library: str = None):
    """Run a predefined pipeline"""
    job_id = str(uuid.uuid4())

    if task == "virtual_screening":
        plan = {
            "steps": [
                {"tool": "fetch_protein", "params": {"pdb_id": target}},
                {"tool": "generate_pharmacophore", "params": {}},
                {"tool": "screen_library", "params": {"library_path": library}},
                {"tool": "dock_ligand", "params": {}},
            ]
        }
    else:
        plan = {"error": f"Unknown pipeline: {task}"}

    return {"job_id": job_id, "plan": plan}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
