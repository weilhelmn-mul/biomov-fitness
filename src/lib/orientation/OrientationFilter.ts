/**
 * Orientation Filter using Quaternion-based Sensor Fusion
 * 
 * Combines accelerometer and gyroscope data using a complementary filter
 * to estimate 3D orientation without gimbal lock issues.
 * 
 * Algorithm:
 * 1. Integrate gyroscope rates to update quaternion (fast, but drifts)
 * 2. Calculate tilt quaternion from accelerometer (slow, but absolute reference)
 * 3. Blend using complementary filter: q = α * q_gyro + (1-α) * q_accel
 */

import { Quaternion } from './Quaternion'

export interface SensorData {
  // Acceleration including gravity (m/s²)
  accX: number
  accY: number
  accZ: number
  // Rotation rate (rad/s)
  gyroAlpha?: number  // Rotation around Z axis (yaw rate)
  gyroBeta?: number   // Rotation around X axis (roll rate)  
  gyroGamma?: number  // Rotation around Y axis (pitch rate)
  // Timestamp
  timestamp: number
}

export interface OrientationState {
  // Current orientation as quaternion
  quaternion: Quaternion
  // Euler angles in degrees
  roll: number
  pitch: number
  yaw: number
  // Angular velocity (deg/s)
  rollRate: number
  pitchRate: number
  yawRate: number
  // Confidence (0-1) based on acceleration magnitude
  confidence: number
  // Whether data is valid
  isValid: boolean
}

export interface OrientationFilterConfig {
  // Complementary filter gain (0-1, higher = more gyroscope trust)
  // Typical values: 0.95 - 0.99
  gyroGain: number
  // Threshold for acceleration magnitude to trust tilt estimate
  // Normal gravity is ~9.8 m/s²
  accelMinMagnitude: number
  accelMaxMagnitude: number
  // Gyroscope drift compensation rate
  driftCompensationRate: number
  // Enable/disable yaw tracking (false = relative yaw only)
  trackYaw: boolean
}

const DEFAULT_CONFIG: OrientationFilterConfig = {
  gyroGain: 0.98,
  accelMinMagnitude: 8.0,
  accelMaxMagnitude: 11.0,
  driftCompensationRate: 0.001,
  trackYaw: false // Yaw drifts without magnetometer
}

export class OrientationFilter {
  private quaternion: Quaternion
  private lastTimestamp: number | null
  private config: OrientationFilterConfig
  private gyroBias: { x: number; y: number; z: number }
  private calibrationSamples: number
  private isCalibrating: boolean
  private calibrationData: { x: number; y: number; z: number }[]

  constructor(config: Partial<OrientationFilterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.quaternion = new Quaternion(1, 0, 0, 0) // Identity
    this.lastTimestamp = null
    this.gyroBias = { x: 0, y: 0, z: 0 }
    this.calibrationSamples = 0
    this.isCalibrating = false
    this.calibrationData = []
  }

  /**
   * Start gyroscope bias calibration
   * Device should be stationary during calibration
   */
  startCalibration(): void {
    this.isCalibrating = true
    this.calibrationData = []
    this.gyroBias = { x: 0, y: 0, z: 0 }
  }

  /**
   * End calibration and compute bias
   */
  endCalibration(): void {
    if (this.calibrationData.length > 10) {
      // Calculate mean bias
      const sum = this.calibrationData.reduce(
        (acc, val) => ({ x: acc.x + val.x, y: acc.y + val.y, z: acc.z + val.z }),
        { x: 0, y: 0, z: 0 }
      )
      this.gyroBias = {
        x: sum.x / this.calibrationData.length,
        y: sum.y / this.calibrationData.length,
        z: sum.z / this.calibrationData.length
      }
    }
    this.isCalibrating = false
  }

  /**
   * Check if calibration is in progress
   */
  get isCalibratingGyro(): boolean {
    return this.isCalibrating
  }

  /**
   * Get calibration progress (0-100)
   */
  get calibrationProgress(): number {
    const targetSamples = 100
    return Math.min(100, (this.calibrationData.length / targetSamples) * 100)
  }

  /**
   * Reset orientation to identity
   */
  reset(): void {
    this.quaternion = new Quaternion(1, 0, 0, 0)
    this.lastTimestamp = null
  }

  /**
   * Set initial orientation from current accelerometer reading
   */
  setInitialOrientation(accX: number, accY: number, accZ: number): void {
    this.quaternion = Quaternion.fromAcceleration(accX, accY, accZ)
    this.lastTimestamp = null
  }

