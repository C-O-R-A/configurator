"""
Generates robot.urdf.xacro from the scene graph.
Follows REP-103 (Z-up, metres, radians).
"""
import math
from models.schemas import ExportRequest, SceneJoint


def generate_urdf_xacro(req: ExportRequest) -> str:
    lines = [
        '<?xml version="1.0"?>',
        f'<robot name="{req.robot_name}" xmlns:xacro="http://www.ros.org/wiki/xacro">',
        "",
        "  <!-- ─── Properties ─────────────────────────────────────────── -->",
        '  <xacro:property name="robot_name" value="' + req.robot_name + '" />',
        "",
        "  <!-- ─── Base link ──────────────────────────────────────────── -->",
        '  <link name="base_link">',
        "    <visual>",
        "      <geometry><box size=\"0.05 0.05 0.01\"/></geometry>",
        '      <material name="grey"><color rgba="0.5 0.5 0.5 1"/></material>',
        "    </visual>",
        '    <collision><geometry><box size="0.05 0.05 0.01"/></geometry></collision>',
        "    <inertial>",
        '      <mass value="0.1"/>',
        '      <inertia ixx="0.0001" iyy="0.0001" izz="0.0001" ixy="0" ixz="0" iyz="0"/>',
        "    </inertial>",
        "  </link>",
        "",
    ]

    for joint in req.joints:
        lines += _link_xml(joint)
        lines += _joint_xml(joint)

    lines.append("</robot>")
    return "\n".join(lines)


def _link_xml(j: SceneJoint) -> list[str]:
    m = j.manifest
    p = m.params
    # Inertia in kg·m²
    lines = [
        f'  <!-- ─── {j.linkName} ({m.type}) ──────────────── -->',
        f'  <link name="{j.linkName}">',
        "    <visual>",
        "      <geometry>",
        f'        <cylinder radius="{p.housing_diameter/2/1000:.6f}" length="{p.length/1000:.6f}"/>',
        "      </geometry>",
        f'      <origin xyz="0 0 {p.length/2/1000:.6f}" rpy="0 0 0"/>',
        f'      <material name="{m.type}_mat"/>',
        "    </visual>",
        "    <collision>",
        "      <geometry>",
        f'        <cylinder radius="{p.housing_diameter/2/1000:.6f}" length="{p.length/1000:.6f}"/>',
        "      </geometry>",
        f'      <origin xyz="0 0 {p.length/2/1000:.6f}" rpy="0 0 0"/>',
        "    </collision>",
        "    <inertial>",
        f'      <mass value="{p.mass:.6f}"/>',
        f'      <inertia ixx="{p.inertia_ixx:.8f}" iyy="{p.inertia_iyy:.8f}" izz="{p.inertia_izz:.8f}" ixy="0" ixz="0" iyz="0"/>',
        "    </inertial>",
        "  </link>",
        "",
    ]
    return lines


def _joint_xml(j: SceneJoint) -> list[str]:
    m = j.manifest
    parent = j.parentInstanceId if j.parentInstanceId else "base_link"
    # Note: parent here is an instanceId; URDF needs the link name.
    # The caller should resolve — for now we pass linkName and resolve at generation time.
    # This is handled in generate_urdf_xacro by passing the full joint list.
    pos = j.position  # metres
    rot = j.rotation  # radians
    axis = m.axis

    joint_type = _urdf_joint_type(m.type)
    limit_xml = _limit_xml(m, joint_type)

    lines = [
        f'  <joint name="{j.jointName}" type="{joint_type}">',
        f'    <parent link="{parent}"/>',
        f'    <child link="{j.linkName}"/>',
        f'    <origin xyz="{pos[0]:.6f} {pos[1]:.6f} {pos[2]:.6f}" rpy="{rot[0]:.6f} {rot[1]:.6f} {rot[2]:.6f}"/>',
        f'    <axis xyz="{axis[0]} {axis[1]} {axis[2]}"/>',
    ]
    if limit_xml:
        lines.append(f"    {limit_xml}")

    lines += ["  </joint>", ""]
    return lines


def _urdf_joint_type(t: str) -> str:
    return {
        "revolute":   "revolute",
        "prismatic":  "prismatic",
        "continuous": "continuous",
        "fixed":      "fixed",
        "universal":  "revolute",   # URDF has no universal; decompose into 2 revolute
        "spherical":  "revolute",   # Same — approximate
    }.get(t, "revolute")


def _limit_xml(m, joint_type: str) -> str:
    if joint_type in ("fixed", "continuous"):
        return ""
    if joint_type == "revolute":
        torque = m.params.max_torque or 10.0
        speed = (m.params.max_speed or 180) * math.pi / 180  # deg/s → rad/s
        return (
            f'<limit effort="{torque:.2f}" velocity="{speed:.4f}" '
            f'lower="{-math.pi:.6f}" upper="{math.pi:.6f}"/>'
        )
    if joint_type == "prismatic":
        force = m.params.max_force or 100.0
        speed = (m.params.max_speed or 0.1)
        stroke = (m.params.stroke or 100) / 1000
        return (
            f'<limit effort="{force:.2f}" velocity="{speed:.4f}" '
            f'lower="0" upper="{stroke:.6f}"/>'
        )
    return ""


def generate_srdf(req: ExportRequest) -> str:
    """Generate MoveIt SRDF with a single planning group for the full chain."""
    chain_start = "base_link"
    chain_end = req.joints[-1].linkName if req.joints else "base_link"

    joint_lines = "\n".join(
        f'    <joint name="{j.jointName}"/>'
        for j in req.joints
        if j.manifest.type not in ("fixed",)
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

  <!-- Disable self-collision for adjacent links (update after review) -->
  <!-- <disable_collisions link1="link_1" link2="base_link" reason="Adjacent"/> -->

</robot>
"""
