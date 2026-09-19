export interface AnnualNationalRecord {
  year: number;
  avgTempF: number;
  tempAnomalyF: number;
  tempRank: string;
  precipitationIn: number;
  precipAnomalyIn: number;
  climateRisk: 'HIGH' | 'VERY HIGH' | 'EXTREME';
  ceiScore: number; // Climate Extremes Index (0-100)
  disasterCount: number; // Billion-dollar disaster count
  disasterCostBillion: number;
  majorEvents: string[];
  isForecast?: boolean;
  tempUpperF?: number;
  tempLowerF?: number;
  precipUpperIn?: number;
  precipLowerIn?: number;
}

export interface StateClimateProfile {
  id: string;
  name: string;
  stateCode: string;
  region: 'West' | 'Southwest' | 'Southeast' | 'Northeast' | 'Midwest' | 'Northwest' | 'Central';
  lat: number;
  lng: number;
  population: number;
  
  // Baseline (2021-2025 Average)
  historicalAvgTempF: number;
  currentTempF: number;
  tempAnomalyF: number;
  historicalPrecipIn: number;
  currentPrecipIn: number;
  precipAnomalyIn: number;

  // Hazard Indicators (0-100)
  heatRisk: number;
  coldRisk: number;
  floodRisk: number;
  droughtRisk: number;
  stormRisk: number;
  tornadoRisk: number;
  hurricaneRisk: number;
  wildfireRisk: number;
  windRisk: number;
  snowRisk: number;
  overallRisk: number;

  // Specific Metrics
  droughtPdsi: number; // Palmer Drought Severity Index (-6 to +6)
  annualTornadoes: number;
  wildfireAcresBurnedK: number;
  extremeHeatDays: number;
  extremeRainDays: number;

  // Significant Fluctuation Status
  hasFluctuation: boolean;
  fluctuationDetail?: string;

  // Multi-Year History (2021-2025)
  yearlyTemps: number[]; // 2021..2025
  yearlyPrecip: number[]; // 2021..2025
  yearlyRisk: number[]; // 2021..2025

  // Projected 2026-2030
  projectedTemps: number[]; // 2026..2030
  projectedRisk: number[]; // 2026..2030
}

export interface ClimateEventTimeline {
  year: number;
  date: string;
  title: string;
  state: string;
  hazardType: 'Heatwave' | 'Hurricane' | 'Flooding' | 'Wildfire' | 'Tornado' | 'Drought' | 'Winter Storm';
  severity: 'HIGH' | 'VERY HIGH' | 'EXTREME';
  measurement: string;
  source: string;
}