  /**
   * Update orientation with new sensor data
   */
  update(data: SensorData): OrientationState {
    const { accX, accY, accZ, gyroAlpha, gyroBeta, gyroGamma, timestamp } = data

    // Calculate delta time
    let dt = 0
    if (this.lastTimestamp !== null) {
      dt = (timestamp - this.lastTimestamp) / 1000 // Convert to seconds
      // Clamp dt to reasonable range (handle gaps in data)
      dt = Math.max(0.001, Math.min(0.1, dt))
    }
    this.lastTimestamp = timestamp

    // Collect calibration data if calibrating
    if (this.isCalibrating && gyroAlpha !== undefined && gyroBeta !== undefined && gyroGamma !== undefined) {
      this.calibrationData.push({
        x: gyroBeta,   // Roll rate
        y: gyroGamma,  // Pitch rate
        z: gyroAlpha   // Yaw rate
      })
    }

    // Calculate acceleration magnitude
    const accelMagnitude = Math.sqrt(accX * accX + accY * accY + accZ * accZ)
    
    // Determine if acceleration is reliable for tilt estimation
    const isAccelReliable = 
      accelMagnitude >= this.config.accelMinMagnitude &&
      accelMagnitude <= this.config.accelMaxMagnitude

    // Calculate confidence based on how close to 1g
    let confidence = 0
    if (isAccelReliable) {
      const idealGravity = 9.81
      const deviation = Math.abs(accelMagnitude - idealGravity) / idealGravity
      confidence = Math.max(0, 1 - deviation * 2)
    }

    // === Step 1: Update quaternion with gyroscope integration ===
    if (dt > 0 && gyroAlpha !== undefined && gyroBeta !== undefined && gyroGamma !== undefined) {
      // Convert rotation rates from deg/s to rad/s (assuming input is deg/s)
      // DeviceMotionEvent rotationRate is in deg/s
      const wx = (gyroBeta - this.gyroBias.x) * Math.PI / 180   // Roll rate (rad/s)
      const wy = (gyroGamma - this.gyroBias.y) * Math.PI / 180  // Pitch rate (rad/s)
      const wz = this.config.trackYaw ? (gyroAlpha - this.gyroBias.z) * Math.PI / 180 : 0 // Yaw rate

      // Create delta quaternion from angular velocity
      // q_delta = 0.5 * [0, wx, wy, wz] * q * dt
      // Using first-order approximation for small angles
      const halfDt = dt * 0.5
      const deltaQ = new Quaternion(
        1,
        wx * halfDt,
        wy * halfDt,
        wz * halfDt
      ).normalize()

      // Update quaternion: q_new = q_old * q_delta
      this.quaternion = this.quaternion.multiply(deltaQ).normalize()
    }

    // === Step 2: Apply accelerometer correction (tilt only) ===
    if (isAccelReliable && confidence > 0.1) {
      // Get tilt quaternion from accelerometer
      const accelQuat = Quaternion.fromAcceleration(accX, accY, accZ)
      
      // Extract current tilt from quaternion (remove yaw component)
      const currentEuler = this.quaternion.toEulerAngles()
      const tiltQuat = Quaternion.fromEulerAngles(currentEuler.roll, currentEuler.pitch, 0)
      
      // Calculate error between accelerometer tilt and current tilt
      // Use SLERP interpolation for smooth correction
      const alpha = this.config.gyroGain
      const correctionWeight = (1 - alpha) * confidence
      
      // Blend tilt quaternions
      const blendedTilt = tiltQuat.slerp(accelQuat, correctionWeight)
      
      // Reconstruct full orientation with original yaw
      const yawQuat = Quaternion.fromEulerAngles(0, 0, currentEuler.yaw)
      this.quaternion = yawQuat.multiply(blendedTilt).normalize()
    }

    // Convert to Euler angles
    const euler = this.quaternion.toEulerAngles()
    
    // Convert to degrees
    const roll = euler.roll * 180 / Math.PI
    const pitch = euler.pitch * 180 / Math.PI
    const yaw = euler.yaw * 180 / Math.PI

    // Calculate angular velocities in deg/s
    const rollRate = gyroBeta !== undefined ? gyroBeta - this.gyroBias.x * 180 / Math.PI : 0
    const pitchRate = gyroGamma !== undefined ? gyroGamma - this.gyroBias.y * 180 / Math.PI : 0
    const yawRate = gyroAlpha !== undefined ? gyroAlpha - this.gyroBias.z * 180 / Math.PI : 0

    return {
      quaternion: this.quaternion.clone(),
      roll,
      pitch,
      yaw,
      rollRate,
      pitchRate,
      yawRate,
      confidence,
      isValid: true
    }
  }

  /**
   * Get current orientation state without updating
   */
  getState(): OrientationState {
    const euler = this.quaternion.toEulerAngles()
    
    return {
      quaternion: this.quaternion.clone(),
      roll: euler.roll * 180 / Math.PI,
      pitch: euler.pitch * 180 / Math.PI,
      yaw: euler.yaw * 180 / Math.PI,
      rollRate: 0,
      pitchRate: 0,
      yawRate: 0,
      confidence: 1,
      isValid: this.lastTimestamp !== null
    }
  }

  /**
   * Get gyroscope bias values
   */
  getGyroBias(): { x: number; y: number; z: number } {
    return { ...this.gyroBias }
  }

