# routers/joints.py
import os
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from models.schemas import JointManifest
from config import JOINT_LIBRARY as LIBRARY_PATH
router = APIRouter(tags=["joints"])


def load_all_manifests() -> list[dict]:
    manifests = []
    joints_dir = LIBRARY_PATH / "joints"
    if not joints_dir.exists():
        print(f"joints_dir does not exist: {joints_dir}")
        return []

    for joint_dir in sorted(joints_dir.iterdir()):
        if not joint_dir.is_dir():
            continue
        for filename in ["manifest.json", "manifest.yaml", "manifest.yml"]:
            manifest_file = joint_dir / filename
            if manifest_file.exists():
                try:
                    with open(manifest_file) as f:
                        if filename.endswith(".json"):
                            data = json.load(f)
                        else:
                            import yaml
                            data = yaml.safe_load(f)
                    manifests.append(data)
                    print(f"✓ Loaded {manifest_file}")
                    break
                except Exception as e:
                    print(f"⚠ Failed to load {manifest_file}: {e}")

    print(f"Total manifests loaded: {len(manifests)}")
    return manifests


@router.get("/joints", response_model=list[JointManifest])
def list_joints():
    return load_all_manifests()


@router.get("/joints/{joint_id}", response_model=JointManifest)
def get_joint(joint_id: str):
    for m in load_all_manifests():
        if m.get("id") == joint_id:
            return m
    raise HTTPException(status_code=404, detail=f"Joint '{joint_id}' not found")