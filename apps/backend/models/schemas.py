from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


class JointParams(BaseModel):
    flange_diameter: float
    housing_diameter: float
    length: float
    mass: float
    inertia_ixx: float
    inertia_iyy: float
    inertia_izz: float
    max_torque: Optional[float] = None
    max_force: Optional[float] = None
    stroke: Optional[float] = None
    max_speed: Optional[float] = None


class MeshPaths(BaseModel):
    visual: str
    collision: str


class Frames(BaseModel):
    parent_attach: tuple[float, float, float]
    child_attach: tuple[float, float, float]
    motor_mount: Optional[tuple[float, float, float]] = None


class MotorInterface(BaseModel):
    type: Literal["shaft", "flat", "hollow"]
    bore_diameter: Optional[float] = None
    shaft_diameter: Optional[float] = None
    flange_bolt_circle: float
    bolt_count: int
    bolt_size: str
    max_motor_diameter: float
    max_motor_length: float


class GearboxSpec(BaseModel):
    integrated: bool = False
    ratio: Optional[float] = None
    type: Literal["planetary", "harmonic", "spur", "none"] = "none"


class JointManifest(BaseModel):
    id: str
    type: Literal["revolute", "prismatic", "continuous", "universal", "spherical", "fixed"]
    displayName: str
    description: Optional[str] = None
    version: str = "1.0.0"
    params: JointParams
    mesh: MeshPaths
    frames: Frames
    axis: tuple[float, float, float] = (0, 0, 1)
    motor_interface: MotorInterface
    gearbox: Optional[GearboxSpec] = None
    cad_script: Optional[str] = None
    tags: list[str] = []


# ─── Scene / Export models ────────────────────────────────────────────────────

class MotorConfig(BaseModel):
    id: str
    name: str
    manufacturer: Optional[str] = None
    type: Literal["shaft", "flat", "hollow"]
    body_diameter: float
    body_length: float
    shaft_diameter: Optional[float] = None
    bore_diameter: Optional[float] = None
    flange_bolt_circle: float
    bolt_count: int
    bolt_size: str
    rated_torque: float
    rated_speed: float
    rated_power: float
    peak_torque: Optional[float] = None
    voltage: Optional[float] = None
    encoder_ppr: Optional[int] = None
    catalog: Literal["standard", "custom"] = "standard"


class GearboxConfig(BaseModel):
    id: str
    type: Literal["planetary", "harmonic", "spur"]
    ratio: float
    efficiency: float
    max_input_speed: float
    max_output_torque: float
    catalog: Literal["standard", "custom"] = "standard"


class SceneJoint(BaseModel):
    instanceId: str
    manifestId: str
    manifest: JointManifest
    position: tuple[float, float, float]
    rotation: tuple[float, float, float]
    parentInstanceId: Optional[str] = None
    childInstanceIds: list[str] = []
    motorConfig: Optional[MotorConfig] = None
    gearboxConfig: Optional[GearboxConfig] = None
    linkName: str
    jointName: str


class ExportRequest(BaseModel):
    robot_name: str
    joints: list[SceneJoint]
    export_formats: list[Literal[
        "urdf", "urdf_xacro", "srdf", "ros2_control", "moveit_config", "step"
    ]] = ["urdf_xacro", "srdf"]
