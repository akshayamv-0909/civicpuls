import { StateClimateProfile, AnnualNationalRecord } from '@/data/noaaClimateData';

export type ClimateHazardType = 
  | 'overall' 
  | 'heat' 
  | 'cold' 
  | 'flood' 
  | 'drought' 
  | 'storm' 
  | 'tornado' 
  | 'hurricane' 
  | 'wildfire' 
  | 'wind' 
  | 'snow'
  | 'temp_anomaly'
  | 'precip_anomaly';

export type EmergencyRiskTier = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH' | 'EXTREME';

export interface NDRFAlert {
  id: string;
  stateCode: string;
  stateName: string;
  hazard: string;
  severity: EmergencyRiskTier;
  headline: string;
  metric: string;
  timestamp: string;
  source: string;
}

export function getRiskTier(score: number | null): EmergencyRiskTier {
  if (score === null) return 'LOW';
  if (score >= 90) return 'EXTREME';
  if (score >= 80) return 'VERY HIGH';
  if (score >= 65) return 'HIGH';
  if (score >= 45) return 'MODERATE';
  return 'LOW';
}

export function getRiskTierColor(tier: EmergencyRiskTier): string {
  switch (tier) {
    case 'EXTREME': return '#7f1d1d'; // Dark Red / Maroon
    case 'VERY HIGH': return '#dc2626'; // Red
    case 'HIGH': return '#ea580c'; // Orange
    case 'MODERATE': return '#eab308'; // Amber / Yellow
    case 'LOW': return '#16a34a'; // Green
  }
}

export function getScoreColor(score: number | null): string {
  if (score === null) return '#64748b';
  return getRiskTierColor(getRiskTier(score));
}

// Get the score for a specific hazard layer
export function getHazardScore(state: StateClimateProfile, layer: ClimateHazardType): number {
  switch (layer) {
    case 'overall': return state.overallRisk;
    case 'heat': return state.heatRisk;
    case 'cold': return state.coldRisk;
    case 'flood': return state.floodRisk;
    case 'drought': return state.droughtRisk;
    case 'storm': return state.stormRisk;
    case 'tornado': return state.tornadoRisk;
    case 'hurricane': return state.hurricaneRisk;
    case 'wildfire': return state.wildfireRisk;
    case 'wind': return state.windRisk;
    case 'snow': return state.snowRisk;
    case 'temp_anomaly': return Math.min(100, Math.max(0, Math.round((state.tempAnomalyF / 5.0) * 100)));
    case 'precip_anomaly': return Math.min(100, Math.max(0, Math.round(50 + (state.precipAnomalyIn / 8.0) * 50)));
  }
}

// Automated Fluctuation Detector
export function detectClimateFluctuations(records: AnnualNationalRecord[]) {
  const fluctuations = [];
  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1];
    const curr = records[i];

    const tempDelta = Number((curr.avgTempF - prev.avgTempF).toFixed(1));
    const precipDelta = Number((curr.precipitationIn - prev.precipitationIn).toFixed(2));

    if (Math.abs(tempDelta) >= 0.8 || Math.abs(precipDelta) >= 1.5) {
      fluctuations.push({
        years: `${prev.year} ➔ ${curr.year}`,
        tempDelta,
        precipDelta,
        description: `Significant shift: ${tempDelta > 0 ? '+' : ''}${tempDelta}°F temperature shift, ${precipDelta > 0 ? '+' : ''}${precipDelta} in precipitation swing.`,
        isRecord: curr.tempRank.includes('WARMEST') || curr.tempRank.includes('Record')
      });
    }
  }
  return fluctuations;
}

// Generate Live Threshold-Driven NDRF Emergency Alerts
export function generateNDRFAlerts(states: StateClimateProfile[]): NDRFAlert[] {
  const alerts: NDRFAlert[] = [];

  states.forEach(state => {
    // Extreme Heat Alert
    if (state.heatRisk >= 90) {
      alerts.push({
        id: `alert-heat-${state.stateCode}`,
        stateCode: state.stateCode,
        stateName: state.name,
        hazard: 'Extreme Heat',
        severity: 'EXTREME',
        headline: `${state.name}: Critical Heat Dome & Thermal Stress Warning`,
        metric: `Anomaly: ${state.tempAnomalyF > 0 ? '+' : ''}${state.tempAnomalyF}°F (${state.extremeHeatDays} days ≥ 100°F)`,
        timestamp: 'NOAA NCEI Active Feed',
        source: 'NOAA Weather Prediction Center'
      });
    }

    // Flash Flood & Atmospheric River
    if (state.floodRisk >= 85) {
      alerts.push({
        id: `alert-flood-${state.stateCode}`,
        stateCode: state.stateCode,
        stateName: state.name,
        hazard: 'Catastrophic Flood',
        severity: 'EXTREME',
        headline: `${state.name}: High Risk Basin Overflow & Flash Flooding`,
        metric: `Precip Anomaly: +${state.precipAnomalyIn} inches (${state.extremeRainDays} peak rainfall days)`,
        timestamp: 'NOAA NCEI Active Feed',
        source: 'NOAA River Forecast Centers'
      });
    }

    // Megadrought Alert
    if (state.droughtRisk >= 88) {
      alerts.push({
        id: `alert-drought-${state.stateCode}`,
        stateCode: state.stateCode,
        stateName: state.name,
        hazard: 'Extreme Drought',
        severity: 'VERY HIGH',
        headline: `${state.name}: Severe Soil Moisture & Reservoir Deficit`,
        metric: `PDSI: ${state.droughtPdsi} (Severe hydrological drought)`,
        timestamp: 'NOAA / US Drought Monitor',
        source: 'National Drought Mitigation Center'
      });
    }

    // Wildfire Threat
    if (state.wildfireRisk >= 88) {
      alerts.push({
        id: `alert-fire-${state.stateCode}`,
        stateCode: state.stateCode,
        stateName: state.name,
        hazard: 'Wildfire Hazard',
        severity: 'EXTREME',
        headline: `${state.name}: Extreme Wildfire Potential & Fuel Aridity`,
        metric: `${state.wildfireAcresBurnedK.toLocaleString()}K acres historical burn exposure`,
        timestamp: 'NOAA Hazard Mapping System',
        source: 'National Interagency Fire Center'
      });
    }

    // Severe Tornado / Storm
    if (state.tornadoRisk >= 85) {
      alerts.push({
        id: `alert-tor-${state.stateCode}`,
        stateCode: state.stateCode,
        stateName: state.name,
        hazard: 'Severe Tornado',
        severity: 'VERY HIGH',
        headline: `${state.name}: Elevated Severe Convective Storm & Tornado Track`,
        metric: `Annual Tornadoes: ${state.annualTornadoes} (Elevated cluster)`,
        timestamp: 'NOAA Storm Prediction Center',
        source: 'NOAA SPC Mesoscale Outlook'
      });
    }

    // Hurricane Watch
    if (state.hurricaneRisk >= 85) {
      alerts.push({
        id: `alert-hurr-${state.stateCode}`,
        stateCode: state.stateCode,
        stateName: state.name,
        hazard: 'Tropical Cyclone',
        severity: 'EXTREME',
        headline: `${state.name}: Coastal Hurricane & Rapid Intensification Vulnerability`,
        metric: `Sea Surface Temp Anomaly: +1.8°C Gulf/Atlantic corridor`,
        timestamp: 'NOAA National Hurricane Center',
        source: 'NOAA NHC Tropical Outlook'
      });
    }
  });

  return alerts;
}
