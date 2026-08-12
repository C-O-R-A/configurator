from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


class JointSpecs(BaseModel):
    mass: float
    max_torque: Optional[float] = None
    max_speed: Optional[float] = None


class JointLimits(BaseModel):
    min: float = -3.14159
    max: float =  3.14159


class JointParameters(BaseModel):
    limits: JointLimits = Field(default_factory=JointLimits)
    reduction_ratio: Optional[float] = None
    axis: Optional[list[float]] = None


class MeshPaths(BaseModel):
    visual: str
    collision: str


class Cad(BaseModel):
    cad_folder: str


class Connector(BaseModel):
    name:   str
    origin: tuple[float, float, float]
    axes:   tuple[
                tuple[float, float, float],
                tuple[float, float, float],
                tuple[float, float, float],
            ]
    type: Literal[
        "flange_input", "flange_output", "motor_mount", "sensor_port", "generic"
    ] = "generic"


class MotorInterface(BaseModel):
    max_motor_diameter: float
    max_motor_length:   float
    type:               Literal["shaft", "flat", "hollow"] = "shaft"
    flange_bolt_circle: Optional[float] = None
    bolt_count:         int             = 4
    bolt_size:          str             = "M5"


class GearboxSpec(BaseModel):
    integrated: bool = False
    ratio:      Optional[float] = None
    type: Literal["planetary", "harmonic", "spur", "wolfrom", "none"] = "none"


class JointManifest(BaseModel):
    id:              str
    type:            Literal["revolute", "prismatic", "continuous", "universal", "spherical", "fixed"]
    displayName:     str
    description:     Optional[str] = None
    version:         str           = "1.0.0"
    specs:           JointSpecs
    parameters:      JointParameters
    mesh:            MeshPaths
    urdf:            str
    connectors:      list[Connector] = Field(default_factory=list)
    motor_interface: MotorInterface
    gearbox:         Optional[GearboxSpec] = None
    cad:             Optional[Cad]         = None
    tags:            list[str]             = Field(default_factory=list)

class LinkManifest(BaseModel):
    id:          str
    displayName: str
    description: Optional[str] = None
    version:     str           = "1.0.0"
    connectors:   list[Connector] = Field(default_factory=list)
    mesh:        MeshPaths
    cad:         Optional[Cad] = None


class MotorConfig(BaseModel):
    id:                 str
    name:               str
    manufacturer:       Optional[str]  = None
    type:               Literal["shaft", "flat", "hollow"]
    body_diameter:      float
    body_length:        float
    shaft_diameter:     Optional[float] = None
    bore_diameter:      Optional[float] = None
    flange_bolt_circle: float
    bolt_count:         int
    bolt_size:          str
    rated_torque:       float
    rated_speed:        float
    rated_power:        float
    peak_torque:        Optional[float] = None
    voltage:            Optional[float] = None
    encoder_ppr:        Optional[int]   = None
    catalog:            Literal["standard", "custom"] = "standard"


class GearboxConfig(BaseModel):
    id:                str
    type:              Literal["planetary", "harmonic", "spur", "wolfrom"]
    ratio:             float
    efficiency:        float
    max_input_speed:   float
    max_output_torque: float
    catalog:           Literal["standard", "custom"] = "standard"


class SceneJoint(BaseModel):
    instanceId:       str
    manifestId:       str
    manifest:         JointManifest
    position:         tuple[float, float, float]
    rotation:         tuple[float, float, float]
    parentInstanceId: Optional[str]           = None
    childInstanceIds: list[str]               = Field(default_factory=list)
    motorConfig:      Optional[MotorConfig]   = None
    gearboxConfig:    Optional[GearboxConfig] = None
    jointName:        str
    input_:           Optional[Literal["joint_in", "joint_out"]] = Field(default=None, alias="input")
    parent_connector: Optional[Literal["joint_in", "joint_out"]] = None

class SceneLink(BaseModel):
    instanceId: str
    linkName:   str
    length:     float
    mass:       float
    inertia_ixx: float
    inertia_iyy: float
    inertia_izz: float

class ExportRequest(BaseModel):
    robot_name:     str
    joints:         list[SceneJoint]
    links:          list[SceneLink] = []
    export_formats: list[Literal[
        "urdf", "urdf_xacro", "srdf", "ros2_control", "moveit_config", "step"
    ]] = ["urdf_xacro", "srdf"]


class BuildArmRequest(BaseModel):
    robot_name:   str
    template_did: str
    template_wid: str
    joints:       list[SceneJoint]
