import os
from pathlib import Path

BACKEND_ROOT = Path(__file__).parent
REPO_ROOT    = BACKEND_ROOT.parent.parent

JOINT_LIBRARY = Path(os.environ.get(
    "JOINT_LIBRARY_PATH",
    str(REPO_ROOT / "packages" / "joint_library"),
))