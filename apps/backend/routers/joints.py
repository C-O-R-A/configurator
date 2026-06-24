import os
import json
import yaml
from pathlib import Path
from fastapi import APIRouter, HTTPException
from models.schemas import JointManifest

router = APIRouter(tags=["joints"])

LIBRARY_PATH = Path(
    os.environ.get("JOINT_LIBRARY_PATH", "../../packages/joint-library")
)


def load_all_manifests() -> list[dict]:
    manifests = []
    joints_dir = LIBRARY_PATH / "joints"
    if not joints_dir.exists():
        return []

    for joint_dir in sorted(joints_dir.iterdir()):
        if not joint_dir.is_dir():
            continue
        # Try JSON first, then YAML
        for filename in ["manifest.json", "manifest.yaml", "manifest.yml"]:
            manifest_file = joint_dir / filename
            if manifest_file.exists():
                try:
                    with open(manifest_file) as f:
                        if filename.endswith(".json"):
                            data = json.load(f)
                        else:
                            data = yaml.safe_load(f)
                    manifests.append(data)
                    break
                except Exception as e:
                    print(f"⚠ Failed to load {manifest_file}: {e}")

    return manifests


@router.get("/joints", response_model=list[JointManifest])
def list_joints():
    """Return all joint manifests from the library."""
    return load_all_manifests()


@router.get("/joints/{joint_id}", response_model=JointManifest)
def get_joint(joint_id: str):
    """Return a single joint manifest by ID."""
    for m in load_all_manifests():
        if m.get("id") == joint_id:
            return m
    raise HTTPException(status_code=404, detail=f"Joint '{joint_id}' not found")
