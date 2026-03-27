# 🚀 Quick Start Guide (3 Steps)

## Step 1: Install Docker

**Download:** [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)

| OS | Installation |
|----|-------------|
| Windows | Run installer → Restart computer → Start Docker Desktop |
| Mac | Run installer → Move to Applications → Start Docker Desktop |
| Linux | `sudo apt install docker.io docker-compose` |

**Verify Docker is running:**
```bash
docker --version
docker compose version
```

> If commands fail → Docker Desktop is not running. Open it from your applications.

---

## Step 2: Start Docking Studio

Open terminal in this project folder and run:

**Windows:**
```bat
start.bat
```

**Mac / Linux:**
```bash
chmod +x start.sh
./start.sh
```

> **First time only:** Docker downloads Vina, GNINA, RDKit (~3-5 GB). Takes 5-10 minutes.
> **After first run:** Starts in ~10 seconds.

The script will:
- ✅ Check Docker is running
- ✅ Stop any existing containers
- ✅ Build the application
- ✅ Start all services
- ✅ Wait for backend to be ready
- ✅ Open browser automatically

---

## Step 3: Open in Browser

After the script says **"Docking Studio is ready!"**, go to:

### 🌐 http://localhost:8000

This is your molecular docking workspace.

---

## Quick Reference

| What you want | How to do it |
|--------------|-------------|
| Start | `start.bat` or `./start.sh` |
| Stop | `docker compose down` |
| View logs | `docker compose logs -f backend` |
| Restart fresh | `docker compose down -v && ./start.sh` |
| Update | `git pull && docker compose up -d --build` |

---

## Port Reference

| Port | Service | URL |
|------|---------|-----|
| 8000 | **Docking Studio (Web UI)** | http://localhost:8000 |
| 8000 | API Documentation | http://localhost:8000/docs |
| 11434 | Ollama AI (optional) | http://localhost:11434 |

---

## Troubleshooting

### "Docker is not running"
→ Open Docker Desktop from your applications. Wait 30 seconds.

### "Port 8000 already in use"
```bash
docker compose down
```
Then try starting again.

### "Backend won't start"
```bash
docker compose logs backend --tail=50
```
Look for error messages. Common fix: lower memory limits in `docker-compose.yml`.

### "Browser shows connection error"
Wait 30 more seconds. Backend may still be starting up.

---

## What's Next?

Once running, explore:

1. **Dashboard** — System overview
2. **New Docking** — Upload receptor + ligand, configure grid, run docking
3. **Job Queue** — Monitor running/completed jobs
4. **Results** — View binding scores, interactions, poses
5. **3D Viewer** — Rotate/zoom molecular structures
6. **AI Assistant** — Ask questions about your docking results

---

**Happy Docking! 🧬**
