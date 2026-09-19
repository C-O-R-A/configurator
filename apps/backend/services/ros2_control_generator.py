# TODO: #5 this module emits only ros2_controllers.yaml. It does NOT emit the
# ros2_control xacros, even though the configurator is the only component that
# knows the per-joint CAN node_id. Preferred fix is Option A in #5: cora_common
# keeps one generic xacro that loops robot_layout.yaml, and this emits the YAML.
#
# TODO: #7 also wrong here: update_rate 500 vs cora_common's 100, no
# use_sim_time, no gripper controller, no allow_nonzero_velocity_at_trajectory_end.

"""ros2_control YAML generator."""
import math
from models.schemas import ExportRequest


# TODO: #7 the trailing "<robot_name>: ros__parameters: joints:" block in the
# template below is dead — nothing in the stack consumes it. Drop it.
# (Keep this note out of the f-string: a literal brace in there is parsed as a
# format field and raises at runtime.)
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
