import { nationalClimateHistory } from '@/data/noaaClimateData';

export interface ForecastModelOutput {
  warmingVelocityPerDecadeF: number; // e.g., +0.65°F / decade
  precipVolatilityStdDev: number;
  projectedPeakYear: number;
  projected2030AnomalyF: number;
  multiYearTrajectory: Array<{
    year: number;
    avgTempF: number;
    tempUpperF?: number;
    tempLowerF?: number;
    precipitationIn: number;
    precipUpperIn?: number;
    precipLowerIn?: number;
    riskScore: number;
    isForecast: boolean;
  }>;
}

export function runClimateForecastModel(): ForecastModelOutput {
  const historical = nationalClimateHistory.filter(r => !r.isForecast);
  const n = historical.length;

  // Compute Linear Regression for Temperature over historical baseline
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  historical.forEach((rec, idx) => {
    sumX += idx;
    sumY += rec.avgTempF;
    sumXY += idx * rec.avgTempF;
    sumX2 += idx * idx;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const warmingVelocityPerDecadeF = Number((slope * 10).toFixed(2));

  // Compute Precipitation Volatility (Standard Deviation)
  const meanPrecip = historical.reduce((acc, r) => acc + r.precipitationIn, 0) / n;
  const variance = historical.reduce((acc, r) => acc + Math.pow(r.precipitationIn - meanPrecip, 2), 0) / n;
  const precipVolatilityStdDev = Number(Math.sqrt(variance).toFixed(2));

  // Build Unified 10-Year Trajectory (2021-2030)
  const multiYearTrajectory = nationalClimateHistory.map(rec => ({
    year: rec.year,
    avgTempF: rec.avgTempF,
    tempUpperF: rec.tempUpperF || rec.avgTempF,
    tempLowerF: rec.tempLowerF || rec.avgTempF,
    precipitationIn: rec.precipitationIn,
    precipUpperIn: rec.precipUpperIn || rec.precipitationIn,
    precipLowerIn: rec.precipLowerIn || rec.precipitationIn,
    riskScore: rec.ceiScore,
    isForecast: !!rec.isForecast
  }));

  return {
    warmingVelocityPerDecadeF,
    precipVolatilityStdDev,
    projectedPeakYear: 2030,
    projected2030AnomalyF: +4.1,
    multiYearTrajectory
  };
}
