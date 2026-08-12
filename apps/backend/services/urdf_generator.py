"""
Generates robot.urdf.xacro from the scene graph.
Follows REP-103 (Z-up, metres, radians).
"""
import math
from models.schemas import ExportRequest, SceneJoint
from math import sin, cos, copysign


def _euler_xyz_to_quat(roll: float, pitch: float, yaw: float) -> tuple[float, float, float, float]:
    # Convert Euler XYZ (roll, pitch, yaw) to quaternion (x, y, z, w)
    cy = cos(yaw * 0.5)
    sy = sin(yaw * 0.5)
    cp = cos(pitch * 0.5)
    sp = sin(pitch * 0.5)
    cr = cos(roll * 0.5)
    sr = sin(roll * 0.5)

    qw = cr * cp * cy + sr * sp * sy
    qx = sr * cp * cy - cr * sp * sy
    qy = cr * sp * cy + sr * cp * sy
    qz = cr * cp * sy - sr * sp * cy
    return qx, qy, qz, qw


def _quat_mult(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    x = aw * bx + ax * bw + ay * bz - az * by
    y = aw * by - ax * bz + ay * bw + az * bx
    z = aw * bz + ax * by - ay * bx + az * bw
    w = aw * bw - ax * bx - ay * by - az * bz
    return x, y, z, w


def _quat_to_euler_xyz(x: float, y: float, z: float, w: float) -> tuple[float, float, float]:
    # Convert quaternion to Euler XYZ (roll, pitch, yaw)
    # roll (x-axis rotation)
    sinr_cosp = 2 * (w * x + y * z)
    cosr_cosp = 1 - 2 * (x * x + y * y)
    roll = math.atan2(sinr_cosp, cosr_cosp)

    # pitch (y-axis rotation)
    sinp = 2 * (w * y - z * x)
    if abs(sinp) >= 1:
        pitch = copysign(math.pi / 2, sinp)
    else:
        pitch = math.asin(sinp)

    # yaw (z-axis rotation)
    siny_cosp = 2 * (w * z + x * y)
    cosy_cosp = 1 - 2 * (y * y + z * z)
    yaw = math.atan2(siny_cosp, cosy_cosp)

    return roll, pitch, yaw


def generate_urdf_xacro(req: ExportRequest) -> str:
    # Build lookup: instanceId → jointName
    joint_names = {j.instanceId: j.jointName for j in req.joints}

    lines = [
        '<?xml version="1.0"?>',
        f'<robot name="{req.robot_name}" xmlns:xacro="http://www.ros.org/wiki/xacro">',
        '',
        '  <xacro:property name="robot_name" value="' + req.robot_name + '" />',
        '',
        '  <link name="base_link">',
        '    <inertial>',
        '      <mass value="0" />',
        '      <inertia ixx="0" ixy="0" ixz="0" iyy="0" iyz="0" izz="0" />',
        '    </inertial>',
        '  </link>',
        '',
        '  <!-- ─── Joints ─────────────────────────────────────────── -->',
    ]
    # Collect unique joint type includes first
    seen_types = set()
    for joint in req.joints:
        if joint.manifest.id not in seen_types:
            seen_types.add(joint.manifest.id)
            lines.append(f'  <xacro:include filename="$(find {joint.manifest.id}_description)/urdf/{joint.manifest.id}.urdf.xacro"/>')
    lines.append('')

    for joint in req.joints:
        # Resolve parent name from UUID
        if joint.parentInstanceId:
            parent_joint_name = joint_names.get(joint.parentInstanceId, 'base_link')
            parent_connector  = joint.parent_connector or 'joint_out'
            parent_connection = f"{parent_joint_name}_{parent_connector}"
        else:
            parent_connection = 'base_link'

        lines += _joint_xml(joint, joint.jointName, parent_connection)

    lines += ['', '  <!-- ─── Links ─────────────────────────────────────────── -->', '</robot>']
    return '\n'.join(lines)


def _joint_xml(j: SceneJoint, prefix: str, parent_connection: str) -> list[str]:
    m   = j.manifest
    pos = j.position
    rot = j.rotation

    child_input = j.input_ or 'joint_in'
    # The frontend uses Three.js (Y-up). ROS/REP-103 expects Z-up.
    # Convert positions and rotations from Three.js (Y-up) to ROS (Z-up)
    # Position transform: (x, y, z)_three -> (x, -z, y)_ros (rotate +90deg about X)
    pos_ros_x = pos[0]
    pos_ros_y = -pos[2]
    pos_ros_z = pos[1]

    # Rotation: compose a +90deg rotation about X before the joint rotation
    q_three = _euler_xyz_to_quat(rot[0], rot[1], rot[2])
    # Quaternion for +90deg about X
    q_rx90 = (math.sin(math.pi / 4), 0.0, 0.0, math.cos(math.pi / 4))
    q_ros = _quat_mult(q_rx90, q_three)
    rpy_ros = _quat_to_euler_xyz(*q_ros)

    return [
        f'  <xacro:{m.id}',
        f'    prefix="{prefix}"',
        f'    parent_connection="{parent_connection}"',
        f'    input="{child_input}"',
        f'    lower="{m.parameters.limits.min}"',
        f'    upper="{m.parameters.limits.max}">',
        f'    <origin xyz="{pos_ros_x:.6f} {pos_ros_y:.6f} {pos_ros_z:.6f}"',
        f'            rpy="{rpy_ros[0]:.6f} {rpy_ros[1]:.6f} {rpy_ros[2]:.6f}"/>',
        f'  </xacro:{m.id}>',
        '',
    ]

def _link_xml(j: SceneJoint) -> list[str]:
    m = j.manifest
    p = m.params
    # Inertia in kg·m²
    lines = [
        f''
    ]
    return lines

def generate_srdf(req: ExportRequest) -> str:
    """Generate MoveIt SRDF with a single planning group for the full chain."""
    chain_start = "base_link"
    chain_end = req.joints[-1].jointName if req.joints else "base_link"

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
