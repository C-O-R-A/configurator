import os
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_ROOT.parent.parent


def _resolve_path(value: str) -> Path:
    """
    Resolve a configured filesystem path.

    Absolute paths are used as-is.
    Relative paths are resolved relative to the repository root.
    """
    path = Path(value)

    if path.is_absolute():
        return path

    return (REPO_ROOT / path).resolve()


JOINT_LIBRARY = _resolve_path(
    os.environ.get(
        "JOINT_LIBRARY_PATH",
        str(REPO_ROOT / "packages" / "joint_library"),
    )
)


CORA_FRONTEND_DIST = _resolve_path(
    os.environ.get(
        "CORA_FRONTEND_DIST",
        str(REPO_ROOT / "apps" / "frontend" / "dist"),
    )
)


# Useful diagnostics for packaged Electron builds.
print("============================================================")
print("CORA backend configuration")
print("============================================================")
print(f"BACKEND_ROOT       = {BACKEND_ROOT}")
print(f"REPO_ROOT          = {REPO_ROOT}")
print(f"JOINT_LIBRARY      = {JOINT_LIBRARY}")
print(f"JOINT_LIBRARY exists = {JOINT_LIBRARY.exists()}")
print(f"JOINTS directory   = {JOINT_LIBRARY / 'joints'}")
print(
    f"JOINTS exists      = "
    f"{(JOINT_LIBRARY / 'joints').exists()}"
)
print(f"FRONTEND_DIST      = {CORA_FRONTEND_DIST}")
print(f"FRONTEND exists    = {CORA_FRONTEND_DIST.exists()}")
print("============================================================")
