import { ZoneData } from '@/data/mockCityData';

export function calculateHeatRiskScore(zone: ZoneData): number {
  // 1. Base Heat Factor (35%)
  // Normalize temp from 25 to 45 (max)
  const tempFactor = Math.min(Math.max((zone.temperature - 25) / 20, 0), 1);
  const humidityFactor = zone.humidity / 100;
  // Combine temp and humidity for a heat index approximation
  const heatFactor = (tempFactor * 0.7 + humidityFactor * 0.3) * 35;

  // 2. Vulnerable Population Factor (25%)
  // Normalize elderly pop from 0 to 30%
  const elderlyFactor = Math.min(zone.elderly_population / 30, 1);
  // Normalize pop density from 0 to 15000
  const densityFactor = Math.min(zone.population_density / 15000, 1);
  const popFactor = ((elderlyFactor * 0.6) + (densityFactor * 0.4)) * 25;

  // 3. Infrastructure Factor (20%)
  let infraMultiplier = 0;
  if (zone.cooling_capacity === 'Low') infraMultiplier = 1;
  else if (zone.cooling_capacity === 'Medium') infraMultiplier = 0.5;
  else infraMultiplier = 0;
  
  const infraFactor = infraMultiplier * 20;

  // 4. Environmental Factor (20%)
  // Normalize tree coverage from 40% (good) down to 0% (bad)
  const treeMultiplier = 1 - Math.min(zone.tree_coverage / 40, 1);
  const envFactor = treeMultiplier * 20;

  const totalScore = heatFactor + popFactor + infraFactor + envFactor;
  return Math.round(totalScore);
}

export function getRiskLevel(score: number): 'Low' | 'Elevated' | 'High' | 'Critical' {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Elevated';
  return 'Low';
}

export function getRiskColor(score: number): string {
  if (score >= 80) return '#ef4444'; // red-500
  if (score >= 60) return '#ea580c'; // orange-600
  if (score >= 40) return '#d97706'; // amber-600
  return '#16a34a'; // green-600
}
