# TODO: #4 generate_urdf_xacro() emits only the bare kinematic chain. The
# cora_common launch pipeline needs a top-level xacro with hardware_type /
# gripper_package / initial_positions_file args, a ros2_control include, and a
# Gazebo branch. Compare cora_moveit_config/config/cora.urdf.xacro.
#
# NOTE: this file must keep emitting LITERAL TEXT for the kinematic structure.
# It cannot become a generic xacro that loops robot_layout.yaml, because
# (a) xacro:include with a computed filename inside a macro does not register
# the included macros, and (b) the joint-library macros take *origin as a block
# parameter, which cannot be synthesised from YAML data. Verified on Jazzy —
# see C-O-R-A/configurator#1. The ros2_control blocks CAN be YAML-driven (#5).

# urdf_generator.py
"""
Generates robot.urdf.xacro from the scene graph.
Follows REP-103 (Z-up, metres, radians).
"""

import math
from models.schemas import ExportRequest, SceneJoint


def generate_urdf_xacro(req: ExportRequest) -> str:
    joint_names = {j.instanceId: j.jointName for j in req.joints}

    lines = [
        '<?xml version="1.0"?>',
        f'<robot name="{req.robot_name}" xmlns:xacro="http://www.ros.org/wiki/xacro">',
        "",
        '  <xacro:property name="robot_name" value="' + req.robot_name + '" />',
        "",
        '  <link name="base_link">',
        "    <inertial>",
        '      <mass value="0" />',
        '      <inertia ixx="0" ixy="0" ixz="0" iyy="0" iyz="0" izz="0" />',
        "    </inertial>",
        "  </link>",
        "",
        "  <!-- ─── Joints ─────────────────────────────────────────── -->",
    ]

    # Include each unique joint type once
    seen_types: set[str] = set()
    for joint in req.joints:
        if joint.manifest.jid not in seen_types:
            seen_types.add(joint.manifest.jid)
            lines.append(
                f'  <xacro:include filename="$(find {joint.manifest.jid}_description)'
                f'/urdf/{joint.manifest.jid}.urdf.xacro"/>'
            )
    lines.append("")

    for joint in req.joints:
        if joint.parentInstanceId:
            parent_joint_name = joint_names.get(joint.parentInstanceId, "base_link")
            parent_connector = joint.parent_connector or "joint_out"
            parent_connection = f"{parent_joint_name}_{parent_connector}"
        else:
            parent_connection = "base_link"

        lines += _joint_xml(joint, joint.jointName, parent_connection)

    lines += [
        "",
        "  <!-- ─── Links ─────────────────────────────────────────── -->",
        "</robot>",
    ]
    return "\n".join(lines)


def _joint_xml(j: SceneJoint, prefix: str, parent_connection: str) -> list[str]:
    m = j.manifest
    child_input = j.input_connector or "joint_in"

    # localPosition/localRotation is the child-input-connector pose
    # expressed in the parent-output-connector frame — exactly what
    # a URDF <origin> under parent_connection expects.
    pos = j.localPosition
    rot = j.localRotation

    return [
        f"  <xacro:{m.jid}",
        f'    prefix="{prefix}"',
        f'    parent_connection="{parent_connection}"',
        f'    input="{child_input}"',
        # TODO: #7 effort/velocity are never passed, so the URDF keeps the macro
        # defaults (effort=10, velocity=1) while joint_limits.yaml derives
        # max_velocity 3.14 from the SAME manifest's specs.max_speed. They disagree.
        f'    lower="{m.parameters.limits.min}"',
        f'    upper="{m.parameters.limits.max}">',
        f'    <origin xyz="{pos[0]:.6f} {pos[1]:.6f} {pos[2]:.6f}"',
        f'            rpy="{rot[0]:.6f} {rot[1]:.6f} {rot[2]:.6f}"/>',
        f"  </xacro:{m.jid}>",
        "",
    ]

# TODO: #6 no disable_collisions pairs are emitted at all. Adjacent pairs are
# free (parent/child is known); Never pairs need a self-collision sweep.
# Without them planning self-collision-rejects immediately — cora.srdf has 12.
# TODO: #6 also missing: an arm_with_gripper group and an <end_effector> element.
def generate_srdf(req: ExportRequest) -> str:
    chain_start = "base_link"
    # TODO: #6 BUG — this is a JOINT name, not a link. The tip link is
    # f"{req.joints[-1].jointName}_joint_out". SRDF load fails as written.
    chain_end = req.joints[-1].jointName if req.joints else "base_link"

    joint_lines = "\n".join(
        # TODO: #6 BUG — group_state joints need a value="..." attribute.
        # As written this is invalid SRDF.
        f'    <joint name="{j.jointName}"/>'
        for j in req.joints
        if j.manifest.joint_type not in ("fixed",)
    )

    return f"""<?xml version="1.0"?>
<robot name="{req.robot_name}">

  <!-- Planning group for the full arm -->
  <group name="arm">
    <chain base_link="{chain_start}" tip_link="{chain_end}"/>
  </group>

  <!-- Default robot configuration (all zeros) -->
  <group_state name="home" group="arm">
{joint_lines}
  </group_state>

  <!-- Virtual joint to world -->
  <virtual_joint name="virtual_joint" type="fixed"
    parent_frame="world" child_link="base_link"/>

</robot>
"""
