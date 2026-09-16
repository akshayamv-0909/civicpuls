export interface ZoneData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  temperature: number; // Celsius
  humidity: number; // percentage
  air_quality: number; // AQI
  population: number; // total people
  population_density: number; // people per sq km
  elderly_population: number; // percentage
  tree_coverage: number; // percentage
  cooling_capacity: 'Low' | 'Medium' | 'High';
  emergency_resources: 'Low' | 'Medium' | 'High';
}

export type ScenarioType = 'NORMAL' | 'EXTREME_HEAT';

export const mockCityData: Record<ScenarioType, ZoneData[]> = {
  NORMAL: [
    {
      id: 'zone-1',
      name: 'Downtown Commercial',
      lat: 38.9072,
      lng: -77.0369,
      temperature: 28,
      humidity: 50,
      air_quality: 45,
      population: 45000,
      population_density: 12000,
      elderly_population: 10,
      tree_coverage: 15,
      cooling_capacity: 'High',
      emergency_resources: 'High',
    },
    {
      id: 'zone-2',
      name: 'Georgetown Residential',
      lat: 38.9047,
      lng: -77.0628,
      temperature: 27,
      humidity: 55,
      air_quality: 40,
      population: 28000,
      population_density: 8000,
      elderly_population: 18,
      tree_coverage: 35,
      cooling_capacity: 'Medium',
      emergency_resources: 'Medium',
    },
    {
      id: 'zone-17',
      name: 'Columbia Heights East',
      lat: 38.9283,
      lng: -77.0327,
      temperature: 22,
      humidity: 30,
      air_quality: 55,
      population: 62000,
      population_density: 15000,
      elderly_population: 22,
      tree_coverage: 10,
      cooling_capacity: 'Medium',
      emergency_resources: 'Low',
    },
    {
      id: 'zone-4',
      name: 'Navy Yard Industrial',
      lat: 38.8767,
      lng: -76.9942,
      temperature: 28,
      humidity: 45,
      air_quality: 60,
      population: 12000,
      population_density: 5000,
      elderly_population: 5,
      tree_coverage: 5,
      cooling_capacity: 'Low',
      emergency_resources: 'Medium',
    }
  ],
  EXTREME_HEAT: [
    {
      id: 'zone-1',
      name: 'Downtown Commercial',
      lat: 38.9072,
      lng: -77.0369,
      temperature: 40,
      humidity: 40,
      air_quality: 85,
      population: 45000,
      population_density: 12000,
      elderly_population: 10,
      tree_coverage: 15,
      cooling_capacity: 'High',
      emergency_resources: 'High',
    },
    {
      id: 'zone-2',
      name: 'Georgetown Residential',
      lat: 38.9047,
      lng: -77.0628,
      temperature: 38,
      humidity: 45,
      air_quality: 75,
      population: 28000,
      population_density: 8000,
      elderly_population: 18,
      tree_coverage: 35,
      cooling_capacity: 'Medium',
      emergency_resources: 'Medium',
    },
    {
      id: 'zone-17', // High risk zone for the demo
      name: 'Columbia Heights East',
      lat: 38.9283,
      lng: -77.0327,
      temperature: 42,
      humidity: 35,
      air_quality: 110,
      population: 62000,
      population_density: 15000,
      elderly_population: 22,
      tree_coverage: 10,
      cooling_capacity: 'Low',
      emergency_resources: 'Low',
    },
    {
      id: 'zone-4',
      name: 'Navy Yard Industrial',
      lat: 38.8767,
      lng: -76.9942,
      temperature: 41,
      humidity: 30,
      air_quality: 95,
      population: 12000,
      population_density: 5000,
      elderly_population: 5,
      tree_coverage: 5,
      cooling_capacity: 'Low',
      emergency_resources: 'Medium',
    }
  ]
};
