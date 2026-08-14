"""ros2_control YAML generator."""
import math
from models.schemas import ExportRequest


def generate_ros2_control(req: ExportRequest) -> str:
    joints_yaml = ""
    for j in req.joints:
        if j.manifest.joint_type in ("fixed",):
            continue
        joints_yaml += f"""
    {j.jointName}:
      command_interfaces:
        - position
        - velocity
      state_interfaces:
        - position
        - velocity
        - effort
"""

    return f"""controller_manager:
  ros__parameters:
    update_rate: 500  # Hz

    joint_state_broadcaster:
      type: joint_state_broadcaster/JointStateBroadcaster

    arm_controller:
      type: joint_trajectory_controller/JointTrajectoryController

arm_controller:
  ros__parameters:
    joints:
{_joint_name_list(req)}
    command_interfaces:
      - position
    state_interfaces:
      - position
      - velocity
    open_loop_control: false
    allow_partial_joints_goal: false

# Hardware interface
{req.robot_name}:
  ros__parameters:
    joints:{joints_yaml}
"""


def _joint_name_list(req: ExportRequest) -> str:
    names = [
        f"      - {j.jointName}"
        for j in req.joints
        if j.manifest.joint_type not in ("fixed",)
    ]
    return "\n".join(names)
