from models.schemas import ExportRequest, SceneJoint

def generate_robot_yaml(req: ExportRequest) -> str:
    """Generates a robot.yaml file for the given ExportRequest."""
    lines = [
        "robot:",
        f"  name: {req.robot_name}",
        "  joints:",
    ]

    for j in req.joints:
        m = j.manifest
        lines.append(f"    - name: {j.jointName}")
        lines.append(f"      type: {m.joint_type}")
        lines.append(f"      parent: {j.parentInstanceId or 'base_link'}")
        lines.append(f"      child: {j.instanceId}")
        lines.append(f"      input_connector: {j.input_connector or 'joint_in'}")
        lines.append(f"      output_connector: {j.output_connector or 'joint_out'}")
        lines.append(f"      specs:")
        lines.append(f"        max_speed: {m.specs.max_speed or 0.0}")
        lines.append(f"        max_torque: {m.specs.max_torque or 0.0}")
        lines.append(f"        min_angle: {m.specs.min_angle or 0.0}")
        lines.append(f"        max_angle: {m.specs.max_angle or 0.0}")

    lines.append(f"  end_effectors: {req.end_effectors}")
    return "\n".join(lines)
