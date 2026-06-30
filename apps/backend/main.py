from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routers import joints, export

app = FastAPI(title="Cobot Configurator API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(joints.router, prefix="/api")
app.include_router(export.router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok"}

JOINT_LIBRARY = Path(__file__).parent.parent.parent / "packages" / "joint-library"

if JOINT_LIBRARY.exists():
    app.mount("/joint-library", StaticFiles(directory=JOINT_LIBRARY), name="joint-library")

# Serve built frontend
DIST = Path(__file__).parent.parent / "frontend" / "dist"

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/")
    def serve_root():
        return FileResponse(DIST / "index.html")

    @app.get("/{path:path}")
    def serve_spa(path: str):
        file = DIST / path
        if file.exists() and file.is_file():
            return FileResponse(file)
        return FileResponse(DIST / "index.html")