// CONUS 5-Year Historical + 5-Year Predictive Forecast (2021–2030)
export const nationalClimateHistory: AnnualNationalRecord[] = [
  {
    year: 2021,
    avgTempF: 54.5,
    tempAnomalyF: +2.5,
    tempRank: '4th warmest',
    precipitationIn: 30.48,
    precipAnomalyIn: +0.54,
    climateRisk: 'HIGH',
    ceiScore: 68,
    disasterCount: 20,
    disasterCostBillion: 153.0,
    majorEvents: [
      'Pacific Northwest Extreme Heatwave (116°F Portland)',
      'Severe Western Megadrought',
      'Texas Winter Storm Uri Grid Freeze',
      'Hurricane Ida (Category 4 Gulf / Northeast)',
      'Major Western Wildfire Season (Bootleg Fire)'
    ]
  },
  {
    year: 2022,
    avgTempF: 53.4,
    tempAnomalyF: +1.4,
    tempRank: 'Warmest third',
    precipitationIn: 28.35,
    precipAnomalyIn: -1.59,
    climateRisk: 'HIGH',
    ceiScore: 71,
    disasterCount: 18,
    disasterCostBillion: 178.8,
    majorEvents: [
      'Severe Western Drought & Lake Mead Historic Lows',
      'Hurricane Ian (Category 4 Southwest Florida landfall)',
      'Central & Southern US Heatwaves',
      'Kentucky Flash Flood Catastrophe',
      'Historic Western Water Restrictions'
    ]
  },
  {
    year: 2023,
    avgTempF: 54.4,
    tempAnomalyF: +2.4,
    tempRank: '5th warmest',
    precipitationIn: 29.46,
    precipAnomalyIn: -0.48,
    climateRisk: 'VERY HIGH',
    ceiScore: 82,
    disasterCount: 28,
    disasterCostBillion: 92.9,
    majorEvents: [
      'Historic Southwest Heat: Phoenix 31 Consecutive Days ≥ 110°F',
      'Deadly Maui Wildfire (Lahaina)',
      'Severe Texas Summer Heat Dome (115°F+)',
      'Midwest Tornado Outbreaks & Severe Derecho',
      'Northeast Extreme Atmospheric River Flooding'
    ]
  },
  {
    year: 2024,
    avgTempF: 55.5,
    tempAnomalyF: +3.5,
    tempRank: 'WARMEST ON RECORD',
    precipitationIn: 31.58,
    precipAnomalyIn: +1.66,
    climateRisk: 'EXTREME',
    ceiScore: 94,
    disasterCount: 27,
    disasterCostBillion: 185.0,
    majorEvents: [
      'Warmest Year in 130-Year US Climate Record (+3.5°F Anomaly)',
      'Hurricane Helene (Historic Southern Appalachian Catastrophic Flood)',
      'Hurricane Milton (Rapidly Intensified Gulf Coast Impact)',
      '1,735+ Confirmed Tornadoes Nationwide',
      'Record-Breaking Heat Domes across 28 States'
    ]
  },
  {
    year: 2025,
    avgTempF: 54.6,
    tempAnomalyF: +2.6,
    tempRank: '4th warmest',
    precipitationIn: 29.19,
    precipAnomalyIn: -0.73,
    climateRisk: 'VERY HIGH',
    ceiScore: 85,
    disasterCount: 24,
    disasterCostBillion: 140.0,
    majorEvents: [
      'Texas Catastrophic Flash Flooding',
      'California Wildfire Flare-ups & Offshore Santa Ana Winds',
      'Over 1,559 Confirmed Tornadoes',
      'Severe Regional Drought across Central Plains',
      'Extreme Year-to-Year Precipitation Swings (-2.39 in vs 2024)'
    ]
  },
  // Predictive Forecast Cones (2026–2030)
  {
    year: 2026,
    avgTempF: 54.9,
    tempAnomalyF: +2.9,
    tempRank: 'Projected Top 3',
    precipitationIn: 29.85,
    precipAnomalyIn: -0.07,
    climateRisk: 'VERY HIGH',
    ceiScore: 86,
    disasterCount: 25,
    disasterCostBillion: 160.0,
    isForecast: true,
    tempUpperF: 55.8,
    tempLowerF: 54.2,
    precipUpperIn: 32.1,
    precipLowerIn: 27.6,
    majorEvents: [
      'Projected: Escalated Desert Southwest Summer Duration (+8 days)',
      'Projected: High Gulf Sea Surface Temp Hurricane Intensification',
      'Projected: Midwest Spring Convective Storm Surge'
    ]
  },
  {
    year: 2027,
    avgTempF: 55.2,
    tempAnomalyF: +3.2,
    tempRank: 'Projected Top 2',
    precipitationIn: 30.75,
    precipAnomalyIn: +0.83,
    climateRisk: 'VERY HIGH',
    ceiScore: 89,
    disasterCount: 26,
    disasterCostBillion: 175.0,
    isForecast: true,
    tempUpperF: 56.3,
    tempLowerF: 54.4,
    precipUpperIn: 33.4,
    precipLowerIn: 28.1,
    majorEvents: [
      'Projected: Compound Drought-Wildfire Volatility in Western US',
      'Projected: Coastal High-Tide Flood Frequency Doubling',
      'Projected: Multi-State Wet-Bulb Heat Stress Advisories'
    ]
  },
  {
    year: 2028,
    avgTempF: 55.7,
    tempAnomalyF: +3.7,
    tempRank: 'Projected Record Threat',
    precipitationIn: 31.90,
    precipAnomalyIn: +1.98,
    climateRisk: 'EXTREME',
    ceiScore: 96,
    disasterCount: 29,
    disasterCostBillion: 198.0,
    isForecast: true,
    tempUpperF: 56.9,
    tempLowerF: 54.7,
    precipUpperIn: 34.8,
    precipLowerIn: 28.9,
    majorEvents: [
      'Projected: Multi-Region Severe Convective Storm Outbreaks',
      'Projected: Extreme Atmospheric River Floods along Pacific Coast',
      'Projected: Record Thermal Expansion of Urban Heat Islands'
    ]
  },
  {
    year: 2029,
    avgTempF: 55.4,
    tempAnomalyF: +3.4,
    tempRank: 'Projected High',
    precipitationIn: 28.90,
    precipAnomalyIn: -1.02,
    climateRisk: 'VERY HIGH',
    ceiScore: 90,
    disasterCount: 26,
    disasterCostBillion: 165.0,
    isForecast: true,
    tempUpperF: 56.5,
    tempLowerF: 54.3,
    precipUpperIn: 32.2,
    precipLowerIn: 26.8,
    majorEvents: [
      'Projected: Flash Drought Escalation across Agricultural Belt',
      'Projected: Extended Fire Season in Intermountain West',
      'Projected: Extreme Heat Index Spikes in Southern Corridors'
    ]
  },
  {
    year: 2030,
    avgTempF: 56.1,
    tempAnomalyF: +4.1,
    tempRank: 'Decade Peak Projection',
    precipitationIn: 32.40,
    precipAnomalyIn: +2.48,
    climateRisk: 'EXTREME',
    ceiScore: 98,
    disasterCount: 31,
    disasterCostBillion: 220.0,
    isForecast: true,
    tempUpperF: 57.5,
    tempLowerF: 54.8,
    precipUpperIn: 35.6,
    precipLowerIn: 29.2,
    majorEvents: [
      'Projected: Climate Anomaly Baseline Exceeding +4.0°F CONUS',
      'Projected: Unprecedented Compound Multi-Hazard Convergence',
      'Projected: Urgent Municipal Hardening & Infrastructure Upgrades'
    ]
  }
];

