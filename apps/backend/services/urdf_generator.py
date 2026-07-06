"""
Generates robot.urdf.xacro from the scene graph.
Follows REP-103 (Z-up, metres, radians).
"""
import math
from models.schemas import ExportRequest, SceneJoint


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

    child_input = j.input or 'joint_in'

    return [
        f'  <xacro:{m.id}',
        f'    prefix="{prefix}"',
        f'    parent_connection="{parent_connection}"',
        f'    input="{child_input}"',
        f'    lower="{m.parameters.limits.min}"',
        f'    upper="{m.parameters.limits.max}">',
        f'    <origin xyz="{pos[0]:.6f} {pos[1]:.6f} {pos[2]:.6f}"',
        f'            rpy="{rot[0]:.6f} {rot[1]:.6f} {rot[2]:.6f}"/>',
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
