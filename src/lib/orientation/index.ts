/**
 * Orientation Library
 * 
 * Provides quaternion-based sensor fusion for accurate 3D orientation tracking
 * using accelerometer and gyroscope data.
 */

export { Quaternion } from './Quaternion'
export { 
  OrientationFilter, 
  MotionPatternAnalyzer,
  type SensorData, 
  type OrientationState, 
  type OrientationFilterConfig 
} from './OrientationFilter'