// State-by-State Climate Profiles (Representative Multi-Hazard Data)
export const stateClimateProfiles: StateClimateProfile[] = [
  {
    id: 'CA',
    name: 'California',
    stateCode: 'CA',
    region: 'West',
    lat: 36.7783,
    lng: -119.4179,
    population: 39029342,
    historicalAvgTempF: 59.4,
    currentTempF: 62.1,
    tempAnomalyF: +2.7,
    historicalPrecipIn: 22.2,
    currentPrecipIn: 26.4,
    precipAnomalyIn: +4.2,
    heatRisk: 86,
    coldRisk: 22,
    floodRisk: 82,
    droughtRisk: 88,
    stormRisk: 45,
    tornadoRisk: 12,
    hurricaneRisk: 15,
    wildfireRisk: 95,
    windRisk: 78,
    snowRisk: 65,
    overallRisk: 91,
    droughtPdsi: -2.8,
    annualTornadoes: 11,
    wildfireAcresBurnedK: 1200,
    extremeHeatDays: 44,
    extremeRainDays: 14,
    hasFluctuation: true,
    fluctuationDetail: 'Precipitation swing +4.2 in after severe drought; extreme wildfire vulnerability persists.',
    yearlyTemps: [60.8, 61.2, 61.9, 62.8, 62.1],
    yearlyPrecip: [14.2, 16.5, 31.8, 28.6, 26.4],
    yearlyRisk: [88, 92, 85, 94, 91],
    projectedTemps: [62.6, 63.0, 63.7, 63.4, 64.2],
    projectedRisk: [92, 93, 97, 95, 99]
  },
  {
    id: 'TX',
    name: 'Texas',
    stateCode: 'TX',
    region: 'Southwest',
    lat: 31.9686,
    lng: -99.9018,
    population: 30029572,
    historicalAvgTempF: 65.2,
    currentTempF: 68.8,
    tempAnomalyF: +3.6,
    historicalPrecipIn: 28.9,
    currentPrecipIn: 32.1,
    precipAnomalyIn: +3.2,
    heatRisk: 94,
    coldRisk: 58,
    floodRisk: 89,
    droughtRisk: 76,
    stormRisk: 92,
    tornadoRisk: 96,
    hurricaneRisk: 88,
    wildfireRisk: 72,
    windRisk: 85,
    snowRisk: 30,
    overallRisk: 95,
    droughtPdsi: -1.9,
    annualTornadoes: 152,
    wildfireAcresBurnedK: 850,
    extremeHeatDays: 58,
    extremeRainDays: 19,
    hasFluctuation: true,
    fluctuationDetail: '2023–2024 record heat jump (+1.4°F) followed by catastrophic 2025 flood events.',
    yearlyTemps: [66.5, 67.2, 68.1, 69.5, 68.8],
    yearlyPrecip: [25.4, 24.1, 26.8, 33.4, 32.1],
    yearlyRisk: [86, 89, 93, 98, 95],
    projectedTemps: [69.2, 69.6, 70.3, 70.0, 70.8],
    projectedRisk: [96, 97, 99, 98, 100]
  },
  {
    id: 'FL',
    name: 'Florida',
    stateCode: 'FL',
    region: 'Southeast',
    lat: 27.6648,
    lng: -81.5158,
    population: 22244823,
    historicalAvgTempF: 70.8,
    currentTempF: 73.9,
    tempAnomalyF: +3.1,
    historicalPrecipIn: 54.2,
    currentPrecipIn: 58.7,
    precipAnomalyIn: +4.5,
    heatRisk: 91,
    coldRisk: 10,
    floodRisk: 96,
    droughtRisk: 35,
    stormRisk: 88,
    tornadoRisk: 74,
    hurricaneRisk: 99,
    wildfireRisk: 42,
    windRisk: 92,
    snowRisk: 0,
    overallRisk: 96,
    droughtPdsi: +1.2,
    annualTornadoes: 66,
    wildfireAcresBurnedK: 120,
    extremeHeatDays: 62,
    extremeRainDays: 28,
    hasFluctuation: true,
    fluctuationDetail: 'Compound major hurricanes (Helene & Milton) driven by record Gulf sea surface temperatures.',
    yearlyTemps: [72.1, 72.8, 73.4, 74.5, 73.9],
    yearlyPrecip: [52.1, 55.8, 56.4, 61.2, 58.7],
    yearlyRisk: [84, 94, 88, 99, 96],
    projectedTemps: [74.2, 74.6, 75.3, 75.0, 75.8],
    projectedRisk: [97, 98, 100, 99, 100]
  },
  {
    id: 'AZ',
    name: 'Arizona',
    stateCode: 'AZ',
    region: 'Southwest',
    lat: 34.0489,
    lng: -111.0937,
    population: 7359197,
    historicalAvgTempF: 60.5,
    currentTempF: 64.7,
    tempAnomalyF: +4.2,
    historicalPrecipIn: 12.6,
    currentPrecipIn: 9.4,
    precipAnomalyIn: -3.2,
    heatRisk: 99,
    coldRisk: 18,
    floodRisk: 52,
    droughtRisk: 96,
    stormRisk: 55,
    tornadoRisk: 8,
    hurricaneRisk: 5,
    wildfireRisk: 88,
    windRisk: 65,
    snowRisk: 25,
    overallRisk: 94,
    droughtPdsi: -4.1,
    annualTornadoes: 4,
    wildfireAcresBurnedK: 450,
    extremeHeatDays: 74,
    extremeRainDays: 6,
    hasFluctuation: true,
    fluctuationDetail: 'Phoenix recorded historic 31-day streak ≥ 110°F with severe drought deficit (-3.2 in).',
    yearlyTemps: [62.4, 63.1, 64.8, 65.6, 64.7],
    yearlyPrecip: [10.2, 9.8, 8.4, 11.1, 9.4],
    yearlyRisk: [89, 91, 97, 98, 94],
    projectedTemps: [65.2, 65.8, 66.5, 66.2, 67.1],
    projectedRisk: [96, 98, 100, 99, 100]
  },
  {
    id: 'WA',
    name: 'Washington',
    stateCode: 'WA',
    region: 'Northwest',
    lat: 47.7511,
    lng: -120.7401,
    population: 7785786,
    historicalAvgTempF: 48.3,
    currentTempF: 50.6,
    tempAnomalyF: +2.3,
    historicalPrecipIn: 38.4,
    currentPrecipIn: 41.2,
    precipAnomalyIn: +2.8,
    heatRisk: 72,
    coldRisk: 45,
    floodRisk: 78,
    droughtRisk: 64,
    stormRisk: 52,
    tornadoRisk: 5,
    hurricaneRisk: 0,
    wildfireRisk: 76,
    windRisk: 72,
    snowRisk: 68,
    overallRisk: 74,
    droughtPdsi: -1.1,
    annualTornadoes: 2,
    wildfireAcresBurnedK: 380,
    extremeHeatDays: 18,
    extremeRainDays: 22,
    hasFluctuation: false,
    yearlyTemps: [50.1, 49.5, 50.2, 51.1, 50.6],
    yearlyPrecip: [39.1, 37.4, 40.2, 42.1, 41.2],
    yearlyRisk: [78, 68, 72, 76, 74],
    projectedTemps: [51.0, 51.4, 51.9, 51.7, 52.3],
    projectedRisk: [76, 78, 82, 80, 85]
  },
  {
    id: 'NY',
    name: 'New York',
    stateCode: 'NY',
    region: 'Northeast',
    lat: 40.7128,
    lng: -74.0060,
    population: 19677151,
    historicalAvgTempF: 45.4,
    currentTempF: 48.3,
    tempAnomalyF: +2.9,
    historicalPrecipIn: 41.8,
    currentPrecipIn: 46.2,
    precipAnomalyIn: +4.4,
    heatRisk: 78,
    coldRisk: 62,
    floodRisk: 86,
    droughtRisk: 42,
    stormRisk: 78,
    tornadoRisk: 28,
    hurricaneRisk: 62,
    wildfireRisk: 30,
    windRisk: 80,
    snowRisk: 82,
    overallRisk: 81,
    droughtPdsi: +0.8,
    annualTornadoes: 12,
    wildfireAcresBurnedK: 15,
    extremeHeatDays: 22,
    extremeRainDays: 21,
    hasFluctuation: true,
    fluctuationDetail: 'Atmospheric flash flood vulnerability in dense metropolitan corridors combined with winter polar vortex volatility.',
    yearlyTemps: [46.8, 47.1, 47.9, 49.0, 48.3],
    yearlyPrecip: [43.1, 40.2, 47.8, 48.4, 46.2],
    yearlyRisk: [74, 72, 83, 85, 81],
    projectedTemps: [48.8, 49.2, 49.8, 49.5, 50.2],
    projectedRisk: [83, 85, 89, 87, 92]
  },
  {
    id: 'IL',
    name: 'Illinois',
    stateCode: 'IL',
    region: 'Midwest',
    lat: 40.6331,
    lng: -89.3985,
    population: 12582032,
    historicalAvgTempF: 51.8,
    currentTempF: 54.4,
    tempAnomalyF: +2.6,
    historicalPrecipIn: 39.2,
    currentPrecipIn: 41.8,
    precipAnomalyIn: +2.6,
    heatRisk: 75,
    coldRisk: 74,
    floodRisk: 79,
    droughtRisk: 55,
    stormRisk: 86,
    tornadoRisk: 88,
    hurricaneRisk: 0,
    wildfireRisk: 20,
    windRisk: 84,
    snowRisk: 76,
    overallRisk: 82,
    droughtPdsi: -0.5,
    annualTornadoes: 68,
    wildfireAcresBurnedK: 5,
    extremeHeatDays: 24,
    extremeRainDays: 18,
    hasFluctuation: false,
    yearlyTemps: [53.2, 52.8, 53.9, 55.2, 54.4],
    yearlyPrecip: [38.4, 37.1, 40.5, 43.2, 41.8],
    yearlyRisk: [76, 74, 80, 85, 82],
    projectedTemps: [54.9, 55.3, 56.0, 55.7, 56.4],
    projectedRisk: [84, 86, 90, 88, 93]
  },
  {
    id: 'NV',
    name: 'Nevada',
    stateCode: 'NV',
    region: 'Southwest',
    lat: 38.8026,
    lng: -116.4194,
    population: 3177772,
    historicalAvgTempF: 49.9,
    currentTempF: 53.6,
    tempAnomalyF: +3.7,
    historicalPrecipIn: 10.2,
    currentPrecipIn: 8.1,
    precipAnomalyIn: -2.1,
    heatRisk: 96,
    coldRisk: 42,
    floodRisk: 48,
    droughtRisk: 94,
    stormRisk: 42,
    tornadoRisk: 3,
    hurricaneRisk: 0,
    wildfireRisk: 89,
    windRisk: 70,
    snowRisk: 45,
    overallRisk: 90,
    droughtPdsi: -3.8,
    annualTornadoes: 2,
    wildfireAcresBurnedK: 520,
    extremeHeatDays: 62,
    extremeRainDays: 4,
    hasFluctuation: true,
    fluctuationDetail: 'Compound desert heat amplification with Lake Mead reservoir depletion threats.',
    yearlyTemps: [51.5, 52.1, 53.8, 54.4, 53.6],
    yearlyPrecip: [8.8, 8.2, 11.4, 9.5, 8.1],
    yearlyRisk: [85, 88, 92, 95, 90],
    projectedTemps: [54.1, 54.6, 55.3, 55.0, 55.8],
    projectedRisk: [92, 94, 98, 96, 100]
  },
  {
    id: 'GA',
    name: 'Georgia',
    stateCode: 'GA',
    region: 'Southeast',
    lat: 32.1656,
    lng: -82.9001,
    population: 10912876,
    historicalAvgTempF: 63.5,
    currentTempF: 66.2,
    tempAnomalyF: +2.7,
    historicalPrecipIn: 50.4,
    currentPrecipIn: 54.1,
    precipAnomalyIn: +3.7,
    heatRisk: 85,
    coldRisk: 25,
    floodRisk: 84,
    droughtRisk: 48,
    stormRisk: 86,
    tornadoRisk: 82,
    hurricaneRisk: 84,
    wildfireRisk: 45,
    windRisk: 82,
    snowRisk: 10,
    overallRisk: 86,
    droughtPdsi: +0.4,
    annualTornadoes: 44,
    wildfireAcresBurnedK: 45,
    extremeHeatDays: 45,
    extremeRainDays: 22,
    hasFluctuation: true,
    fluctuationDetail: 'Severe inland tropical storm surge and tornado clustering across South Georgia corridor.',
    yearlyTemps: [64.8, 65.4, 65.9, 67.1, 66.2],
    yearlyPrecip: [49.2, 48.6, 52.4, 56.8, 54.1],
    yearlyRisk: [78, 80, 84, 92, 86],
    projectedTemps: [66.8, 67.2, 67.9, 67.6, 68.4],
    projectedRisk: [88, 90, 94, 92, 96]
  },
  {
    id: 'PA',
    name: 'Pennsylvania',
    stateCode: 'PA',
    region: 'Northeast',
    lat: 41.2033,
    lng: -77.1945,
    population: 12972008,
    historicalAvgTempF: 48.8,
    currentTempF: 51.4,
    tempAnomalyF: +2.6,
    historicalPrecipIn: 42.9,
    currentPrecipIn: 45.8,
    precipAnomalyIn: +2.9,
    heatRisk: 72,
    coldRisk: 68,
    floodRisk: 81,
    droughtRisk: 38,
    stormRisk: 76,
    tornadoRisk: 35,
    hurricaneRisk: 40,
    wildfireRisk: 22,
    windRisk: 75,
    snowRisk: 78,
    overallRisk: 78,
    droughtPdsi: +0.6,
    annualTornadoes: 18,
    wildfireAcresBurnedK: 12,
    extremeHeatDays: 20,
    extremeRainDays: 19,
    hasFluctuation: false,
    yearlyTemps: [50.1, 50.4, 51.0, 52.2, 51.4],
    yearlyPrecip: [43.5, 41.8, 45.2, 47.1, 45.8],
    yearlyRisk: [72, 70, 76, 82, 78],
    projectedTemps: [51.9, 52.3, 52.9, 52.6, 53.3],
    projectedRisk: [80, 82, 86, 84, 89]
  }
];

