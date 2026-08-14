# schemas.py
from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


class JointSpecs(BaseModel):
    mass: float
    max_torque: Optional[float] = None
    max_speed: Optional[float] = None
    housing_diameter: Optional[float] = None
    flange_diameter: Optional[float] = None
    length: Optional[float] = None


class JointLimits(BaseModel):
    min: float = -3.14159
    max: float = 3.14159


class JointParameters(BaseModel):
    limits: JointLimits = Field(default_factory=JointLimits)
    reduction_ratio: Optional[float] = None
    axis: Optional[list[float]] = None


class MeshPaths(BaseModel):
    visual: str
    collision: str


class Connector(BaseModel):
    name: str
    origin: tuple[float, float, float]
    axes: tuple[
        tuple[float, float, float],
        tuple[float, float, float],
        tuple[float, float, float],
    ]
    connector_type: Literal[
        "flange_input", "flange_output", "motor_mount", "sensor_port", "generic"
    ] = "generic"


class MotorInterface(BaseModel):
    motor_interface_type: Literal["shaft", "flat", "hollow"] = "shaft"
    bore_diameter: Optional[float] = None
    shaft_diameter: Optional[float] = None
    flange_bolt_circle: Optional[float] = None
    bolt_count: int = 4
    bolt_size: str = "M5"
    max_motor_diameter: Optional[float] = None
    max_motor_length: Optional[float] = None


class GearboxSpec(BaseModel):
    integrated: bool = False
    ratio: Optional[float] = None
    gearbox_type: Literal["planetary", "harmonic", "spur", "wolfrom", "none"] = "none"


class CadSpec(BaseModel):
    cad_folder: Optional[str] = None
    cad_script: Optional[str] = None


class JointManifest(BaseModel):
    jid: str
    joint_type: Literal[
        "revolute", "prismatic", "continuous", "universal", "spherical", "fixed"
    ]
    displayName: str
    description: Optional[str] = None
    version: str = "1.0.0"
    axis: tuple[float, float, float] = (0, 0, 1)
    specs: JointSpecs
    parameters: JointParameters = Field(default_factory=JointParameters)
    mesh: Optional[MeshPaths] = None
    urdf: Optional[str] = None
    connectors: list[Connector] = Field(default_factory=list)
    motor_interface: MotorInterface = Field(default_factory=MotorInterface)
    gearbox: Optional[GearboxSpec] = None
    cad: Optional[CadSpec] = None
    tags: list[str] = Field(default_factory=list)


class SceneJoint(BaseModel):
    instanceId: str
    manifestId: str
    manifest: JointManifest
    position: tuple[float, float, float]
    rotation: tuple[float, float, float]
    parentInstanceId: Optional[str] = None
    childInstanceIds: list[str] = Field(default_factory=list)
    jointName: str
    input_connector: Optional[Literal["joint_in", "joint_out"]] = None
    parent_connector: Optional[Literal["joint_in", "joint_out"]] = None


class MotorConfig(BaseModel):
    mcid: str
    name: str
    manufacturer: Optional[str] = None
    motor_type: Literal["shaft", "flat", "hollow"]
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
    gbid: str
    gearbox_type: Literal["planetary", "harmonic", "spur", "wolfram", "none"] = "none"
    ratio: float
    efficiency: float
    max_input_speed: float
    max_output_torque: float
    catalog: Literal["standard", "custom"] = "standard"


class ExportRequest(BaseModel):
    robot_name: str
    joints: list[SceneJoint]
    export_formats: list[
        Literal["urdf", "urdf_xacro", "srdf", "ros2_control", "moveit_config", "step"]
    ] = ["urdf_xacro", "srdf"]


class BuildArmRequest(BaseModel):
    robot_name: str
    template_did: str
    template_wid: str
    joints: list[SceneJoint]
