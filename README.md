# CORA — Cobot Configurator

Modular cobot joint configurator with an interactive 3D editor, export pipeline (URDF/XACRO, MoveIt 2, ros2_control), and parametric STEP generation via CadQuery or Onshape.

![CORA Pipeline](assets/DOC/pipeline.png)

## Summary

- Purpose: let users compose modular robot arms from reusable joint modules, tune mechanical parameters, preview assemblies in 3D, and generate the set of artifacts needed for ROS 2 integration and manufacturing.
- Primary components: a React + TypeScript frontend with a WebGL 3D viewer, and a FastAPI backend that handles templating, parametric CAD generation, and export orchestration.

## What this repository contains

- apps/frontend — React + TypeScript configurator and 3D viewer (Vite, @react-three/fiber)
- apps/backend — FastAPI backend: REST API, Jinja2 templating for URDF/SRDF/YAML, Onshape/CadQuery export pipeline
- packages/joint_library — Joint manifests, meshes, and CadQuery scripts (extensible plugin-style joint packages)
- assets — docs, diagrams and auxiliary files
- top-level utilities and scripts: `run.sh`, `docker-compose.yml`, `setup.sh`, `requirements.txt` (Python deps), frontend `package.json` (Node deps)

## Quick start — development

Frontend (mock mode, no backend required):

```bash
cd apps/frontend
npm install
npm run dev
# Open http://localhost:5173
```

Backend (API + export services):

```bash
cd apps/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Full stack (two terminals):

```bash
# Terminal 1 — frontend
cd apps/frontend && npm install && npm run dev

# Terminal 2 — backend
cd apps/backend && source .venv/bin/activate && pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Docker (single-command stack):

```bash
docker-compose up --build
```

## Onshape STEP export (optional)

The project supports two STEP-generation paths:
- Onshape authoritative export (requires API credentials and a configured master document)
- CadQuery parametric fallback (runs locally when Onshape credentials are not present)

Set Onshape credentials in your environment to enable Onshape exports:

```bash
export ONSHAPE_ACCESS_KEY=your_access_key
export ONSHAPE_SECRET_KEY=your_secret_key
```

Generate keys at https://dev-portal.onshape.com/keys and consult `apps/backend/services/ephemeral_pipeline.py` and `apps/backend/services/onshape_client.py` for the integration details.

If credentials are not provided the backend will use CadQuery-based generators found in `packages/joint_library/*/*.py`.

## Repository layout (key files)

- `apps/frontend/` — UI, 3D viewer, manifest typings
- `apps/backend/main.py` — FastAPI app entry
- `apps/backend/routers/` — API endpoints (`/api/joints`, `/api/export`)
- `apps/backend/services/` — export and templating logic (`urdf_generator.py`, `ros2_control_generator.py`, `moveit_generator.py`, `urdf_generator.py`, `onshape_client.py`, `ephemeral_pipeline.py`)
- `packages/joint_library/joints/` — each joint is a directory with `manifest.json`, meshes (`*.glb`), and an optional `*.py` CadQuery script

## Adding a new joint (developer guide)

1. Create `packages/joint_library/joints/your_joint_name/`.
2. Add a `manifest.json` (copy an existing manifest from `R120` or `R105` and edit).
3. Provide visual/collision meshes (`your_joint.glb`, `your_joint_collision.glb`).
4. Optionally add `your_joint.py` (CadQuery parametric script) to enable local STEP exports.
5. Restart the backend — the new joint is discovered automatically and available in the frontend.

The `manifest.json` conforms to a Zod schema declared in the frontend types; keep the manifest fields aligned with `apps/frontend/src/types/manifest.ts`.

## Export artifacts

An export operation bundles the following artifacts into a zip for download:

- `robot.step` — STEP (Onshape or CadQuery)
- `robot.urdf.xacro` — URDF/XACRO (Jinja2 templates)
- `ros2_control.yaml` — ros2_control hardware parameters
- `robot.srdf` — MoveIt SRDF planning groups
- `moveit_config/` — MoveIt 2 package (launch files + configs)
- `meshes/` — exported or packaged meshes used by the URDF

All geometry and units follow REP-103 conventions: Z-up, metres, radians.

## Onshape configuration variables

Master joint documents expose configuration entries such as `num_teeth_input`, `num_teeth_output`, `gear_module`, `bore_diameter`, and `joint_length`. The backend helper `gear_ratio_to_params()` maps float ratios to integer tooth counts that satisfy the document constraints.

## Development notes & tips

- Frontend dev server proxies API calls to `http://localhost:8000` when running locally; check `apps/frontend/vite.config.ts` for proxy settings.
- Backend has Jinja2 templates under `apps/backend/templates/` — edit templates to change URDF/ros2_control/moveit output.
- Local STEP generation relies on CadQuery; if you intend to use CadQuery locally, install the required native dependencies (see `apps/backend/requirements.txt`).
- There are helpful scripts at the repository root: `run.sh`, `run.py`, `launch.sh` — inspect them for automation convenience.

## Troubleshooting

- If exports fail due to missing Onshape credentials, the backend falls back to CadQuery when a local generator exists for the joint.
- Onshape API limits may throttle bulk export usage; for CI or automated pipelines consider a service account with sufficient quota.
- If a joint doesn't appear in the UI after adding it, verify `manifest.json` against the frontend schema and restart the backend.

## Contributing

Contributions are welcome. High-level suggestions:

- Add new joint packages under `packages/joint_library/joints/`.
- Improve Jinja2 templates in `apps/backend/templates/` for downstream tooling.
- Fix frontend bugs or add features in `apps/frontend/src/`.

Please open issues or PRs describing the change and include steps to reproduce when relevant.

