"""Generates MoveIt 2 config files."""
import math
from models.schemas import ExportRequest


def generate_moveit_config(req: ExportRequest) -> dict[str, str]:
    """Returns a dict of {filename: content} for all MoveIt config files."""
    return {
        "kinematics.yaml": _kinematics(req),
        "joint_limits.yaml": _joint_limits(req),
        "moveit_controllers.yaml": _moveit_controllers(req),
        "planning_pipelines.yaml": _planning_pipelines(),
        "pilz_cartesian_limits.yaml": _pilz_limits(),
    }


def _kinematics(req: ExportRequest) -> str:
    return f"""arm:
  kinematics_solver: kdl_kinematics_plugin/KDLKinematicsPlugin
  kinematics_solver_search_resolution: 0.005
  kinematics_solver_timeout: 0.005
  kinematics_solver_attempts: 3
"""


def _joint_limits(req: ExportRequest) -> str:
    lines = ["joint_limits:"]
    for j in req.joints:
        m = j.manifest
        if m.type in ("fixed",):
            continue

        if m.type in ("revolute", "continuous", "universal", "spherical"):
            max_vel = (m.specs.max_speed or 180) * math.pi / 180
            max_acc = max_vel * 0.5
            max_eff = m.specs.max_torque or 10.0
            lines += [
                f"  {j.jointName}:",
                f"    has_velocity_limits: true",
                f"    max_velocity: {max_vel:.4f}",
                f"    has_acceleration_limits: true",
                f"    max_acceleration: {max_acc:.4f}",
                f"    has_effort_limits: true",
                f"    max_effort: {max_eff:.2f}",
            ]
        elif m.type == "prismatic":
            max_vel = m.specs.max_speed or 0.1
            max_acc = max_vel * 0.5
            max_eff = m.specs.max_force or 100.0
            lines += [
                f"  {j.jointName}:",
                f"    has_velocity_limits: true",
                f"    max_velocity: {max_vel:.4f}",
                f"    has_acceleration_limits: true",
                f"    max_acceleration: {max_acc:.4f}",
                f"    has_effort_limits: true",
                f"    max_effort: {max_eff:.2f}",
            ]

    return "\n".join(lines) + "\n"


def _moveit_controllers(req: ExportRequest) -> str:
    joint_names = "\n".join(
        f"    - {j.jointName}"
        for j in req.joints
        if j.manifest.type not in ("fixed",)
    )
    return f"""moveit_controller_manager: moveit_simple_controller_manager/MoveItSimpleControllerManager

moveit_simple_controller_manager:
  controller_names:
    - arm_controller

arm_controller:
  type: FollowJointTrajectory
  action_ns: follow_joint_trajectory
  default: true
  joints:
{joint_names}
"""


def _planning_pipelines() -> str:
    return """planning_pipelines:
  pipeline_names:
    - ompl
    - pilz_industrial_motion_planner

ompl:
  planning_plugin: ompl_interface/OMPLPlanner
  request_adapters:
    - default_planning_request_adapters/ResolveConstraintFrames
    - default_planning_request_adapters/ValidateWorkspaceBounds
    - default_planning_request_adapters/CheckStartStateBounds
    - default_planning_request_adapters/CheckStartStateCollision
  response_adapters:
    - default_planning_response_adapters/AddTimeOptimalParameterization
    - default_planning_response_adapters/ValidateSolution
    - default_planning_response_adapters/DisplayMotionPath
  start_state_max_bounds_error: 0.1

pilz_industrial_motion_planner:
  planning_plugin: pilz_industrial_motion_planner/CommandPlanner
"""


def _pilz_limits() -> str:
    return """cartesian_limits:
  max_trans_vel: 1.0
  max_trans_acc: 2.25
  max_trans_dec: -5.0
  max_rot_vel: 1.57
"""
