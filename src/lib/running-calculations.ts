// ============================================================================
// RUNNING CALCULATIONS - Based on Jack Daniels' VDOT System
// ============================================================================

// Distance mapping in meters
export const DISTANCE_MAP: Record<string, number> = {
  '1500m': 1500,
  '1 Mile': 1609.344,
  '3k': 3000,
  '5k': 5000,
  '8k': 8000,
  '10k': 10000,
  '12k': 12000,
  '15k': 15000,
  '10 Mile': 16093.44,
  '20k': 20000,
  '1/2 Mar': 21097.5,
  '25k': 25000,
  '30k': 30000,
  'Marathon': 42195,
  '50k': 50000,
};

// Age grading factors (simplified)
export const AGE_FACTORS: Record<number, number> = {
  20: 1.00, 25: 0.99, 30: 0.97, 35: 0.95, 40: 0.93,
  45: 0.90, 50: 0.87, 55: 0.83, 60: 0.79, 65: 0.74,
  70: 0.70, 75: 0.65, 80: 0.60,
};

// Temperature adjustment factors (Fahrenheit)
export const TEMP_FACTORS: Record<number, number> = {
  50: 0.99, 55: 0.995, 60: 1.0, 65: 1.0075, 70: 1.015,
  75: 1.0225, 80: 1.03, 85: 1.0375, 90: 1.045, 95: 1.0525, 100: 1.06,
};

// Training zones with VDOT percentages
export const TRAINING_ZONES = [
  { name: 'E (Easy)', nameEs: 'E (Fácil)', percent: 0.65, description: 'Recovery runs, warm-up', descriptionEs: 'Trote recuperación, calentamiento' },
  { name: 'M (Marathon)', nameEs: 'M (Maratón)', percent: 0.75, description: 'Marathon pace runs', descriptionEs: 'Ritmo de maratón' },
  { name: 'T (Threshold)', nameEs: 'T (Umbral)', percent: 0.88, description: 'Tempo runs, cruise intervals', descriptionEs: 'Tempo runs, intervalos cruise' },
  { name: 'I (Interval)', nameEs: 'I (Intervalo)', percent: 0.95, description: 'VO2max intervals', descriptionEs: 'Intervalos VO2max' },
  { name: 'R (Repetition)', nameEs: 'R (Repetición)', percent: 1.03, description: 'Speed work, form drills', descriptionEs: 'Velocidad, técnica' },
];

// Intensity points per minute for each zone
export const INTENSITY_POINTS: Record<string, number> = {
  'E': 0.2,
  'M': 0.4,
  'T': 0.6,
  'I': 0.8,
  'R': 1.0,
};

// ============================================================================
// TIME CONVERSION FUNCTIONS
// ============================================================================

export function timeToSeconds(timeStr: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length !== 3) return null;
  
  const hours = parseInt(parts[0]) || 0;
  const mins = parseInt(parts[1]) || 0;
  const secs = parseInt(parts[2]) || 0;
  
  return hours * 3600 + mins * 60 + secs;
}