  /**
   * Manually set gyroscope bias
   */
  setGyroBias(bias: { x: number; y: number; z: number }): void {
    this.gyroBias = { ...bias }
  }
}

/**
 * Utility functions for motion pattern analysis
 */
export class MotionPatternAnalyzer {
  private angleHistory: { time: number; angle: number; velocity: number }[]
  private maxHistoryLength: number

  constructor(maxHistoryLength: number = 100) {
    this.angleHistory = []
    this.maxHistoryLength = maxHistoryLength
  }

  /**
   * Add new angle sample
   */
  addSample(time: number, angle: number, velocity: number): void {
    this.angleHistory.push({ time, angle, velocity })
    if (this.angleHistory.length > this.maxHistoryLength) {
      this.angleHistory.shift()
    }
  }

  /**
   * Clear history
   */
  clear(): void {
    this.angleHistory = []
  }

  /**
   * Calculate range of motion
   */
  getRangeOfMotion(): number {
    if (this.angleHistory.length < 2) return 0
    
    const angles = this.angleHistory.map(h => h.angle)
    return Math.max(...angles) - Math.min(...angles)
  }

  /**
   * Detect movement direction changes (reversals)
   */
  getReversalCount(): number {
    if (this.angleHistory.length < 3) return 0
    
    let reversals = 0
    let lastSign = 0
    
    for (let i = 1; i < this.angleHistory.length; i++) {
      const velocity = this.angleHistory[i].velocity
      const sign = Math.sign(velocity)
      
      if (sign !== 0 && sign !== lastSign && lastSign !== 0) {
        reversals++
      }
      
      if (sign !== 0) lastSign = sign
    }
    
    return reversals
  }

  /**
   * Calculate average velocity
   */
  getAverageVelocity(): number {
    if (this.angleHistory.length === 0) return 0
    
    const sum = this.angleHistory.reduce((acc, h) => acc + Math.abs(h.velocity), 0)
    return sum / this.angleHistory.length
  }

  /**
   * Calculate peak velocity
   */
  getPeakVelocity(): number {
    if (this.angleHistory.length === 0) return 0
    
    return Math.max(...this.angleHistory.map(h => Math.abs(h.velocity)))
  }

  /**
   * Detect if motion is periodic (oscillating)
   */
  isPeriodicMotion(): { isPeriodic: boolean; frequency: number; amplitude: number } {
    if (this.angleHistory.length < 10) {
      return { isPeriodic: false, frequency: 0, amplitude: 0 }
    }

    const angles = this.angleHistory.map(h => h.angle)
    const mean = angles.reduce((a, b) => a + b, 0) / angles.length
    const variance = angles.reduce((acc, a) => acc + (a - mean) ** 2, 0) / angles.length
    
    // Check for oscillation
    let crossings = 0
    for (let i = 1; i < angles.length; i++) {
      if ((angles[i - 1] < mean && angles[i] >= mean) || 
          (angles[i - 1] >= mean && angles[i] < mean)) {
        crossings++
      }
    }

    // Estimate frequency (crossings / time span / 2)
    const timeSpan = (this.angleHistory[this.angleHistory.length - 1].time - 
                      this.angleHistory[0].time) / 1000
    
    const frequency = timeSpan > 0 ? crossings / (2 * timeSpan) : 0
    const amplitude = Math.sqrt(variance) * Math.sqrt(2) // RMS to amplitude
    
    // Motion is periodic if it has regular crossings and significant amplitude
    const isPeriodic = crossings >= 4 && amplitude > 5

    return { isPeriodic, frequency, amplitude }
  }

  /**
   * Get motion statistics
   */
  getStatistics(): {
    samples: number
    duration: number
    meanAngle: number
    stdAngle: number
    maxAngle: number
    minAngle: number
    rangeOfMotion: number
    meanVelocity: number
    peakVelocity: number
    reversals: number
  } {
    if (this.angleHistory.length === 0) {
      return {
        samples: 0,
        duration: 0,
        meanAngle: 0,
        stdAngle: 0,
        maxAngle: 0,
        minAngle: 0,
        rangeOfMotion: 0,
        meanVelocity: 0,
        peakVelocity: 0,
        reversals: 0
      }
    }

    const angles = this.angleHistory.map(h => h.angle)
    const velocities = this.angleHistory.map(h => h.velocity)
    const mean = angles.reduce((a, b) => a + b, 0) / angles.length
    const variance = angles.reduce((acc, a) => acc + (a - mean) ** 2, 0) / angles.length

    return {
      samples: this.angleHistory.length,
      duration: this.angleHistory[this.angleHistory.length - 1].time - this.angleHistory[0].time,
      meanAngle: mean,
      stdAngle: Math.sqrt(variance),
      maxAngle: Math.max(...angles),
      minAngle: Math.min(...angles),
      rangeOfMotion: this.getRangeOfMotion(),
      meanVelocity: this.getAverageVelocity(),
      peakVelocity: this.getPeakVelocity(),
      reversals: this.getReversalCount()
    }
  }
}
