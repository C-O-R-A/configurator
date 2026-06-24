import { z } from 'zod'

// ─── Joint Manifest Schema ──────────────────────────────────────────────────
// This is the CONTRACT. Every joint in the library must conform to this.
// Adding a new joint = new folder + manifest.json + mesh files. No code changes.

export const JointTypeSchema = z.enum([
  'revolute',
  'prismatic',
  'continuous',
  'universal',
  'spherical',
  'fixed',
])
export type JointType = z.infer<typeof JointTypeSchema>

export const MotorInterfaceTypeSchema = z.enum(['shaft', 'flat', 'hollow'])
export type MotorInterfaceType = z.infer<typeof MotorInterfaceTypeSchema>

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()])
export type Vec3 = z.infer<typeof Vec3Schema>

export const JointManifestSchema = z.object({
  // Identity
  id: z.string(),                          // e.g. "revolute_80mm"
  type: JointTypeSchema,
  displayName: z.string(),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),

  // Physical parameters
  params: z.object({
    flange_diameter: z.number(),           // mm — output flange
    housing_diameter: z.number(),          // mm — outer body
    length: z.number(),                    // mm — total axial length
    mass: z.number(),                      // kg
    inertia_ixx: z.number(),               // kg·m²
    inertia_iyy: z.number(),
    inertia_izz: z.number(),
    max_torque: z.number().optional(),     // Nm (revolute/universal/spherical)
    max_force: z.number().optional(),      // N  (prismatic)
    stroke: z.number().optional(),         // mm (prismatic)
    max_speed: z.number().optional(),      // RPM or mm/s
  }),

  // Mesh files (relative to manifest location)
  mesh: z.object({
    visual: z.string(),                    // .glb for viewer
    collision: z.string(),                 // simplified .glb for collision
  }),

  // Coordinate frames — where things connect
  // These are offsets from the joint's own origin (0,0,0)
  frames: z.object({
    parent_attach: Vec3Schema,             // XYZ in mm — where parent link connects
    child_attach: Vec3Schema,              // XYZ in mm — where child link connects
    motor_mount: Vec3Schema.optional(),    // XYZ in mm — motor face center
  }),

  // Joint axis in local frame
  axis: Vec3Schema.default([0, 0, 1]),

  // Motor interface spec
  motor_interface: z.object({
    type: MotorInterfaceTypeSchema,
    bore_diameter: z.number().optional(),  // mm (hollow)
    shaft_diameter: z.number().optional(), // mm (shaft)
    flange_bolt_circle: z.number(),        // mm PCD
    bolt_count: z.number().int(),
    bolt_size: z.string(),                 // e.g. "M5"
    max_motor_diameter: z.number(),        // mm — housing constraint
    max_motor_length: z.number(),          // mm — housing constraint
  }),

  // Gearbox info (may be integrated or separate)
  gearbox: z.object({
    integrated: z.boolean().default(false),
    ratio: z.number().optional(),          // if integrated/fixed
    type: z.enum(['planetary', 'harmonic', 'spur', 'none']).default('none'),
  }).optional(),

  // CadQuery script for parametric STEP generation
  cad_script: z.string().optional(),       // filename, e.g. "revolute_80mm.py"
  
  // Tags for filtering in the UI
  tags: z.array(z.string()).default([]),
})

export type JointManifest = z.infer<typeof JointManifestSchema>

// ─── Scene Graph Types ───────────────────────────────────────────────────────
// These represent the robot being built in the configurator

export interface SceneJoint {
  instanceId: string             // uuid — unique per placed joint
  manifestId: string             // which joint type from the library
  manifest: JointManifest
  
  // World-space transform (meters, radians — ROS REP-103)
  position: Vec3
  rotation: Vec3                 // Euler XYZ in radians
  
  // Tree relationships
  parentInstanceId: string | null
  childInstanceIds: string[]
  
  // Per-instance overrides
  motorConfig: MotorConfig | null
  gearboxConfig: GearboxConfig | null
  
  // URDF link/joint naming
  linkName: string               // e.g. "link_1"
  jointName: string              // e.g. "joint_1"
}

// ─── Motor Types ─────────────────────────────────────────────────────────────

export const MotorSchema = z.object({
  id: z.string(),
  name: z.string(),
  manufacturer: z.string().optional(),
  type: MotorInterfaceTypeSchema,
  
  // Mounting
  body_diameter: z.number(),             // mm
  body_length: z.number(),               // mm
  shaft_diameter: z.number().optional(), // mm
  bore_diameter: z.number().optional(),  // mm (hollow)
  flange_bolt_circle: z.number(),        // mm
  bolt_count: z.number().int(),
  bolt_size: z.string(),
  
  // Performance
  rated_torque: z.number(),              // Nm
  rated_speed: z.number(),               // RPM
  rated_power: z.number(),               // W
  peak_torque: z.number().optional(),    // Nm
  
  // Electrical
  voltage: z.number().optional(),        // V
  encoder_ppr: z.number().optional(),    // pulses per rev
  
  // Source
  catalog: z.enum(['standard', 'custom']).default('standard'),
})
export type MotorSchema = z.infer<typeof MotorSchema>
export type MotorConfig = z.infer<typeof MotorSchema>

// ─── Gearbox Types ───────────────────────────────────────────────────────────

export interface GearboxConfig {
  id: string
  type: 'planetary' | 'harmonic' | 'spur'
  ratio: number
  efficiency: number             // 0–1
  max_input_speed: number        // RPM
  max_output_torque: number      // Nm
  catalog: 'standard' | 'custom'
}

// ─── Export Request Types ────────────────────────────────────────────────────

export interface ExportRequest {
  robot_name: string
  joints: SceneJoint[]
  export_formats: ExportFormat[]
}

export type ExportFormat =
  | 'urdf'
  | 'urdf_xacro'
  | 'srdf'
  | 'ros2_control'
  | 'moveit_config'
  | 'step'