export function secondsToTime(seconds: number | null): string {
  if (seconds === null || seconds < 0 || !isFinite(seconds)) return '--:--:--';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function secondsToPace(seconds: number | null): string {
  if (seconds === null || seconds < 0 || !isFinite(seconds)) return '--:--';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// VDOT CALCULATIONS
// ============================================================================

export function calculateVDOT(distanceMeters: number, timeSeconds: number): number | null {
  if (!distanceMeters || !timeSeconds || timeSeconds <= 0) return null;
  
  // VDOT formula from Jack Daniels
  const v = distanceMeters / (timeSeconds / 60); // velocity in m/min
  const vdot = -4.6 + 0.182258 * v + 0.000104 * v * v;
  
  return Math.round(vdot * 10) / 10;
}

export function velocityFromVDOT(vdot: number): number | null {
  if (!vdot || vdot <= 0) return null;
  
  const a = 0.000104;
  const b = 0.182258;
  const c = -4.6 - vdot;
  const disc = b * b - 4 * a * c;
  
  if (disc < 0) return null;
  return (-b + Math.sqrt(disc)) / (2 * a);
}

export function paceFromVDOT(vdot: number, percent: number, unit: 'km' | 'mile' = 'km'): number | null {
  if (!vdot || !percent) return null;
  
  const targetVO2 = vdot * percent;
  const v = velocityFromVDOT(targetVO2);
  if (!v) return null;
  
  // seconds per km
  let paceSeconds = 1000 / v * 60;
  
  // Convert to miles if needed
  if (unit === 'mile') {
    paceSeconds *= 1.609344;
  }
  
  return paceSeconds;
}

// ============================================================================
// RACE PROJECTIONS
// ============================================================================

export function projectTime(baseDistM: number, baseTimeSec: number, targetDistM: number): number | null {
  if (!baseDistM || !baseTimeSec || !targetDistM) return null;
  
  // Riegel's formula: T2 = T1 * (D2/D1)^1.06
  return baseTimeSec * Math.pow(targetDistM / baseDistM, 1.06);
}

export function projectRaceTimes(baseDistance: number, baseTime: number): Array<{ distance: string; meters: number; time: string; pace: string }> {
  const results: Array<{ distance: string; meters: number; time: string; pace: string }> = [];
  
  const distances = [
    { name: '1500m', meters: 1500 },
    { name: '1 Mile', meters: 1609.344 },
    { name: '3k', meters: 3000 },
    { name: '5k', meters: 5000 },
    { name: '8k', meters: 8000 },
    { name: '10k', meters: 10000 },
    { name: '15k', meters: 15000 },
    { name: '10 Mile', meters: 16093.44 },
    { name: '1/2 Mar', meters: 21097.5 },
    { name: 'Marathon', meters: 42195 },
  ];
  
  distances.forEach(dist => {
    const projTime = projectTime(baseDistance, baseTime, dist.meters);
    if (projTime) {
      const paceSeconds = projTime / (dist.meters / 1000);
      results.push({
        distance: dist.name,
        meters: dist.meters,
        time: secondsToTime(projTime),
        pace: secondsToPace(paceSeconds),
      });
    }
  });
  
  return results;
}

// ============================================================================
// HEART RATE ZONES
// ============================================================================

export function calculateHRZones(hrMax: number, hrRest: number): Array<{ zone: string; min: number; max: number; percent: string }> {
  if (!hrMax || !hrRest || hrMax <= hrRest) return [];
  
  const hrReserve = hrMax - hrRest;
  
  return [
    { zone: 'Z1 (Recovery)', min: Math.round(hrRest + hrReserve * 0.50), max: Math.round(hrRest + hrReserve * 0.60), percent: '50-60%' },
    { zone: 'Z2 (Aerobic)', min: Math.round(hrRest + hrReserve * 0.60), max: Math.round(hrRest + hrReserve * 0.70), percent: '60-70%' },
    { zone: 'Z3 (Tempo)', min: Math.round(hrRest + hrReserve * 0.70), max: Math.round(hrRest + hrReserve * 0.80), percent: '70-80%' },
    { zone: 'Z4 (Threshold)', min: Math.round(hrRest + hrReserve * 0.80), max: Math.round(hrRest + hrReserve * 0.90), percent: '80-90%' },
    { zone: 'Z5 (VO2max)', min: Math.round(hrRest + hrReserve * 0.90), max: hrMax, percent: '90-100%' },
  ];
}

// ============================================================================
// POWER ZONES (Running Power)
// ============================================================================

export function calculatePowerZones(weight: number, vdot: number): Array<{ zone: string; min: number; max: number }> {
  if (!weight || !vdot) return [];
  
  // Approximate power at threshold based on VDOT
  // This is a simplified estimation
  const thresholdPower = Math.round(weight * (3.5 + vdot * 0.1));
  
  return [
    { zone: 'Z1 (Recovery)', min: Math.round(thresholdPower * 0.55), max: Math.round(thresholdPower * 0.75) },
    { zone: 'Z2 (Endurance)', min: Math.round(thresholdPower * 0.75), max: Math.round(thresholdPower * 0.88) },
    { zone: 'Z3 (Tempo)', min: Math.round(thresholdPower * 0.88), max: Math.round(thresholdPower * 0.94) },
    { zone: 'Z4 (Threshold)', min: Math.round(thresholdPower * 0.94), max: Math.round(thresholdPower * 1.03) },
    { zone: 'Z5 (VO2max)', min: Math.round(thresholdPower * 1.03), max: Math.round(thresholdPower * 1.15) },
  ];
}

// ============================================================================
// ADJUSTMENTS
// ============================================================================

export function adjustForTemperature(baseTimeSec: number, tempF: number): number {
  const factor = TEMP_FACTORS[tempF] || 1.0;
  return baseTimeSec * factor;
}

export function adjustForWeight(baseTimeSec: number, currentWeight: number, targetWeight: number, vdot: number): number {
  if (!currentWeight || !targetWeight || !vdot) return baseTimeSec;
  const newVDOT = currentWeight * vdot / targetWeight;
  return baseTimeSec * Math.pow(vdot / newVDOT, 0.83);
}

export function adjustForAge(vdot: number, age: number): number {
  // Find closest age factor
  const ages = Object.keys(AGE_FACTORS).map(Number).sort((a, b) => a - b);
  let closestAge = ages[0];
  
  for (const a of ages) {
    if (Math.abs(a - age) < Math.abs(closestAge - age)) {
      closestAge = a;
    }
  }
  
  const factor = AGE_FACTORS[closestAge] || 1.0;
  return vdot * factor;
}

// ============================================================================
// BMI CALCULATION
// ============================================================================

export function calculateBMI(height: number, weight: number, metric: boolean): number | null {
  if (!height || !weight) return null;
  
  if (metric) {
    // height in cm, weight in kg
    return weight / Math.pow(height / 100, 2);
  } else {
    // height in in, weight in lb
    return (weight / Math.pow(height, 2)) * 703;
  }
}

// ============================================================================
// AGE CALCULATION
// ============================================================================

export function calculateAge(birthdate: string): number | null {
  if (!birthdate) return null;
  
  const birth = new Date(birthdate);
  const today = new Date();
  
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age >= 0 && age < 110 ? age : null;
}

// ============================================================================
// INTENSITY POINTS CALCULATION
// ============================================================================

export function calculateIntensityPoints(zone: string, minutes: number): number {
  const pointsPerMin = INTENSITY_POINTS[zone] || 0;
  return Math.round(pointsPerMin * minutes * 10) / 10;
}

export function getWeeklyIntensityTarget(vdot: number): { min: number; max: number; optimal: number } {
  // Based on Jack Daniels' guidelines
  if (vdot < 30) return { min: 30, max: 50, optimal: 40 };
  if (vdot < 40) return { min: 40, max: 60, optimal: 50 };
  if (vdot < 50) return { min: 50, max: 80, optimal: 65 };
  if (vdot < 60) return { min: 60, max: 100, optimal: 80 };
  return { min: 80, max: 120, optimal: 100 };
}
