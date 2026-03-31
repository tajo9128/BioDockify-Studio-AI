# Biodockify Studio AI

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.3.3-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/Python-3.11-green.svg" alt="Python">
  <img src="https://img.shields.io/badge/License-MIT-purple.svg" alt="License">
</p>

> **AI-Powered Autonomous Drug Discovery Platform** — runs at `http://localhost:8000`

An intelligent molecular docking platform with Discovery Studio-inspired UI, AI-powered molecule optimization, and automated drug discovery workflows.

## Features

### 🧬 ChemDraw - Molecule Editor
- Draw and analyze molecules with real-time 2D/3D visualization
- SMILES input with structure validation
- 12 pre-loaded FDA-approved drugs

### 🤖 AI Optimization
- AI-powered molecular modification
- Bioisosteric replacement
- Halogen, OH, NH2 group addition
- Aromatic ring expansion
- Flexibility reduction

### 🔬 Drug-like Analysis
- Lipinski Rule of 5 compliance
- MW, LogP, HBD, HBA calculations
- TPSA (Topological Polar Surface Area)
- Rotatable bonds analysis

### 🧪 Docking
- AutoDock Vina integration
- SMILES to PDB preparation
- Real-time job tracking

### 📊 Molecular Dynamics
- OpenMM simulation engine
- GPU acceleration (CUDA/OpenCL)
- Automatic platform detection

### 🖥️ 3D Viewer
- NGL Viewer integration
- Ball-and-stick visualization
- Interactive rotation & zoom

### 💬 AI Assistant
- Multi-provider support (OpenAI, Claude, Gemini, DeepSeek, etc.)
- Drug discovery insights
- Molecule analysis suggestions

## Quick Start

```bash
# Pull and run (once built)
docker pull tajo9128/biodockify:latest
docker run -p 8000:8000 tajo9128/biodockify:latest

# Or build locally
git clone https://github.com/tajo9128/Docking-studio.git
cd Docking-studio
docker build -f Dockerfile.single -t biodockify .
docker run -p 8000:8000 biodockify
```

Then open **http://localhost:8000** in your browser.

## AI Providers

Configure API keys in Settings:

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4o-mini |
| Claude | Claude-3-Opus, Claude-3-Sonnet |
| Gemini | Gemini Pro |
| Mistral | Mistral Large, Mistral Medium |
| DeepSeek | DeepSeek Chat |
| Qwen | Qwen Turbo, Qwen Plus |
| SiliconFlow | Qwen, Llama models |
| OpenRouter | Multiple providers |
| Ollama | Local models |

## Molecule Library

Pre-loaded with 12 FDA-approved drugs:

| Drug | SMILES | Use |
|------|--------|-----|
| Aspirin | CC(=O)Oc1ccccc1C(=O)O | Anti-inflammatory |
| Caffeine | Cn1cnc2c1c(=O)n(c(=O)n2C)C | Stimulant |
| Glucose | OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O | Energy metabolism |
| Ibuprofen | CC(C)Cc1ccc(cc1)C(C)C(=O)O | Analgesic |
| Morphine | CN1CCc2c(O)ccc(c2C1)C(O)=O | Analgesic |
| Metformin | CN(C)N=C(N)N | Diabetes |
| Warfarin | CC(=O)OC(Cc1c(O)c2ccccc2oc1=O)C(c1ccccc1)=O | Anticoagulant |
| Sildenafil | CCCC1=C2N(C(=O)N1CCC)CCCC2c3ccc(cc3)S(=O)(=O)N | PDE5 inhibitor |

## Drug-like Properties

| Property | Rule | Description |
|----------|------|-------------|
| MW | < 500 Da | Molecular weight |
| LogP | < 5 | Lipophilicity |
| HBD | ≤ 5 | Hydrogen bond donors |
| HBA | ≤ 10 | Hydrogen bond acceptors |
| TPSA | < 140 Å² | Topological polar surface area |
| Rotatable | ≤ 10 | Flexible bonds |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Biodockify Studio AI                 │
├─────────────────────────────────────────────────────┤
│  Frontend (SPA)                                     │
│  ├── ChemDraw Panel                                 │
│  ├── 3D Viewer (NGL)                              │
│  ├── Properties & AI Suggestions                    │
│  └── Job Management                                 │
├─────────────────────────────────────────────────────┤
│  Backend (FastAPI)                                  │
│  ├── /api/chem/properties    (RDKit)               │
│  ├── /api/chem/suggestions  (AI Analysis)        │
│  ├── /api/chem/dock         (Docking)            │
│  ├── /api/chem/3d/{id}      (3D Structure)      │
│  └── /api/ai/*              (AI Chat)             │
├─────────────────────────────────────────────────────┤
│  Container (Python 3.11 + RDKit + OpenMM)         │
└─────────────────────────────────────────────────────┘
```

## Docker Images

| Image | Description |
|-------|-------------|
| `tajo9128/biodockify:latest` | Latest release |
| `tajo9128/biodockify:v2.3.3` | Versioned release |

## Development

```bash
# Local development
cd backend
pip install -r requirements.txt
python app.py

# Frontend (if separate)
cd frontend
npm install
npm run dev
```

## License

MIT License - See LICENSE file for details.

---

<p align="center">
  <strong>Biodockify Studio AI</strong><br>
  AI-Powered Autonomous Drug Discovery Platform
</p>
