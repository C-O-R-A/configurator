import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from config import JOINT_LIBRARY
from models.schemas import JointManifest


router = APIRouter(tags=["joints"])


def load_all_manifests() -> list[JointManifest]:
    """
    Load and validate every joint manifest.

    Validation happens here rather than relying on FastAPI response
    validation. This means a malformed manifest produces a useful
    error identifying the exact file.
    """

    manifests: list[JointManifest] = []

    joints_dir = JOINT_LIBRARY / "joints"

    print("============================================================")
    print("Loading CORA joint library")
    print(f"JOINT_LIBRARY: {JOINT_LIBRARY}")
    print(f"Joints directory: {joints_dir}")
    print(f"Library exists: {JOINT_LIBRARY.exists()}")
    print(f"Joints directory exists: {joints_dir.exists()}")
    print("============================================================")

    if not JOINT_LIBRARY.exists():
        raise RuntimeError(
            f"Joint library does not exist: {JOINT_LIBRARY}"
        )

    if not joints_dir.exists():
        raise RuntimeError(
            f"Joints directory does not exist: {joints_dir}"
        )

    if not joints_dir.is_dir():
        raise RuntimeError(
            f"Joints path is not a directory: {joints_dir}"
        )

    try:
        joint_directories = sorted(
            path
            for path in joints_dir.iterdir()
            if path.is_dir()
        )
    except Exception as exc:
        raise RuntimeError(
            f"Could not enumerate joint library: {exc}"
        ) from exc

    print(
        f"Found {len(joint_directories)} joint directories"
    )

    for joint_dir in joint_directories:
        manifest_file: Path | None = None

        for filename in (
            "manifest.json",
            "manifest.yaml",
            "manifest.yml",
        ):
            candidate = joint_dir / filename

            if candidate.exists():
                manifest_file = candidate
                break

        if manifest_file is None:
            print(
                f"WARNING: No manifest found in {joint_dir}"
            )
            continue

        print(f"Loading manifest: {manifest_file}")

        try:
            with manifest_file.open(
                "r",
                encoding="utf-8",
            ) as f:
                if manifest_file.suffix.lower() == ".json":
                    data = json.load(f)
                else:
                    import yaml

                    data = yaml.safe_load(f)

        except Exception as exc:
            raise RuntimeError(
                f"Failed to parse manifest "
                f"{manifest_file}: {exc}"
            ) from exc

        if not isinstance(data, dict):
            raise RuntimeError(
                f"Manifest must contain an object/dictionary: "
                f"{manifest_file}"
            )

        try:
            manifest = JointManifest.model_validate(data)
        except Exception as exc:
            raise RuntimeError(
                f"Manifest validation failed for "
                f"{manifest_file}:\n{exc}"
            ) from exc

        manifests.append(manifest)

        print(
            f"✓ Loaded joint "
            f"{manifest.jid} "
            f"({manifest.displayName})"
        )

    print(
        f"Successfully loaded {len(manifests)} joint manifests"
    )

    return manifests


@router.get(
    "/joints",
    response_model=list[JointManifest],
)
def list_joints():
    try:
        return load_all_manifests()

    except Exception as exc:
        print("============================================================")
        print("ERROR loading joint library")
        print(str(exc))
        print("============================================================")

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


@router.get(
    "/joints/{joint_id}",
    response_model=JointManifest,
)
def get_joint(joint_id: str):
    try:
        manifests = load_all_manifests()

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

    for manifest in manifests:
        if manifest.jid == joint_id:
            return manifest

    raise HTTPException(
        status_code=404,
        detail=f"Joint '{joint_id}' not found",
    )
