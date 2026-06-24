"""
CadQuery parametric script for the Revolute 80mm joint.

Usage:
    python revolute_80mm.py --motor-diameter 42 --motor-length 60 --output joint.step

This script generates a STEP file of the joint housing adapted to the
selected motor dimensions.
"""
import argparse
from dataclasses import dataclass
from typing import Optional

try:
    import cadquery as cq
except ImportError:
    raise ImportError("CadQuery is required: pip install cadquery")


@dataclass
class MotorSpec:
    diameter: float        # mm — motor body OD
    length: float          # mm — motor body length
    shaft_diameter: float  # mm
    flange_bolt_circle: float
    bolt_count: int
    bolt_size: str         # e.g. "M5"


@dataclass
class GearboxSpec:
    ratio: float
    type: str              # "planetary" | "harmonic" | "none"
    length: float          # mm — additional axial length


# ─── Joint dimensions (from manifest) ────────────────────────────────────────
FLANGE_DIAMETER   = 80.0   # mm
HOUSING_DIAMETER  = 86.0   # mm
HOUSING_LENGTH    = 65.0   # mm
WALL_THICKNESS    = 4.0    # mm
OUTPUT_FLANGE_T   = 8.0    # mm — output flange thickness
MOUNT_FLANGE_T    = 6.0    # mm — motor mounting flange thickness
BOLT_CIRCLE       = 60.0   # mm PCD (4× M5)


def build_joint(
    motor: Optional[MotorSpec] = None,
    gearbox: Optional[GearboxSpec] = None,
) -> cq.Assembly:
    """
    Build the complete joint assembly as a CadQuery Assembly.
    Returns the assembly ready for STEP export.
    """

    # ── Main housing cylinder ────────────────────────────────────────────────
    housing = (
        cq.Workplane("XY")
        .cylinder(HOUSING_LENGTH, HOUSING_DIAMETER / 2)
        # Hollow interior for motor + gearbox
        .shell(-WALL_THICKNESS)
    )

    # ── Output flange (bottom) ───────────────────────────────────────────────
    output_flange = (
        cq.Workplane("XY")
        .cylinder(OUTPUT_FLANGE_T, FLANGE_DIAMETER / 2)
        # Bolt holes (4× M5 on 60mm PCD)
        .faces(">Z")
        .workplane()
        .polarArray(BOLT_CIRCLE / 2, 0, 360, 4)
        .hole(5.2)  # M5 clearance
    )

    # ── Motor mount flange (top) ─────────────────────────────────────────────
    motor_bore = (motor.diameter + 0.5) if motor else 44.0  # +0.5mm clearance
    mount_flange = (
        cq.Workplane("XY")
        .cylinder(MOUNT_FLANGE_T, HOUSING_DIAMETER / 2)
        .faces(">Z")
        .workplane()
        .hole(motor_bore)
        # Motor bolt holes
        .faces(">Z")
        .workplane()
        .polarArray(
            (motor.flange_bolt_circle / 2) if motor else 30.0,
            0, 360,
            (motor.bolt_count) if motor else 4
        )
        .hole(5.2)
    )

    # ── Cross-roller bearing pocket ──────────────────────────────────────────
    bearing_od = FLANGE_DIAMETER - 2.0   # mm
    bearing_id = bearing_od - 20.0       # mm (estimate)
    bearing_h  = 10.0                    # mm

    bearing_pocket = (
        cq.Workplane("XY")
        .cylinder(bearing_h, bearing_od / 2)
        .faces(">Z")
        .workplane()
        .hole(bearing_id)
    )

    # ── Assemble ─────────────────────────────────────────────────────────────
    assy = cq.Assembly(name="revolute_80mm")
    assy.add(housing,        name="housing",       loc=cq.Location((0, 0, OUTPUT_FLANGE_T)))
    assy.add(output_flange,  name="output_flange", loc=cq.Location((0, 0, OUTPUT_FLANGE_T / 2)))
    assy.add(mount_flange,   name="mount_flange",  loc=cq.Location((0, 0, HOUSING_LENGTH + OUTPUT_FLANGE_T - MOUNT_FLANGE_T / 2)))
    assy.add(bearing_pocket, name="bearing",       loc=cq.Location((0, 0, bearing_h / 2)))

    return assy


def export_step(assy: cq.Assembly, output_path: str) -> None:
    assy.save(output_path)
    print(f"✓ STEP written to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Revolute 80mm joint STEP")
    parser.add_argument("--motor-diameter", type=float, default=42.0)
    parser.add_argument("--motor-length", type=float, default=60.0)
    parser.add_argument("--shaft-diameter", type=float, default=10.0)
    parser.add_argument("--bolt-circle", type=float, default=30.0)
    parser.add_argument("--bolt-count", type=int, default=4)
    parser.add_argument("--output", default="revolute_80mm.step")
    args = parser.parse_args()

    motor = MotorSpec(
        diameter=args.motor_diameter,
        length=args.motor_length,
        shaft_diameter=args.shaft_diameter,
        flange_bolt_circle=args.bolt_circle,
        bolt_count=args.bolt_count,
        bolt_size="M5",
    )

    assy = build_joint(motor=motor)
    export_step(assy, args.output)
