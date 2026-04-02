# 🚀 Quick Start Guide — BioDockify Studio AI v4.2.0

## Two Ways to Run

| Mode | Best For | Setup Time |
|------|----------|------------|
| **Localhost** (recommended) | Students, quick start, no Docker | 2 minutes |
| **Docker** | Production, multi-user, isolated | 10 minutes |

---

## Option A: Localhost Mode (Recommended for Students)

### Prerequisites
- Python 3.11+ (check: `python --version`)
- Node.js 18+ (check: `node --version`)

### One-Click Start
```bash
# Windows — double-click
start.bat

# macOS/Linux — terminal
chmod +x start.sh && ./start.sh
```

### Manual Start
```bash
# 1. Build frontend (one-time, ~30 seconds)
cd frontend && npx vite build && cd ..

# 2. Install Python dependencies (one-time, ~2 minutes)
pip install -r backend/requirements.txt

# 3. Start the server
python app/launcher.py
```

The server will:
- ✅ Auto-detect a free port (starts at 8000)
- ✅ Open your browser automatically
- ✅ Serve ALL 160+ API routes + React frontend from one process
- ✅ Work offline after first install

### Access Points
- **Main App**: http://127.0.0.1:8000
- **Student Mode**: http://127.0.0.1:8000/student
- **API Docs**: http://127.0.0.1:8000/docs
- **Health Check**: http://127.0.0.1:8000/api/health

---

## Option B: Docker Mode

### Prerequisites
- Docker Desktop installed and running

### Start
```bash
# Windows
start.bat

# macOS/Linux
./start.sh

# Or manually
docker compose up -d --build
```

### Access
- **Main App**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Stop
```bash
docker compose down
```

---

## 🎓 Student Quick Start

1. Visit http://127.0.0.1:8000/student
2. Choose a tutorial (recommended order):
   - **ChemDraw** — draw molecules, learn properties (~15 min)
   - **Docking** — see how drugs bind to proteins (~20 min)
   - **QSAR** — build predictive models (~20 min)
3. Follow guided steps with SmartTooltip explanations (🔬/📖 toggle)
4. Track your XP and progress

### Recommended Learning Path
```
ChemDraw → Docking → Pharmacophore → QSAR → ADMET → MD → AI Assistant
```

---

## 🏫 Classroom Mode

### For Instructors
1. Create assignment: `POST /classroom/assignment/create`
   - Returns a 6-character code (e.g., `A3K9X2`)
2. Share code with students
3. Monitor progress: `GET /classroom/instructor/{your_id}`
4. Export grades as CSV

### For Students
1. Join assignment: `POST /classroom/assignment/join` with the 6-char code
2. Complete the task using any BioDockify feature
3. Submit: `POST /classroom/assignment/submit`
4. Get instant auto-graded feedback

---

## 🌐 Languages

Switch in **Settings → Language** tab. Supported:
- 🇬🇧 English
- 🇪🇸 Español
- 🇨🇳 中文
- 🇸🇦 العربية (RTL)

---

## ♿ Accessibility

**Settings → Accessibility**:
- **High Contrast Mode** — for better visibility
- **Reduced Motion** — minimize animations
- **Font Size** — adjustable 12px to 24px

---

## 📦 All Features

| Category | Features |
|----------|----------|
| **Docking** | Vina/GNINA/RF, composite scoring, flexibility, constraints |
| **ChemDraw** | 2D/3D editor, cleanup, IUPAC, InChI, conformers, export |
| **Pharmacophore** | Feature extraction, hypothesis, exclusion volumes, screening |
| **QSAR** | Descriptors, ML models, Y-scrambling, SHAP, Williams plot |
| **ADMET** | A/D/M/E/T prediction |
| **MD** | OpenMM, equilibration, checkpoint, MM-GBSA |
| **AI** | Multi-provider LLM, model selector, interaction analysis |
| **CrewAI** | 7 agents, validated tools, memory, meta-learning |
| **Active Learning** | Bayesian optimization, compound prioritization |
| **NL-to-DAG** | Natural language workflows, self-healing |
| **Critique Agent** | Chemical validation, uncertainty gating |
| **Knowledge Graph** | Memgraph, target/compound linking |
| **Classroom** | Assignment codes, auto-grading, dashboard |
| **i18n** | 4 languages with RTL support |
| **Accessibility** | High-contrast, reduced motion, font size |

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 8000 busy | Launcher auto-detects next free port |
| Frontend not loading | Run `cd frontend && npx vite build` |
| Python import error | Run `pip install -r backend/requirements.txt` |
| Ollama not connecting | Settings → AI Provider → Test Connection |
| Emoji errors on Windows | Fixed in v4.0.0+ with UTF-8 encoding |
| Docker not running | Start Docker Desktop, wait for green light |

---

**Version**: 4.2.0 | **License**: MIT | **GitHub**: https://github.com/tajo9128/BioDockify-Studio-AI
