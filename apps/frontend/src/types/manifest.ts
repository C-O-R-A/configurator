import { z } from 'zod'

export const JointTypeSchema = z.enum([
  'revolute', 'prismatic', 'continuous', 'universal', 'spherical', 'fixed',
])
export type JointType = z.infer<typeof JointTypeSchema>

export const ConnectorTypeSchema = z.enum([
  'flange_input', 'flange_output', 'motor_mount', 'sensor_port', 'generic',
])
export type ConnectorType = z.infer<typeof ConnectorTypeSchema>

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()])
export type Vec3 = z.infer<typeof Vec3Schema>

export const Mat3Schema = z.tuple([Vec3Schema, Vec3Schema, Vec3Schema])
export type Mat3 = z.infer<typeof Mat3Schema>

export const ConnectorSchema = z.object({
  name:   z.string(),
  origin: Vec3Schema,
  axes:   Mat3Schema,
  type:   ConnectorTypeSchema.default('generic'),
})
export type Connector = z.infer<typeof ConnectorSchema>

export const JointManifestSchema = z.object({
  jid:          z.string(),
  joint_type:        JointTypeSchema,
  displayName: z.string(),
  description: z.string().optional(),
  version:     z.string().default('1.0.0'),
  axis:        Vec3Schema.default([0, 0, 1]),

  specs: z.object({
    mass:             z.number(),
    max_torque:       z.number().optional(),
    max_speed:        z.number().optional(),
    housing_diameter: z.number().optional(),
    flange_diameter:  z.number().optional(),
    length:           z.number().optional(),
  }),

  parameters: z.object({
    limits: z.object({
      min: z.number().default(-Math.PI),
      max: z.number().default(Math.PI),
    }).default({ min: -Math.PI, max: Math.PI }),
    reduction_ratio: z.number().optional(),
    axis:            z.array(z.number()).optional(),
  }).default({}),

  mesh: z.object({
    visual:    z.string(),
    collision: z.string(),
  }).optional(),

  urdf: z.string().optional(),

  connectors: z.array(ConnectorSchema).default([]),

  motor_interface: z.object({
    type:               z.enum(['shaft', 'flat', 'hollow']).default('shaft'),
    bore_diameter:      z.number().optional(),
    shaft_diameter:     z.number().optional(),
    flange_bolt_circle: z.number().optional(),
    bolt_count:         z.number().int().default(4),
    bolt_size:          z.string().default('M5'),
    max_motor_diameter: z.number().optional(),
    max_motor_length:   z.number().optional(),
  }).default({}),

  gearbox: z.object({
    integrated: z.boolean().default(false),
    ratio:      z.number().optional(),
    type:       z.enum(['planetary', 'harmonic', 'spur', 'wolfrom', 'none']).default('none'),
  }).optional(),

  cad: z.object({
    cad_folder: z.string().optional(),
    cad_script: z.string().optional(),
  }).optional(),

  tags: z.array(z.string()).default([]),
})
export type JointManifest = z.infer<typeof JointManifestSchema>

export interface SceneJoint {
  instanceId:       string
  manifestId:       string
  manifest:         JointManifest
  position:         [number, number, number]
  rotation:         [number, number, number]
  offset_position:  [number, number, number]
  offset_rotation:  [number, number, number]
  parentInstanceId: string | null
  childInstanceIds: string[]
  jointName:        string
  input_connector:  'joint_in' | 'joint_out' | null
  parent_connector: 'joint_in' | 'joint_out' | null
}

export interface MotorConfig {
  mcid:                 string
  name:               string
  manufacturer?:      string
  type:               'shaft' | 'flat' | 'hollow'
  body_diameter:      number
  body_length:        number
  shaft_diameter?:    number
  bore_diameter?:     number
  flange_bolt_circle: number
  bolt_count:         number
  bolt_size:          string
  rated_torque:       number
  rated_speed:        number
  rated_power:        number
  peak_torque?:       number
  voltage?:           number
  encoder_ppr?:       number
  catalog:            'standard' | 'custom'
}

export interface GearboxConfig {
  gbid:              string
  gearbox_type:      'planetary' | 'harmonic' | 'spur' | 'wolfram' | 'none'
  ratio:             number
  efficiency:        number
  max_input_speed:   number
  max_output_torque: number
  catalog:           'standard' | 'custom'
}

export interface ExportRequest {
  robot_name:     string
  joints:         SceneJoint[]
  export_formats: string[]
}

export interface BuildArmRequest {
  robot_name:   string
  template_did: string
  template_wid: string
  joints:       SceneJoint[]
}