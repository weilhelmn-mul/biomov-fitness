/**
 * Quaternion Class for 3D Orientation
 * Used for sensor fusion without gimbal lock issues
 */
export class Quaternion {
  public w: number
  public x: number
  public y: number
  public z: number

  constructor(w: number = 1, x: number = 0, y: number = 0, z: number = 0) {
    this.w = w
    this.x = x
    this.y = y
    this.z = z
  }

  /**
   * Create quaternion from axis-angle representation
   */
  static fromAxisAngle(axis: { x: number; y: number; z: number }, angle: number): Quaternion {
    const halfAngle = angle / 2
    const sinHalf = Math.sin(halfAngle)
    const cosHalf = Math.cos(halfAngle)
    
    // Normalize axis
    const mag = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z)
    if (mag < 0.0001) return new Quaternion(1, 0, 0, 0)
    
    const nx = axis.x / mag
    const ny = axis.y / mag
    const nz = axis.z / mag
    
    return new Quaternion(
      cosHalf,
      nx * sinHalf,
      ny * sinHalf,
      nz * sinHalf
    )
  }

  /**
   * Create quaternion from Euler angles (roll, pitch, yaw) in radians
   * Uses ZYX convention (yaw-pitch-roll)
   */
  static fromEulerAngles(roll: number, pitch: number, yaw: number): Quaternion {
    const cr = Math.cos(roll / 2)
    const sr = Math.sin(roll / 2)
    const cp = Math.cos(pitch / 2)
    const sp = Math.sin(pitch / 2)
    const cy = Math.cos(yaw / 2)
    const sy = Math.sin(yaw / 2)

    return new Quaternion(
      cr * cp * cy + sr * sp * sy,
      sr * cp * cy - cr * sp * sy,
      cr * sp * cy + sr * cp * sy,
      cr * cp * sy - sr * sp * cy
    )
  }

  /**
   * Create quaternion from acceleration vector (tilt only)
   * Returns the rotation needed to align device with gravity
   */
  static fromAcceleration(ax: number, ay: number, az: number): Quaternion {
    // Normalize acceleration
    const mag = Math.sqrt(ax * ax + ay * ay + az * az)
    if (mag < 0.0001) return new Quaternion(1, 0, 0, 0)
    
    const nx = ax / mag
    const ny = ay / mag
    const nz = az / mag

    // Reference direction (gravity pointing down: [0, 0, 1])
    // We want to find rotation from [0, 0, 1] to [nx, ny, nz]
    
    // Cross product for rotation axis
    const crossX = -ny
    const crossY = nx
    const crossZ = 0
    
    // Dot product for angle
    const dot = nz
    
    // Angle between vectors
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)))
    
    if (angle < 0.0001) {
      // Vectors are nearly parallel
      return new Quaternion(1, 0, 0, 0)
    }
    
    // Create quaternion from axis-angle
    const axisMag = Math.sqrt(crossX * crossX + crossY * crossY)
    if (axisMag < 0.0001) {
      // 180 degree rotation
      return new Quaternion(0, 1, 0, 0) // Rotate around X axis
    }
    
    return Quaternion.fromAxisAngle(
      { x: crossX / axisMag, y: crossY / axisMag, z: 0 },
      angle
    )
  }

  /**
   * Multiply two quaternions (combines rotations)
   */
  multiply(q: Quaternion): Quaternion {
    return new Quaternion(
      this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z,
      this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
      this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
      this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w
    )
  }

  /**
   * Get conjugate (inverse for unit quaternions)
   */
  conjugate(): Quaternion {
    return new Quaternion(this.w, -this.x, -this.y, -this.z)
  }

  /**
   * Get magnitude
   */
  magnitude(): number {
    return Math.sqrt(
      this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z
    )
  }

  /**
   * Normalize to unit quaternion
   */
  normalize(): Quaternion {
    const mag = this.magnitude()
    if (mag < 0.0001) return new Quaternion(1, 0, 0, 0)
    
    return new Quaternion(
      this.w / mag,
      this.x / mag,
      this.y / mag,
      this.z / mag
    )
  }

  /**
   * Scale quaternion
   */
  scale(s: number): Quaternion {
    return new Quaternion(
      this.w * s,
      this.x * s,
      this.y * s,
      this.z * s
    )
  }

  /**
   * Add two quaternions
   */
  add(q: Quaternion): Quaternion {
    return new Quaternion(
      this.w + q.w,
      this.x + q.x,
      this.y + q.y,
      this.z + q.z
    )
  }

  /**
   * Interpolate between quaternions (SLERP)
   */
  slerp(q: Quaternion, t: number): Quaternion {
    const dot = this.w * q.w + this.x * q.x + this.y * q.y + this.z * q.z
    
    // If quaternions are close, use linear interpolation
    if (dot > 0.9995) {
      return this.add(q.add(this.conjugate()).scale(t)).normalize()
    }
    
    // Clamp dot product
    const theta0 = Math.acos(Math.max(-1, Math.min(1, Math.abs(dot))))
    const theta = theta0 * t
    
    const sinTheta = Math.sin(theta)
    const sinTheta0 = Math.sin(theta0)
    
    const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0
    const s1 = sinTheta / sinTheta0
    
    const result = this.scale(s0).add(q.scale(dot < 0 ? -s1 : s1))
    return result.normalize()
  }

  /**
   * Convert to Euler angles (roll, pitch, yaw) in radians
   * Returns angles in ZYX convention
   */
  toEulerAngles(): { roll: number; pitch: number; yaw: number } {
    // Roll (rotation around X axis)
    const sinr_cosp = 2 * (this.w * this.x + this.y * this.z)
    const cosr_cosp = 1 - 2 * (this.x * this.x + this.y * this.y)
    const roll = Math.atan2(sinr_cosp, cosr_cosp)
    
    // Pitch (rotation around Y axis)
    const sinp = 2 * (this.w * this.y - this.z * this.x)
    const pitch = Math.abs(sinp) >= 1 
      ? Math.sign(sinp) * Math.PI / 2 
      : Math.asin(sinp)
    
    // Yaw (rotation around Z axis)
    const siny_cosp = 2 * (this.w * this.z + this.x * this.y)
    const cosy_cosp = 1 - 2 * (this.y * this.y + this.z * this.z)
    const yaw = Math.atan2(siny_cosp, cosy_cosp)
    
    return { roll, pitch, yaw }
  }

  /**
   * Convert to axis-angle representation
   */
  toAxisAngle(): { axis: { x: number; y: number; z: number }; angle: number } {
    const angle = 2 * Math.acos(Math.max(-1, Math.min(1, this.w)))
    const s = Math.sqrt(1 - this.w * this.w)
    
    if (s < 0.0001) {
      return { axis: { x: 1, y: 0, z: 0 }, angle: 0 }
    }
    
    return {
      axis: { x: this.x / s, y: this.y / s, z: this.z / s },
      angle
    }
  }

  /**
   * Rotate a vector by this quaternion
   */
  rotateVector(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const qv = new Quaternion(0, v.x, v.y, v.z)
    const rotated = this.multiply(qv).multiply(this.conjugate())
    
    return { x: rotated.x, y: rotated.y, z: rotated.z }
  }

  /**
   * Clone the quaternion
   */
  clone(): Quaternion {
    return new Quaternion(this.w, this.x, this.y, this.z)
  }

  /**
   * Check equality
   */
  equals(q: Quaternion, epsilon: number = 0.0001): boolean {
    return (
      Math.abs(this.w - q.w) < epsilon &&
      Math.abs(this.x - q.x) < epsilon &&
      Math.abs(this.y - q.y) < epsilon &&
      Math.abs(this.z - q.z) < epsilon
    )
  }

  /**
   * String representation
   */
  toString(): string {
    return `Quaternion(w: ${this.w.toFixed(4)}, x: ${this.x.toFixed(4)}, y: ${this.y.toFixed(4)}, z: ${this.z.toFixed(4)})`
  }
}
