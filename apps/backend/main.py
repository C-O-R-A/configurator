from pathlib import Path
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import CORA_FRONTEND_DIST, JOINT_LIBRARY
from routers import joints, export


app = FastAPI(
    title="Cobot Configurator API",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    joints.router,
    prefix="/api",
)

app.include_router(
    export.router,
    prefix="/api",
)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "joint_library": str(JOINT_LIBRARY),
        "joint_library_exists": JOINT_LIBRARY.exists(),
        "joints_exists": (
            JOINT_LIBRARY / "joints"
        ).exists(),
        "frontend_dist": str(CORA_FRONTEND_DIST),
        "frontend_dist_exists": CORA_FRONTEND_DIST.exists(),
    }


# Serve joint-library assets.
if JOINT_LIBRARY.exists():
    print(
        f"Mounting joint library at /joint_library: "
        f"{JOINT_LIBRARY}"
    )

    app.mount(
        "/joint_library",
        StaticFiles(directory=str(JOINT_LIBRARY)),
        name="joint_library",
    )
else:
    print(
        f"WARNING: Joint library does not exist: "
        f"{JOINT_LIBRARY}"
    )


# Serve built frontend.
if CORA_FRONTEND_DIST.exists():
    assets_dir = CORA_FRONTEND_DIST / "assets"

    if assets_dir.exists():
        app.mount(
            "/assets",
            StaticFiles(directory=str(assets_dir)),
            name="assets",
        )

    @app.get("/")
    def serve_root():
        index_file = CORA_FRONTEND_DIST / "index.html"

        if not index_file.exists():
            return {
                "error": "Frontend index.html not found",
                "frontend_dist": str(CORA_FRONTEND_DIST),
            }

        return FileResponse(index_file)

    @app.get("/{path:path}")
    def serve_spa(path: str):
        file = CORA_FRONTEND_DIST / path

        if file.exists() and file.is_file():
            return FileResponse(file)

        return FileResponse(
            CORA_FRONTEND_DIST / "index.html"
        )

else:
    print(
        f"WARNING: Frontend distribution does not exist: "
        f"{CORA_FRONTEND_DIST}"
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
    )