// NOAA Verified Historical Event Milestones
export const historicalDisasterEvents: ClimateEventTimeline[] = [
  {
    year: 2021,
    date: 'June 2021',
    title: 'Pacific Northwest Extreme Heat Dome',
    state: 'WA',
    hazardType: 'Heatwave',
    severity: 'EXTREME',
    measurement: 'All-time record 116°F / +28°F above normal',
    source: 'NOAA NCEI Event Record #98421'
  },
  {
    year: 2021,
    date: 'August 2021',
    title: 'Hurricane Ida Landfall & Remnants',
    state: 'LA / NY',
    hazardType: 'Hurricane',
    severity: 'EXTREME',
    measurement: '150 mph Category 4 / $75B damage',
    source: 'NOAA National Hurricane Center'
  },
  {
    year: 2022,
    date: 'July 2022',
    title: 'Eastern Kentucky Catastrophic Flash Flood',
    state: 'KY',
    hazardType: 'Flooding',
    severity: 'EXTREME',
    measurement: '14-16 inches in 24 hours / 1-in-1,000 year event',
    source: 'NOAA Weather Prediction Center'
  },
  {
    year: 2022,
    date: 'September 2022',
    title: 'Hurricane Ian Southwest Florida Landfall',
    state: 'FL',
    hazardType: 'Hurricane',
    severity: 'EXTREME',
    measurement: '155 mph Category 4 / 15-foot storm surge / $112B damage',
    source: 'NOAA NCEI Billion-Dollar Disasters'
  },
  {
    year: 2023,
    date: 'July 2023',
    title: 'Historic Phoenix Heat Dome',
    state: 'AZ',
    hazardType: 'Heatwave',
    severity: 'EXTREME',
    measurement: '31 consecutive days ≥ 110°F / Average temp 102.7°F',
    source: 'NOAA Climate at a Glance'
  },
  {
    year: 2023,
    date: 'August 2023',
    title: 'Maui Lahaina Wildfire Disaster',
    state: 'HI',
    hazardType: 'Wildfire',
    severity: 'EXTREME',
    measurement: 'Gale-force hurricane-edge winds / 2,200 structures destroyed',
    source: 'NOAA / US Drought Monitor'
  },
  {
    year: 2024,
    date: 'September 2024',
    title: 'Hurricane Helene Southern Appalachian Flooding',
    state: 'NC / GA / FL',
    hazardType: 'Hurricane',
    severity: 'EXTREME',
    measurement: '30+ inches rain in mountain basins / Historic river crests',
    source: 'NOAA NCEI Event Summary'
  },
  {
    year: 2024,
    date: 'October 2024',
    title: 'Hurricane Milton Rapid Intensification',
    state: 'FL',
    hazardType: 'Hurricane',
    severity: 'EXTREME',
    measurement: '180 mph Category 5 central pressure 897 mb in Gulf',
    source: 'NOAA National Hurricane Center'
  },
  {
    year: 2024,
    date: 'Annual 2024',
    title: 'Warmest Year on Record for Contiguous United States',
    state: 'CONUS',
    hazardType: 'Heatwave',
    severity: 'EXTREME',
    measurement: '55.5°F average (+3.5°F anomaly / 27 billion-dollar disasters)',
    source: 'NOAA Annual State of the Climate'
  },
  {
    year: 2025,
    date: 'May 2025',
    title: 'Texas Catastrophic Flash Flooding',
    state: 'TX',
    hazardType: 'Flooding',
    severity: 'VERY HIGH',
    measurement: '18 inches rainfall / Major urban infrastructure disruption',
    source: 'NOAA NCEI Preliminary Storm Report'
  }
];
