'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity,
  Clock, 
  CheckCircle2, 
  Navigation, 
  Volume2, 
  QrCode, 
  ChevronRight, 
  HeartHandshake, 
  Sun, 
  Siren, 
  PhoneCall, 
  Compass, 
  Building2, 
  Radio, 
  Zap, 
  Users, 
  Bell, 
  Sparkles, 
  Crosshair, 
  RotateCw, 
  Cpu, 
  ShieldCheck, 
  CloudRain, 
  CloudLightning, 
  Waves, 
  Wifi, 
  PlayCircle, 
  User, 
  Shield,
  ChevronDown
} from 'lucide-react';
import { SOSCategory, CitizenPing } from '@/app/api/citizen-sync/route';
import { INITIAL_ZONES, LiveZoneTelemetry } from '@/lib/liveWeatherService';

type CitizenTab = 'NOWCAST' | 'MAP' | 'DEMO' | 'EVACUATE' | 'ALERTS' | 'PROFILE' | 'SOS';

interface Shelter {
  id: string;
  name: string;
  address: string;
  distance: string;
  walkTime: string;
  capacity: string;
  status: 'OPEN' | 'LIMITED' | 'FULL';
  amenities: string[];
}

interface FamilyMember {
  name: string;
  relation: string;
  status: 'SAFE' | 'AT_SHELTER' | 'EN_ROUTE';
  location: string;
  battery: string;
  lastUpdated: string;
}

// Dynamic US Municipal Emergency Shelters
const getSheltersForZone = (zoneId: string, locationName: string, metro: string): Shelter[] => {
  if (zoneId.includes('phx')) {
    return [
      {
        id: 'sh-phx-1',
        name: 'Burton Barr Central Relief Oasis',
        address: '1221 N Central Ave, Downtown Transit Hub',
        distance: '0.4 mi away',
        walkTime: '6 min walk',
        capacity: '420 / 600 Available',
        status: 'OPEN',
        amenities: ['Commercial High-Power AC', 'Cold Hydration Refill', 'Paramedics on Duty', 'Device Charging', 'Backup Power']
      },
      {
        id: 'sh-phx-2',
        name: 'Civic Community Resilience Center & Refuge',
        address: '1112 E Buckeye Corridor Safe Haven',
        distance: '1.1 mi away',
        walkTime: '14 min walk',
        capacity: '280 / 450 Available',
        status: 'OPEN',
        amenities: ['AC Gymnasium', 'Senior Hydration Station', 'Free Transit Shuttle Bay', 'Medical First Aid']
      },
      {
        id: 'sh-phx-3',
        name: 'Municipal Convention Center Emergency Refuge Hub',
        address: '100 N 3rd St, High Ground Sector',
        distance: '1.8 mi away',
        walkTime: '22 min walk',
        capacity: '1,200 / 2,000 Available',
        status: 'OPEN',
        amenities: ['Mass Shaded Concourse', 'Oxygen Concentrators', 'Free Meal Distribution', 'Pet-Friendly Area']
      }
    ];
  } else if (zoneId.includes('la')) {
    return [
      {
        id: 'sh-la-1',
        name: 'Echo Park High-Ground Cooling Oasis',
        address: '1149 Glendale Blvd, Central District',
        distance: '0.5 mi away',
        walkTime: '7 min walk',
        capacity: '350 / 500 Available',
        status: 'OPEN',
        amenities: ['Commercial AC', 'Wildfire Smoke HEPA Filtration', 'First Responders', 'Cold Hydration']
      },
      {
        id: 'sh-la-2',
        name: 'Los Angeles Convention Center Emergency Hub',
        address: '1201 S Figueroa St, Downtown Haven',
        distance: '1.2 mi away',
        walkTime: '15 min walk',
        capacity: '1,500 / 2,500 Available',
        status: 'OPEN',
        amenities: ['Mass Shaded Hall', 'Paramedics', 'Oxygen Tanks', 'Pet-Friendly Area']
      },
      {
        id: 'sh-la-3',
        name: 'Silver Lake Community Resilience Refuge',
        address: '2245 Glendale Blvd, High Ridge Sector',
        distance: '1.9 mi away',
        walkTime: '24 min walk',
        capacity: '210 / 300 Available',
        status: 'OPEN',
        amenities: ['Backup Generator', 'Emergency Medical Supplies', 'Cold Water Misters']
      }
    ];
  } else if (zoneId.includes('houston') || zoneId.includes('hou')) {
    return [
      {
        id: 'sh-hou-1',
        name: 'George R. Brown High-Ground Evacuation Hub',
        address: '1001 Avenida De Las Americas',
        distance: '0.3 mi away',
        walkTime: '5 min walk',
        capacity: '1,800 / 3,000 Available',
        status: 'OPEN',
        amenities: ['Flood Inundation Barrier', 'Commercial AC', 'Medical Surge Team', 'Free Shuttle']
      },
      {
        id: 'sh-hou-2',
        name: 'Toyota Center Disaster Triage & Cooling Refuge',
        address: '1510 Polk St, Core Haven',
        distance: '0.9 mi away',
        walkTime: '12 min walk',
        capacity: '800 / 1,200 Available',
        status: 'OPEN',
        amenities: ['Emergency Oxygen', 'Paramedics', 'Backup Power', 'Food & Hydration']
      },
      {
        id: 'sh-hou-3',
        name: 'Buffalo Bayou Elevated Resilience Station',
        address: '105 Sabine St, High Sector',
        distance: '1.6 mi away',
        walkTime: '20 min walk',
        capacity: '400 / 600 Available',
        status: 'OPEN',
        amenities: ['High Ridge MSL 22m', 'First Aid', 'Water Purification Station']
      }
    ];
  } else if (zoneId.includes('vegas') || zoneId.includes('lv') || zoneId.includes('las')) {
    return [
      {
        id: 'sh-lv-1',
        name: 'Cashman Center Resilience & Cooling Oasis',
        address: '850 Las Vegas Blvd N',
        distance: '0.6 mi away',
        walkTime: '8 min walk',
        capacity: '650 / 900 Available',
        status: 'OPEN',
        amenities: ['Commercial Heavy AC', 'Electrolyte Refill Station', 'EMT Medical Bay', 'Shuttle Bay']
      },
      {
        id: 'sh-lv-2',
        name: 'Clark County Government Center Safe Haven',
        address: '500 S Grand Central Pkwy',
        distance: '1.3 mi away',
        walkTime: '16 min walk',
        capacity: '450 / 700 Available',
        status: 'OPEN',
        amenities: ['Shaded Concourse', 'Emergency Paramedics', 'Device Recharging Hub']
      },
      {
        id: 'sh-lv-3',
        name: 'Las Vegas Convention Center Refuge Hub',
        address: '3150 Paradise Rd',
        distance: '2.1 mi away',
        walkTime: '25 min walk',
        capacity: '2,000 / 3,500 Available',
        status: 'OPEN',
        amenities: ['Mass Cooling Concourse', 'Oxygen Concentrators', 'Meal Distribution']
      }
    ];
  } else if (zoneId.includes('miami') || zoneId.includes('mia')) {
    return [
      {
        id: 'sh-mia-1',
        name: 'Marlins Park Hurricane & Surge Refuge Center',
        address: '501 Marlins Way, Little Havana Ridge',
        distance: '0.5 mi away',
        walkTime: '7 min walk',
        capacity: '1,200 / 2,000 Available',
        status: 'OPEN',
        amenities: ['Category 5 Storm Rating', 'Surge Inundation Barrier', 'Paramedics', 'Backup Power']
      },
      {
        id: 'sh-mia-2',
        name: 'Miami Beach High-Ground Resilience Station',
        address: '1901 Convention Ctr Dr',
        distance: '1.4 mi away',
        walkTime: '18 min walk',
        capacity: '850 / 1,400 Available',
        status: 'OPEN',
        amenities: ['Elevated Flood Haven', 'AC Concourse', 'Cold Hydration', 'Medical Desk']
      },
      {
        id: 'sh-mia-3',
        name: 'Brickell Financial Safe Oasis Center',
        address: '701 S Miami Ave',
        distance: '1.7 mi away',
        walkTime: '21 min walk',
        capacity: '500 / 800 Available',
        status: 'OPEN',
        amenities: ['Emergency Power', 'Oxygen Supply', 'First Aid Station']
      }
    ];
  }

  // Default standard US Municipal Safe Haven
  const primaryName = (locationName || 'Downtown Core').split('&')[0].trim().split('—')[0].trim();
  return [
    {
      id: `sh-${zoneId}-1`,
      name: `${primaryName} Central Relief Oasis`,
      address: `1221 Central Corridor, ${metro}`,
      distance: '0.4 mi away',
      walkTime: '6 min walk',
      capacity: '450 / 600 Available',
      status: 'OPEN',
      amenities: ['Commercial High-Power AC', 'Cold Hydration Refill', 'Paramedics on Duty', 'Device Charging', 'Backup Generator']
    },
    {
      id: `sh-${zoneId}-2`,
      name: `${metro.split(',')[0]} Civic Resilience Center`,
      address: `450 High Ridge Corridor, ${metro}`,
      distance: '1.1 mi away',
      walkTime: '14 min walk',
      capacity: '320 / 500 Available',
      status: 'OPEN',
      amenities: ['AC Gymnasium', 'Senior Hydration Station', 'Free Transit Shuttle Bay', 'Medical First Aid']
    },
    {
      id: `sh-${zoneId}-3`,
      name: `${metro.split(',')[0]} Municipal Emergency Refuge Hub`,
      address: `800 Safe Elevation Pkwy, ${metro}`,
      distance: '1.8 mi away',
      walkTime: '22 min walk',
      capacity: '1,100 / 2,000 Available',
      status: 'OPEN',
      amenities: ['Mass Shaded Concourse', 'Oxygen Concentrators', 'Free Meal Distribution', 'Pet-Friendly Area']
    }
  ];
};

interface CityTelemetryProfile {
  tempF: number;
  tempC: number;
  feelsLikeC: number;
  humidityPct: number;
  windSpeedKm: number;
  precipitationMm: number;
  rainProb: number;
  riskScore: number;
  riskLevel: string;
  actionWindowHours: number;
  heroTitle: string;
  heroDesc: string;
  surgeDepthM: number;
  weatherCondition: string;
  thunderstormProb: number;
  cloudburstProb: number;
  flashFloodProb: number;
}

const CITY_TELEMETRY_MAP: Record<string, CityTelemetryProfile> = {
  // Phoenix Metro Districts
  'zone-phx-core': {
    tempF: 104,
    tempC: 40,
    feelsLikeC: 41.7,
    humidityPct: 18,
    windSpeedKm: 13,
    precipitationMm: 0,
    rainProb: 15,
    riskScore: 84,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 3.5,
    heroTitle: 'CRITICAL: Extreme Urban Heat Surge Warning',
    heroDesc: 'Ambient thermal peak 40°C (104°F) with high UV radiation. Municipal cooling shelters open 24/7.',
    surgeDepthM: 0.2,
    weatherCondition: 'Extreme Thermal Spike',
    thunderstormProb: 24,
    cloudburstProb: 12,
    flashFloodProb: 88,
  },
  'zone-phx-east': {
    tempF: 102,
    tempC: 38.9,
    feelsLikeC: 40.5,
    humidityPct: 20,
    windSpeedKm: 14,
    precipitationMm: 0,
    rainProb: 15,
    riskScore: 78,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 4.0,
    heroTitle: 'CRITICAL: Excessive Heat & High Ozone Alert',
    heroDesc: 'Dangerous solar radiation and heat index 104°F. Stay indoors in air-conditioned areas.',
    surgeDepthM: 0.1,
    weatherCondition: 'Excessive Heat & Ozone',
    thunderstormProb: 22,
    cloudburstProb: 10,
    flashFloodProb: 45,
  },
  'zone-phx-west': {
    tempF: 103,
    tempC: 39.4,
    feelsLikeC: 41.1,
    humidityPct: 19,
    windSpeedKm: 11,
    precipitationMm: 0,
    rainProb: 15,
    riskScore: 81,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 3.8,
    heroTitle: 'CRITICAL: West Valley Thermal Inversion',
    heroDesc: 'High heat index in urban core. Public cooling hydration centers activated.',
    surgeDepthM: 0.1,
    weatherCondition: 'Extreme Heat Hazard',
    thunderstormProb: 20,
    cloudburstProb: 8,
    flashFloodProb: 40,
  },
  'zone-phx-north': {
    tempF: 99,
    tempC: 37.2,
    feelsLikeC: 38.3,
    humidityPct: 22,
    windSpeedKm: 16,
    precipitationMm: 0,
    rainProb: 15,
    riskScore: 68,
    riskLevel: 'HIGH RISK INDEX',
    actionWindowHours: 5.5,
    heroTitle: 'HIGH RISK: North Valley Thermal Advisory',
    heroDesc: 'Thermal index nearing 101°F. Hydration protocols in effect.',
    surgeDepthM: 0.1,
    weatherCondition: 'Elevated Desert Heat',
    thunderstormProb: 18,
    cloudburstProb: 6,
    flashFloodProb: 25,
  },

  // Las Vegas Metro
  'zone-las-core': {
    tempF: 108,
    tempC: 42.2,
    feelsLikeC: 43.3,
    humidityPct: 12,
    windSpeedKm: 19,
    precipitationMm: 0,
    rainProb: 5,
    riskScore: 92,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 2.5,
    heroTitle: 'CRITICAL: Mojave Desert Hyperthermia Emergency',
    heroDesc: 'Extreme surface temperatures exceeding 108°F (42°C). High risk of heat exhaustion and grid stress.',
    surgeDepthM: 0.1,
    weatherCondition: 'Severe Desert Heat Wave',
    thunderstormProb: 18,
    cloudburstProb: 5,
    flashFloodProb: 20,
  },
  'zone-las-north': {
    tempF: 109,
    tempC: 42.8,
    feelsLikeC: 43.9,
    humidityPct: 11,
    windSpeedKm: 24,
    precipitationMm: 0,
    rainProb: 5,
    riskScore: 94,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 2.0,
    heroTitle: 'CRITICAL: Industrial Basin Thermal Warning',
    heroDesc: 'Intense urban heat retention and low humidity (11%). Hydration stations and backup generators on standby.',
    surgeDepthM: 0.1,
    weatherCondition: 'Industrial Heat Plume & High Winds',
    thunderstormProb: 22,
    cloudburstProb: 5,
    flashFloodProb: 18,
  },

  // Houston Metro Districts
  'zone-hou-core': {
    tempF: 89,
    tempC: 31.7,
    feelsLikeC: 37.2,
    humidityPct: 86,
    windSpeedKm: 29,
    precipitationMm: 24.5,
    rainProb: 90,
    riskScore: 88,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 3.0,
    heroTitle: 'CRITICAL: Harris County Pluvial Flood Warning',
    heroDesc: 'Torrential downpours (24.5 mm/h) causing rapid street inundation (+1.8m). Avoid low-lying underpasses.',
    surgeDepthM: 1.8,
    weatherCondition: 'Severe Thunderstorm & Pluvial Flood',
    thunderstormProb: 88,
    cloudburstProb: 75,
    flashFloodProb: 94,
  },
  'zone-hou-port': {
    tempF: 88,
    tempC: 31.1,
    feelsLikeC: 36.7,
    humidityPct: 89,
    windSpeedKm: 35,
    precipitationMm: 32.0,
    rainProb: 95,
    riskScore: 91,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 2.2,
    heroTitle: 'CRITICAL: Ship Channel Storm Surge & Inundation',
    heroDesc: 'Severe coastal backflow and heavy precipitation. Low-ground evacuation routes designated.',
    surgeDepthM: 2.4,
    weatherCondition: 'Coastal Surge & Heavy Inundation',
    thunderstormProb: 92,
    cloudburstProb: 85,
    flashFloodProb: 98,
  },
  'zone-hou-med': {
    tempF: 90,
    tempC: 32.2,
    feelsLikeC: 38.3,
    humidityPct: 82,
    windSpeedKm: 22,
    precipitationMm: 12.0,
    rainProb: 80,
    riskScore: 76,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 4.5,
    heroTitle: 'HIGH RISK: TMC Medical Corridor Drainage Alert',
    heroDesc: 'Sustained high heat index (101°F) coupled with localized flash downpours.',
    surgeDepthM: 0.8,
    weatherCondition: 'Humid Squalls & Localized Ponding',
    thunderstormProb: 78,
    cloudburstProb: 60,
    flashFloodProb: 82,
  },

  // Los Angeles Metro
  'zone-la-core': {
    tempF: 82,
    tempC: 27.8,
    feelsLikeC: 28.9,
    humidityPct: 58,
    windSpeedKm: 14,
    precipitationMm: 0,
    rainProb: 10,
    riskScore: 48,
    riskLevel: 'HIGH RISK INDEX',
    actionWindowHours: 8.0,
    heroTitle: 'HIGH RISK: Basin Thermal Inversion & Ozone Watch',
    heroDesc: 'Moderate heat (82°F) with elevated ozone in downtown basin. Air filtration shelters operational.',
    surgeDepthM: 0.1,
    weatherCondition: 'High Smog & Warm Sun',
    thunderstormProb: 12,
    cloudburstProb: 5,
    flashFloodProb: 15,
  },
  'zone-la-valley': {
    tempF: 96,
    tempC: 35.6,
    feelsLikeC: 36.1,
    humidityPct: 14,
    windSpeedKm: 42,
    precipitationMm: 0,
    rainProb: 5,
    riskScore: 86,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 3.0,
    heroTitle: 'CRITICAL: Red Flag Fire Weather & High Gusts',
    heroDesc: 'Severe fire weather conditions with 42 km/h dry gusts and high thermal load. Evacuation corridors on alert.',
    surgeDepthM: 0.0,
    weatherCondition: 'Red Flag Wildfire Warning',
    thunderstormProb: 15,
    cloudburstProb: 5,
    flashFloodProb: 10,
  },
  'zone-la-coastal': {
    tempF: 73,
    tempC: 22.8,
    feelsLikeC: 23.3,
    humidityPct: 72,
    windSpeedKm: 18,
    precipitationMm: 0,
    rainProb: 10,
    riskScore: 28,
    riskLevel: 'NORMAL RISK INDEX',
    actionWindowHours: 18.0,
    heroTitle: 'Atmospheric Baseline Stable',
    heroDesc: 'Pleasant coastal atmospheric conditions (73°F). No immediate civil protection warnings.',
    surgeDepthM: 0.1,
    weatherCondition: 'Marine Layer / Mild Coastal Breeze',
    thunderstormProb: 8,
    cloudburstProb: 4,
    flashFloodProb: 8,
  },

  // Miami Metro Districts
  'zone-mia-core': {
    tempF: 91,
    tempC: 32.8,
    feelsLikeC: 39.4,
    humidityPct: 84,
    windSpeedKm: 21,
    precipitationMm: 18.2,
    rainProb: 85,
    riskScore: 83,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 3.8,
    heroTitle: 'CRITICAL: Tropical Heat & Flash Inundation',
    heroDesc: 'Heat index 103°F combined with tropical squalls. Tidal surge monitoring active.',
    surgeDepthM: 0.9,
    weatherCondition: 'Severe Tropical Convection',
    thunderstormProb: 80,
    cloudburstProb: 72,
    flashFloodProb: 88,
  },
  'zone-mia-north': {
    tempF: 92,
    tempC: 33.3,
    feelsLikeC: 40.6,
    humidityPct: 82,
    windSpeedKm: 19,
    precipitationMm: 14.5,
    rainProb: 80,
    riskScore: 85,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 3.2,
    heroTitle: 'CRITICAL: Urban Basin Flash Flood & Heat',
    heroDesc: 'Elevated pluvial ponding and extreme apparent heat index.',
    surgeDepthM: 1.1,
    weatherCondition: 'Intense Humid Squalls',
    thunderstormProb: 82,
    cloudburstProb: 70,
    flashFloodProb: 89,
  },
  'zone-mia-beach': {
    tempF: 88,
    tempC: 31.1,
    feelsLikeC: 37.2,
    humidityPct: 88,
    windSpeedKm: 28,
    precipitationMm: 8.0,
    rainProb: 75,
    riskScore: 77,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 4.2,
    heroTitle: 'CRITICAL: Coastal Inundation & High Surf Warning',
    heroDesc: 'King tide tidal surge (+1.5m) and localized coastal road washouts.',
    surgeDepthM: 1.5,
    weatherCondition: 'King Tide & Coastal Inundation',
    thunderstormProb: 74,
    cloudburstProb: 55,
    flashFloodProb: 92,
  },

  // Washington DC Districts
  'zone-dc-1': {
    tempF: 87,
    tempC: 30.6,
    feelsLikeC: 33.9,
    humidityPct: 65,
    windSpeedKm: 16,
    precipitationMm: 2.0,
    rainProb: 45,
    riskScore: 58,
    riskLevel: 'HIGH RISK INDEX',
    actionWindowHours: 7.0,
    heroTitle: 'HIGH RISK: DC Metro Heat & Air Quality Advisory',
    heroDesc: 'Elevated temperature (87°F) with high humidity. District cooling buses in service.',
    surgeDepthM: 0.2,
    weatherCondition: 'Humid Summer Haze',
    thunderstormProb: 42,
    cloudburstProb: 20,
    flashFloodProb: 35,
  },
  'zone-dc-2': {
    tempF: 89,
    tempC: 31.7,
    feelsLikeC: 35.0,
    humidityPct: 62,
    windSpeedKm: 14,
    precipitationMm: 0,
    rainProb: 30,
    riskScore: 62,
    riskLevel: 'HIGH RISK INDEX',
    actionWindowHours: 6.5,
    heroTitle: 'HIGH RISK: National Mall Thermal Advisory',
    heroDesc: 'Thermal heat island retention over asphalt corridors. Shaded hydration points active.',
    surgeDepthM: 0.1,
    weatherCondition: 'Urban Heat Island Effect',
    thunderstormProb: 36,
    cloudburstProb: 15,
    flashFloodProb: 25,
  },
  'zone-dc-3': {
    tempF: 88,
    tempC: 31.1,
    feelsLikeC: 34.4,
    humidityPct: 70,
    windSpeedKm: 15,
    precipitationMm: 6.5,
    rainProb: 60,
    riskScore: 67,
    riskLevel: 'HIGH RISK INDEX',
    actionWindowHours: 5.8,
    heroTitle: 'HIGH RISK: Anacostia Basin Flood & Heat Watch',
    heroDesc: 'River level rising with afternoon convective downpour.',
    surgeDepthM: 0.7,
    weatherCondition: 'Riverine Moisture & Squall',
    thunderstormProb: 55,
    cloudburstProb: 40,
    flashFloodProb: 65,
  },

  // Chicago Metro
  'zone-chi-south': {
    tempF: 77,
    tempC: 25.0,
    feelsLikeC: 25.6,
    humidityPct: 55,
    windSpeedKm: 26,
    precipitationMm: 0,
    rainProb: 15,
    riskScore: 34,
    riskLevel: 'NORMAL RISK INDEX',
    actionWindowHours: 14.0,
    heroTitle: 'Atmospheric Baseline Stable',
    heroDesc: 'Lake Michigan breeze maintaining comfortable 77°F (25°C). Normal activity safe.',
    surgeDepthM: 0.1,
    weatherCondition: 'Lakefront Breeze / Clear',
    thunderstormProb: 20,
    cloudburstProb: 10,
    flashFloodProb: 15,
  },
  'zone-chi-west': {
    tempF: 80,
    tempC: 26.7,
    feelsLikeC: 27.8,
    humidityPct: 50,
    windSpeedKm: 24,
    precipitationMm: 0,
    rainProb: 20,
    riskScore: 42,
    riskLevel: 'HIGH RISK INDEX',
    actionWindowHours: 9.0,
    heroTitle: 'HIGH RISK: West Corridor Wind & Heat Watch',
    heroDesc: 'Moderate thermal load in high density areas.',
    surgeDepthM: 0.1,
    weatherCondition: 'Warm & Breezy',
    thunderstormProb: 28,
    cloudburstProb: 12,
    flashFloodProb: 22,
  },

  // Seattle
  'zone-sea-core': {
    tempF: 68,
    tempC: 20.0,
    feelsLikeC: 19.4,
    humidityPct: 78,
    windSpeedKm: 16,
    precipitationMm: 3.2,
    rainProb: 65,
    riskScore: 22,
    riskLevel: 'NORMAL RISK INDEX',
    actionWindowHours: 24.0,
    heroTitle: 'Atmospheric Baseline Stable',
    heroDesc: 'Cool ambient temperatures (68°F / 20°C) with light maritime precipitation.',
    surgeDepthM: 0.1,
    weatherCondition: 'Pacific Overcast & Light Rain',
    thunderstormProb: 10,
    cloudburstProb: 5,
    flashFloodProb: 12,
  },

  // Atlanta
  'zone-atl-core': {
    tempF: 92,
    tempC: 33.3,
    feelsLikeC: 37.8,
    humidityPct: 74,
    windSpeedKm: 16,
    precipitationMm: 4.5,
    rainProb: 70,
    riskScore: 79,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 4.0,
    heroTitle: 'CRITICAL: Piedmont Plateau Severe Heat & Storms',
    heroDesc: 'Heat index 100°F with fast-moving afternoon thunderstorm cells.',
    surgeDepthM: 0.4,
    weatherCondition: 'High Heat Index & Afternoon Storms',
    thunderstormProb: 75,
    cloudburstProb: 65,
    flashFloodProb: 78,
  },
  'zone-atl-south': {
    tempF: 90,
    tempC: 32.2,
    feelsLikeC: 36.7,
    humidityPct: 78,
    windSpeedKm: 23,
    precipitationMm: 15.0,
    rainProb: 85,
    riskScore: 82,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 3.5,
    heroTitle: 'CRITICAL: Hartsfield Corridor Severe Squall Warning',
    heroDesc: 'Intense cloudburst and gusty downburst winds.',
    surgeDepthM: 0.6,
    weatherCondition: 'Severe Thunderstorm & Lightning',
    thunderstormProb: 84,
    cloudburstProb: 80,
    flashFloodProb: 85,
  },

  // Fresno
  'zone-fre-core': {
    tempF: 106,
    tempC: 41.1,
    feelsLikeC: 42.2,
    humidityPct: 15,
    windSpeedKm: 14,
    precipitationMm: 0,
    rainProb: 5,
    riskScore: 90,
    riskLevel: 'CRITICAL RISK INDEX',
    actionWindowHours: 2.8,
    heroTitle: 'CRITICAL: San Joaquin Valley Extreme Heat Emergency',
    heroDesc: 'Severe sustained heat 106°F (41°C). Farmworker hydration protocol active.',
    surgeDepthM: 0.0,
    weatherCondition: 'Extreme Agricultural Basin Heat',
    thunderstormProb: 14,
    cloudburstProb: 4,
    flashFloodProb: 12,
  },

  // Philadelphia
  'zone-phl-core': {
    tempF: 86,
    tempC: 30.0,
    feelsLikeC: 32.8,
    humidityPct: 68,
    windSpeedKm: 18,
    precipitationMm: 0,
    rainProb: 25,
    riskScore: 60,
    riskLevel: 'HIGH RISK INDEX',
    actionWindowHours: 6.5,
    heroTitle: 'HIGH RISK: Delaware Valley Thermal Inversion',
    heroDesc: 'High humidity and temperature (86°F). Cooling libraries and hydration stations open.',
    surgeDepthM: 0.2,
    weatherCondition: 'Humid & Hazy',
    thunderstormProb: 40,
    cloudburstProb: 18,
    flashFloodProb: 30,
  }
};

const getCityTelemetry = (zoneId: string, name?: string, metro?: string): CityTelemetryProfile => {
  if (CITY_TELEMETRY_MAP[zoneId]) {
    return CITY_TELEMETRY_MAP[zoneId];
  }
  
  const lower = `${zoneId} ${name || ''} ${metro || ''}`.toLowerCase();
  if (lower.includes('las') || lower.includes('vegas') || lower.includes('nv')) {
    return CITY_TELEMETRY_MAP['zone-las-north'];
  }
  if (lower.includes('houston') || lower.includes('hou') || lower.includes('tx')) {
    return CITY_TELEMETRY_MAP['zone-hou-core'];
  }
  if (lower.includes('miami') || lower.includes('mia') || lower.includes('fl')) {
    return CITY_TELEMETRY_MAP['zone-mia-core'];
  }
  if (lower.includes('seattle') || lower.includes('sea') || lower.includes('wa')) {
    return CITY_TELEMETRY_MAP['zone-sea-core'];
  }
  if (lower.includes('chicago') || lower.includes('chi') || lower.includes('il')) {
    return CITY_TELEMETRY_MAP['zone-chi-south'];
  }
  if (lower.includes('atlanta') || lower.includes('atl') || lower.includes('ga')) {
    return CITY_TELEMETRY_MAP['zone-atl-core'];
  }
  if (lower.includes('angeles') || lower.includes('la') || lower.includes('ca')) {
    return CITY_TELEMETRY_MAP['zone-la-core'];
  }
  if (lower.includes('dc') || lower.includes('washington') || lower.includes('columbia')) {
    return CITY_TELEMETRY_MAP['zone-dc-1'];
  }
  if (lower.includes('fresno')) {
    return CITY_TELEMETRY_MAP['zone-fre-core'];
  }
  if (lower.includes('phila')) {
    return CITY_TELEMETRY_MAP['zone-phl-core'];
  }

  return CITY_TELEMETRY_MAP['zone-phx-core'];
};

export default function CitizenLifelinePage() {
  // Navigation & Role
  const [activeTab, setActiveTab] = useState<CitizenTab>('NOWCAST');
  const [isOfficerMode, setIsOfficerMode] = useState<boolean>(false);
  const [clockTime, setClockTime] = useState<string>('02:15 PM');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);

  // Modals
  const [isTransitPassOpen, setIsTransitPassOpen] = useState(false);
  const [isXaiModalOpen, setIsXaiModalOpen] = useState(false);
  const [isSatelliteModalOpen, setIsSatelliteModalOpen] = useState(false);
  const [isBleMeshModalOpen, setIsBleMeshModalOpen] = useState(false);
  const [isRiverModalOpen, setIsRiverModalOpen] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<number | null>(null);

  // Acoustic Search Beacon & Optical Strobe
  const [acousticActive, setAcousticActive] = useState<boolean>(false);
  const [strobeActive, setStrobeActive] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beaconIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Emergency Siren Physical Audio Synthesizer (Web Audio API)
  const [isSirenModalOpen, setIsSirenModalOpen] = useState(false);
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [sirenEventData, setSirenEventData] = useState<{
    title: string;
    message: string;
    assignedUnit?: string;
    etaMinutes?: number;
    acknowledgedBy?: string;
    acknowledgedAt?: string;
    isBroadcast?: boolean;
  } | null>(null);

  const sirenAudioCtxRef = useRef<AudioContext | null>(null);
  const sirenOscRef = useRef<OscillatorNode | null>(null);
  const sirenGainRef = useRef<GainNode | null>(null);
  const sirenModulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track handled alerts to prevent duplicate sound triggers
  const lastHandledSosStatusRef = useRef<string | null>(null);
  const lastHandledSirenAlertIdRef = useRef<string | null>(null);

  // CivicPulse Live System Telemetry
  const [monitoredZones, setMonitoredZones] = useState<LiveZoneTelemetry[]>(INITIAL_ZONES.map(z => {
    const profile = getCityTelemetry(z.id, z.name, z.metro);
    return {
      ...z,
      temperatureF: profile.tempF,
      temperatureC: profile.tempC,
      apparentTempF: Number((profile.tempF + 2.5).toFixed(1)),
      humidityPct: profile.humidityPct,
      precipitationIn: Number((profile.precipitationMm / 25.4).toFixed(2)),
      windSpeedMph: Number((profile.windSpeedKm / 1.609).toFixed(1)),
      weatherCode: profile.precipitationMm > 5 ? 63 : profile.tempF > 95 ? 0 : 1,
      localObservationTime: '14:00',
      isDaytime: true,
      airQualityAqi: profile.riskScore > 75 ? 78 : profile.riskScore > 40 ? 52 : 35,
      pm25: profile.riskScore > 75 ? 24 : 12,
      pm10: profile.riskScore > 75 ? 38 : 20,
      liveRiskScore: profile.riskScore,
      isLiveAvailable: true,
      lastUpdatedUtc: new Date().toUTCString(),
      dataSourceCitation: 'NOAA / Open-Meteo HRRR'
    };
  }));
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zone-phx-core');

  // Location & Weather Telemetry
  const [locationName, setLocationName] = useState<string>('Phoenix Core Urban, Phoenix, AZ');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: 33.4484, lng: -112.0740 });

  const [liveTempC, setLiveTempC] = useState<number>(40);
  const [liveTempF, setLiveTempF] = useState<number>(104);
  const [liveFeelsLikeC, setLiveFeelsLikeC] = useState<number>(41.7);
  const [liveHumidity, setLiveHumidity] = useState<number>(18);
  const [liveWindSpeedKm, setLiveWindSpeedKm] = useState<number>(12.8);
  const [liveRainIntensity, setLiveRainIntensity] = useState<number>(0);
  const [liveRainProb, setLiveRainProb] = useState<number>(15);
  const [liveRiskScore, setLiveRiskScore] = useState<number>(84);
  const [liveRiskLevel, setLiveRiskLevel] = useState<string>('CRITICAL RISK INDEX');
  const [actionWindowHours, setActionWindowHours] = useState<number>(3.5);
  const [heroTitle, setHeroTitle] = useState<string>('CRITICAL: Extreme Urban Heat Surge Warning');
  const [heroDesc, setHeroDesc] = useState<string>('Ambient thermal peak 40°C (104°F) with high UV radiation. Municipal cooling shelters open 24/7.');
  const [surgeDepthM, setSurgeDepthM] = useState<number>(0.2);
  const [weatherCondition, setWeatherCondition] = useState<string>('Extreme Thermal Spike');

  // AI MTL Heads
  const [thunderstormProb, setThunderstormProb] = useState<number>(24);
  const [cloudburstProb, setCloudburstProb] = useState<number>(12);
  const [flashFloodProb, setFlashFloodProb] = useState<number>(88);

  // SOS Emergency State
  const [selectedSOSCategory, setSelectedSOSCategory] = useState<SOSCategory>('HEAT_STROKE');
  const [sosNotes, setSosNotes] = useState<string>('');
  const [peopleCount, setPeopleCount] = useState<number>(2);
  const [hasInfant, setHasInfant] = useState<boolean>(false);
  const [hasElderly, setHasElderly] = useState<boolean>(true);
  const [hasMedicalOxygen, setHasMedicalOxygen] = useState<boolean>(false);

  const [isSendingSOS, setIsSendingSOS] = useState<boolean>(false);
  const [activeSOSBeacon, setActiveSOSBeacon] = useState<CitizenPing | null>(null);
  const [verifiedSafeCount, setVerifiedSafeCount] = useState<number>(1423);
  const [isSafeCheckedIn, setIsSafeCheckedIn] = useState<boolean>(false);

  // Officer Triage Live Feed
  const [allRecentPings, setAllRecentPings] = useState<CitizenPing[]>([]);

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { name: 'Me (Alex Morgan)', relation: 'Self', status: 'SAFE', location: 'Downtown Central District', battery: '88%', lastUpdated: 'Just now' },
    { name: 'Eleanor Morgan', relation: 'Mother (72)', status: 'AT_SHELTER', location: 'Burton Barr Central Cooling Hub', battery: '92%', lastUpdated: '4m ago' },
    { name: 'David Morgan', relation: 'Brother', status: 'SAFE', location: 'East Corridor Sub-District', battery: '64%', lastUpdated: '12m ago' }
  ]);

  // Clock Ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // -------------------------------------------------------------
  // 1. Emergency Siren Physical Synthesizer (Web Audio API)
  // -------------------------------------------------------------
  const startEmergencySirenSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (sirenAudioCtxRef.current) {
        try { sirenAudioCtxRef.current.close(); } catch {}
      }

      const ctx = new AudioCtx();
      sirenAudioCtxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      sirenOscRef.current = osc;
      sirenGainRef.current = gain;
      setIsSirenPlaying(true);

      let high = false;
      sirenModulationTimerRef.current = setInterval(() => {
        if (!ctx || ctx.state === 'closed') return;
        high = !high;
        const targetFreq = high ? 1150 : 650;
        osc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.22);
      }, 450);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([400, 150, 400, 150, 600]);
      }
    } catch (e) {
      console.warn('Web Audio Siren Error:', e);
    }
  }, []);

  const stopEmergencySirenSound = useCallback(() => {
    if (sirenModulationTimerRef.current) {
      clearInterval(sirenModulationTimerRef.current);
      sirenModulationTimerRef.current = null;
    }
    if (sirenOscRef.current) {
      try { sirenOscRef.current.stop(); } catch {}
      sirenOscRef.current = null;
    }
    if (sirenAudioCtxRef.current) {
      sirenAudioCtxRef.current.close().catch(() => {});
      sirenAudioCtxRef.current = null;
    }
    setIsSirenPlaying(false);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }, []);

  // -------------------------------------------------------------
  // 2. Acoustic Search Beacon Generator (880Hz / 440Hz Pulse)
  // -------------------------------------------------------------
  const startAcousticBeacon = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const playPulse = () => {
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      };

      playPulse();
      beaconIntervalRef.current = setInterval(playPulse, 1200);
      setAcousticActive(true);
    } catch (e) {
      console.warn('AudioContext beacon init error:', e);
    }
  }, []);

  const stopAcousticBeacon = useCallback(() => {
    if (beaconIntervalRef.current) {
      clearInterval(beaconIntervalRef.current);
      beaconIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setAcousticActive(false);
  }, []);

  const toggleAcousticBeacon = () => {
    if (acousticActive) stopAcousticBeacon();
    else startAcousticBeacon();
  };

  // -------------------------------------------------------------
  // 3. Optical Strobe Light (SOS Flash Pattern)
  // -------------------------------------------------------------
  useEffect(() => {
    let strobeTimer: NodeJS.Timeout | null = null;
    if (strobeActive) {
      const overlay = document.getElementById('strobe-overlay');
      let isOn = false;
      strobeTimer = setInterval(() => {
        isOn = !isOn;
        if (overlay) overlay.style.opacity = isOn ? '0.92' : '0.0';
      }, 150);
    } else {
      const overlay = document.getElementById('strobe-overlay');
      if (overlay) overlay.style.opacity = '0.0';
    }
    return () => {
      if (strobeTimer) clearInterval(strobeTimer);
    };
  }, [strobeActive]);

  // -------------------------------------------------------------
  // 4. Sync with CivicPulse 2-Way Backend API & Siren Receiver
  // -------------------------------------------------------------
  const pollSync = useCallback(async () => {
    try {
      const res = await fetch('/api/citizen-sync', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.recentPings) {
          setAllRecentPings(data.recentPings);
          if (activeSOSBeacon) {
            const updated = data.recentPings.find((p: CitizenPing) => p.id === activeSOSBeacon.id);
            if (updated) {
              setActiveSOSBeacon(updated);

              // Check if SOS status was updated by EOC to ACKNOWLEDGED or DISPATCHED
              if (
                (updated.status === 'ACKNOWLEDGED' || updated.status === 'DISPATCHED') &&
                lastHandledSosStatusRef.current !== updated.status
              ) {
                lastHandledSosStatusRef.current = updated.status;
                setSirenEventData({
                  title: updated.status === 'DISPATCHED' ? '🚨 SOS ACKNOWLEDGED & RESCUE DISPATCHED' : '🚨 SOS ACKNOWLEDGED BY FEMA EOC',
                  message: updated.alertMessage || 'FEMA EOC Incident Command has locked your GPS coordinates and dispatched nearest response team.',
                  assignedUnit: updated.assignedUnit || 'Phoenix Fire Rescue Unit #04 / EMS Medic-04',
                  etaMinutes: updated.etaMinutes || 4,
                  acknowledgedBy: updated.acknowledgedBy || 'Battalion Chief Marcus Vance • FEMA Task Force 1',
                  acknowledgedAt: updated.acknowledgedAt || 'Just now',
                  isBroadcast: false
                });
                setIsSirenModalOpen(true);
                startEmergencySirenSound();
              }
            }
          }
        }

        // Check if there is an active broadcast siren from the EOC
        if (data.broadcastState?.activeSirenAlert) {
          const alert = data.broadcastState.activeSirenAlert;
          if (alert.active && alert.id !== lastHandledSirenAlertIdRef.current) {
            lastHandledSirenAlertIdRef.current = alert.id;
            setSirenEventData({
              title: alert.title,
              message: alert.message,
              acknowledgedBy: alert.sender,
              acknowledgedAt: alert.timeFormatted,
              isBroadcast: true
            });
            setIsSirenModalOpen(true);
            startEmergencySirenSound();
          }
        }
      }
    } catch (e) {
      console.warn('Citizen sync poll failed:', e);
    }
  }, [activeSOSBeacon, startEmergencySirenSound]);

  useEffect(() => {
    pollSync();
    const interval = setInterval(pollSync, 2500);
    return () => clearInterval(interval);
  }, [pollSync]);

  // -------------------------------------------------------------
  // 5. Fetch Live NOAA / Open-Meteo Data from CivicPulse Pipeline
  // -------------------------------------------------------------
  const applyZoneTelemetry = useCallback((zone: LiveZoneTelemetry) => {
    setSelectedZoneId(zone.id);
    setLocationName(`${zone.name}, ${zone.metro}`);
    setUserCoords({ lat: zone.lat, lng: zone.lng });

    const profile = getCityTelemetry(zone.id, zone.name, zone.metro);

    const tempF = zone.temperatureF !== null && zone.temperatureF !== undefined ? zone.temperatureF : profile.tempF;
    const tempC = zone.temperatureC !== null && zone.temperatureC !== undefined ? zone.temperatureC : profile.tempC;
    const feelsC = zone.apparentTempF !== null && zone.apparentTempF !== undefined ? Number(((zone.apparentTempF - 32) * 5 / 9).toFixed(1)) : profile.feelsLikeC;
    const hum = zone.humidityPct !== null && zone.humidityPct !== undefined ? zone.humidityPct : profile.humidityPct;
    const wind = zone.windSpeedMph !== null && zone.windSpeedMph !== undefined ? Math.round(zone.windSpeedMph * 1.609) : profile.windSpeedKm;
    const rain = zone.precipitationIn !== null && zone.precipitationIn !== undefined ? Math.round(zone.precipitationIn * 25.4 * 10) / 10 : profile.precipitationMm;
    const risk = zone.liveRiskScore !== null && zone.liveRiskScore !== undefined ? zone.liveRiskScore : profile.riskScore;

    setLiveTempC(tempC);
    setLiveTempF(tempF);
    setLiveFeelsLikeC(feelsC);
    setLiveHumidity(hum);
    setLiveWindSpeedKm(wind);
    setLiveRainIntensity(rain);
    setLiveRainProb(profile.rainProb);
    setLiveRiskScore(risk);
    setLiveRiskLevel(profile.riskLevel);
    setActionWindowHours(profile.actionWindowHours);
    setHeroTitle(profile.heroTitle);
    setHeroDesc(profile.heroDesc);
    setSurgeDepthM(profile.surgeDepthM);
    setWeatherCondition(profile.weatherCondition);
    setThunderstormProb(profile.thunderstormProb);
    setCloudburstProb(profile.cloudburstProb);
    setFlashFloodProb(profile.flashFloodProb);
  }, []);

  const fetchCivicPulseLiveData = useCallback(async () => {
    try {
      const res = await fetch('/api/live-data', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.zones && data.zones.length > 0) {
          setMonitoredZones(data.zones);
          const current = data.zones.find((z: LiveZoneTelemetry) => z.id === selectedZoneId) || data.zones[0];
          if (current) {
            applyZoneTelemetry(current);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch CivicPulse live telemetry:', err);
    }
  }, [selectedZoneId, applyZoneTelemetry]);

  useEffect(() => {
    fetchCivicPulseLiveData();
    const interval = setInterval(fetchCivicPulseLiveData, 60000);
    return () => clearInterval(interval);
  }, [fetchCivicPulseLiveData]);

  // -------------------------------------------------------------
  // 6. Trigger SOS Distress Signal
  // -------------------------------------------------------------

  // -------------------------------------------------------------
  // 7. Trigger SOS Distress Signal
  // -------------------------------------------------------------
  const handleTriggerSOS = async () => {
    setIsSendingSOS(true);
    try {
      const res = await fetch('/api/citizen-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_SOS',
          ping: {
            type: selectedSOSCategory,
            zoneId: 'zone-phx-core',
            metro: locationName,
            lat: userCoords.lat,
            lng: userCoords.lng,
            address: `${locationName} • Lat ${userCoords.lat.toFixed(4)}, Lng ${userCoords.lng.toFixed(4)}`,
            notes: `${sosNotes || 'High-priority distress signal transmitted from citizen handset.'} [Persons: ${peopleCount}${hasInfant ? ', Infant Present' : ''}${hasElderly ? ', Senior Present' : ''}${hasMedicalOxygen ? ', Oxygen Required' : ''}]`
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ping) {
          setActiveSOSBeacon(data.ping);
          lastHandledSosStatusRef.current = 'PENDING';
          setActiveTab('SOS');
        }
      }
    } catch (err) {
      console.error('SOS submit error:', err);
    } finally {
      setIsSendingSOS(false);
    }
  };

  // -------------------------------------------------------------
  // 8. Safe Check-in
  // -------------------------------------------------------------
  const handleCheckInSafe = async () => {
    try {
      const res = await fetch('/api/citizen-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_PING',
          ping: {
            type: 'SAFE',
            zoneId: 'zone-phx-core',
            metro: locationName,
            lat: userCoords.lat,
            lng: userCoords.lng,
            notes: 'Citizen confirmed safe at residence via mobile portal'
          }
        })
      });
      if (res.ok) {
        setIsSafeCheckedIn(true);
        setVerifiedSafeCount((c) => c + 1);
        setFamilyMembers(prev => prev.map(m => m.relation === 'Self' ? { ...m, status: 'SAFE', lastUpdated: 'Just now' } : m));
      }
    } catch (e) {
      console.error('Safe check in error:', e);
      setIsSafeCheckedIn(true);
    }
  };

  // -------------------------------------------------------------
  // 9. Officer Dispatch Handset Action
  // -------------------------------------------------------------
  const handleOfficerDispatch = async (pingId: string) => {
    try {
      const res = await fetch('/api/citizen-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DISPATCH_RESCUE',
          pingId,
          assignedUnit: 'Phoenix Fire Rescue Unit #04 / EMS Medic-04',
          etaMinutes: 4,
          acknowledgedBy: 'Battalion Chief Marcus Vance • Phoenix Fire & FEMA Task Force 1'
        })
      });
      if (res.ok) {
        pollSync();
      }
    } catch (e) {
      console.error('Officer dispatch error:', e);
    }
  };

  // -------------------------------------------------------------
  // 10. Audio Broadcast
  // -------------------------------------------------------------
  const toggleAudioAlert = () => {
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
    } else {
      const text = `Official Early Warning Broadcast for ${locationName}. Current temperature is ${liveTempC} degrees Celsius. Threat level is ${liveRiskScore} out of 100. Please review designated safe evacuation routes and relief centers.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis?.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  // -------------------------------------------------------------
  // 11. Shortest Safe Evacuation Navigation HUD & Audio Guidance
  // -------------------------------------------------------------
  const handleToggleNavigation = () => {
    if (isNavigating) {
      window.speechSynthesis?.cancel();
      setIsNavigating(false);
    } else {
      setIsNavigating(true);
      const shelters = getSheltersForZone(selectedZoneId, locationName, monitoredZones.find(z => z.id === selectedZoneId)?.metro || 'Phoenix, AZ');
      const primary = shelters[0];
      const text = `Starting shortest safe evacuation route to ${primary.name}. Proceed North via high-ground safe corridor for zero point four miles. Safe elevation confirmed at 370 meters above sea level.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      window.speechSynthesis?.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] flex flex-col justify-center items-center py-0 sm:py-6 px-0 sm:px-4 text-[#263238] font-sans antialiased selection:bg-[#0f766e] selection:text-white relative">
      
      {/* Visual Strobe Overlay for Night Signaling */}
      <div 
        id="strobe-overlay" 
        className="fixed inset-0 bg-white z-[999] pointer-events-none transition-opacity duration-75 opacity-0"
      />

      {/* Clean Mobile Phone Shell (Exact Phone Grid Length & Frame) */}
      <div className="w-full max-w-[420px] h-[100dvh] sm:h-[880px] sm:max-h-[94vh] sm:my-auto bg-[#F5F1E8] sm:rounded-[42px] sm:border-[7px] sm:border-slate-800 sm:shadow-[0_25px_60px_rgba(0,0,0,0.65)] flex flex-col relative overflow-hidden bg-tactical-grid">
        
        {/* 1. ANDROID STATUS BAR (Deep Tactical Charcoal) */}
        <div className="h-7 bg-[#2D2421] text-[#E5CDC6] px-4 flex items-center justify-between text-[11px] font-mono font-bold shrink-0 z-50">
          <span>{clockTime}</span>
          <div className="w-16 h-3 bg-black/40 rounded-full mx-auto" />
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0d9488] text-white font-bold">5G GPS</span>
            <Wifi className="w-3.5 h-3.5 text-[#CCA298]" />
            <span className="text-[10px] text-[#0d9488] font-bold">88% ⚡</span>
          </div>
        </div>

        {/* 2. OFFICIAL CIVICPULSE HEADER (Warm Clay #E5CDC6 + Teal #0f766e + Activity Icon) */}
        <header 
          style={{ backgroundColor: '#E5CDC6', borderColor: '#CCA298' }}
          className="text-[#263238] px-3.5 py-2.5 shadow-xs z-40 sticky top-0 border-b shrink-0"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div 
                style={{ backgroundColor: '#FFFDF8', borderColor: '#CCA298' }}
                className="w-7 h-7 border flex items-center justify-center rounded-lg shrink-0 shadow-sm"
              >
                <Activity className="h-4 w-4 text-[#0f766e]" strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-xs sm:text-sm tracking-wider uppercase text-[#263238] font-mono leading-none">
                    CIVICPULSE
                  </span>
                  <span className="text-[7.5px] bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                    NOAA / FEMA
                  </span>
                </div>
                <p className="text-[8px] text-[#5A4D49] uppercase font-mono tracking-wider mt-0.5">
                  Civilian Emergency & Climate Lifeline
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <a
                href="/"
                title="Open Main CivicPulse EOC Command Portal"
                style={{ backgroundColor: '#FFFDF8', borderColor: '#CCA298' }}
                className="px-2 py-1 rounded-lg text-[9.5px] font-mono font-bold text-[#0f766e] border hover:bg-[#FAF8F2] transition shadow-xs flex items-center space-x-0.5 cursor-pointer"
              >
                <span>🏛️</span>
                <span className="hidden xs:inline">EOC</span>
              </a>

              <button 
                onClick={() => {
                  setActiveTab('DEMO');
                  setLiveRiskScore(88);
                  setLiveRiskLevel('CRITICAL RISK INDEX');
                  setActionWindowHours(2.5);
                  setHeroTitle('CRITICAL: Severe Inundation & Flash Flood Surge');
                  setHeroDesc('Heavy convective rainfall (120 mm/h). Evacuation routes active.');
                  setSurgeDepthM(2.8);
                  setLiveRainIntensity(120);
                }}
                title="Launch CivicPulse Simulation Demo" 
                className="px-2 py-1 rounded-lg text-[9.5px] font-mono font-bold bg-[#0d9488] hover:bg-[#0f766e] text-white transition shadow-xs flex items-center space-x-0.5 border border-[#0d9488] cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3 h-3 text-white" />
                <span>Demo</span>
              </button>

              <button 
                onClick={() => {
                  setIsOfficerMode(!isOfficerMode);
                  if (!isOfficerMode) setActiveTab('PROFILE');
                  else setActiveTab('NOWCAST');
                }}
                style={{ backgroundColor: isOfficerMode ? '#DC2626' : '#FFFDF8', borderColor: isOfficerMode ? '#991B1B' : '#CCA298', color: isOfficerMode ? '#FFFFFF' : '#263238' }}
                className="px-2 py-1 rounded-lg text-[9.5px] font-mono font-bold transition border cursor-pointer shadow-xs"
              >
                {isOfficerMode ? '🚨 Officer' : '👤 Citizen'}
              </button>
            </div>
          </div>
        </header>

        {/* 3. SCROLLABLE SCREEN CONTENT CONTAINER (PHONE VIEWPORT) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3.5 space-y-3.5 pb-20 bg-[#F5F1E8] bg-tactical-grid">
          
          {/* ========================================================================= */}
          {/* GLOBAL US MUNICIPAL ZONE & NOAA METRO SELECTOR (PERSISTENT ACROSS TABS)    */}
          {/* ========================================================================= */}
          <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-2.5 rounded-2xl shadow-xs space-y-2">
            
            {/* Clean Dropdown Row with GPS & Refresh Controls (Exact Match to Reference Photo) */}
            <div className="flex items-center gap-1.5">
              {/* Styled US Locations Dropdown */}
              <div className="relative flex-1 flex items-center">
                <div className="absolute left-2.5 pointer-events-none text-rose-600 flex items-center text-xs">
                  <span>📍</span>
                </div>
                
                <select
                  aria-label="Select United States Location"
                  value={selectedZoneId}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    setSelectedZoneId(targetId);
                    const zone = monitoredZones.find(z => z.id === targetId);
                    if (zone) {
                      applyZoneTelemetry(zone);
                    }
                  }}
                  className="w-full bg-[#FFFDF8] hover:bg-[#FAF8F2] text-[#0f766e] border border-[#0d9488]/60 focus:border-[#0d9488] text-[11px] font-mono font-bold pl-7 pr-7 py-2 rounded-xl outline-none shadow-xs cursor-pointer transition-all appearance-none truncate"
                >
                  {monitoredZones.map((z) => {
                    const tempStr = z.temperatureF !== null ? `(${z.temperatureF.toFixed(0)}°F)` : '';
                    return (
                      <option key={z.id} value={z.id} className="bg-[#FFFDF8] text-[#263238] font-sans font-medium py-1">
                        📍 {z.name} — {z.metro} {tempStr}
                      </option>
                    );
                  })}
                </select>

                <ChevronDown className="w-4 h-4 text-[#0d9488] absolute right-2.5 pointer-events-none" />
              </div>

              {/* 📍 GPS MY LOCATION Button */}
              <button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      const lat = pos.coords.latitude;
                      const lng = pos.coords.longitude;
                      setUserCoords({ lat, lng });
                      let closest = monitoredZones[0];
                      let minDist = Infinity;
                      monitoredZones.forEach(z => {
                        const d = Math.hypot(z.lat - lat, z.lng - lng);
                        if (d < minDist) {
                          minDist = d;
                          closest = z;
                        }
                      });
                      if (closest) {
                        applyZoneTelemetry(closest);
                      }
                    });
                  }
                }}
                title="Lock onto GPS Coordinates (My Location)"
                className="px-2.5 py-2 bg-[#FAF8F2] hover:bg-[#E5CDC6] border border-[#DDD5C7] text-[#0f766e] rounded-xl text-[10px] font-mono font-bold shrink-0 cursor-pointer transition shadow-xs flex items-center gap-1 active:scale-95"
              >
                <Crosshair className="w-3.5 h-3.5 text-[#0d9488]" />
                <span className="hidden xs:inline">GPS</span>
              </button>

              {/* 🔄 Refresh Live Feeds */}
              <button
                type="button"
                onClick={() => fetchCivicPulseLiveData()}
                title="Refresh Live NOAA & CivicPulse Feeds"
                className="p-2 bg-[#FAF8F2] hover:bg-[#E5CDC6] border border-[#DDD5C7] text-[#0f766e] rounded-xl shrink-0 cursor-pointer transition shadow-xs active:scale-95"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#0d9488]" />
              </button>
            </div>

            {/* Sub-bar with Live Location */}
            <div className="flex items-center justify-between text-[9.5px] text-[#5A4D49] pt-1 border-t border-[#DDD5C7] font-mono">
              <div className="flex items-center gap-1 truncate max-w-full">
                <span className="text-rose-600">●</span>
                <span className="truncate">Active: <b>{locationName}</b></span>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* TAB 1: NOWCAST (FIRST PAGE — ALL 9 OFFICIAL CIVICPULSE SECTIONS)           */}
          {/* ========================================================================= */}
          {activeTab === 'NOWCAST' && (
            <div className="space-y-3.5">
              
              {/* SECTION 1: HERO RISK STATUS BANNER CARD */}
              <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 font-mono ${
                    liveRiskScore >= 75 
                      ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#F87171]/40' 
                      : liveRiskScore >= 40 
                        ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]' 
                        : 'bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${liveRiskScore >= 75 ? 'bg-[#DC2626]' : liveRiskScore >= 40 ? 'bg-[#D97706]' : 'bg-[#0d9488]'} inline-block`} />
                    <span>{liveRiskLevel}</span>
                  </span>

                  <div className="text-right font-mono">
                    <span className="text-[8.5px] uppercase font-bold text-[#6B6F6B] block tracking-wider">ACTION WINDOW</span>
                    <span className="text-sm font-black text-[#263238]">{actionWindowHours} hrs</span>
                  </div>
                </div>

                <div>
                  <h2 className="text-base font-black text-[#263238] leading-tight">
                    {heroTitle}
                  </h2>
                  <p className="text-xs text-[#5A4D49] mt-1 leading-relaxed">
                    {heroDesc}
                  </p>
                </div>

                {/* 3 Telemetry Metrics Chips */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2 bg-[#FAF8F2] rounded-2xl border border-[#DDD5C7]">
                    <span className="text-[8px] font-bold text-[#6B6F6B] uppercase block">THREAT LEVEL</span>
                    <span className="text-sm font-black text-[#263238]">{liveRiskScore}<span className="text-[9px] text-[#6B6F6B] font-normal">/100</span></span>
                  </div>
                  <div className="p-2 bg-[#FAF8F2] rounded-2xl border border-[#DDD5C7]">
                    <span className="text-[8px] font-bold text-[#6B6F6B] uppercase block">SURGE DEPTH</span>
                    <span className="text-sm font-black text-[#0f766e]">+{surgeDepthM}m</span>
                  </div>
                  <div className="p-2 bg-[#FAF8F2] rounded-2xl border border-[#DDD5C7]">
                    <span className="text-[8px] font-bold text-[#6B6F6B] uppercase block">PRECIPITATION</span>
                    <span className="text-sm font-black text-[#263238]">{liveRainIntensity} <span className="text-[9px] text-[#6B6F6B] font-normal">mm/h</span></span>
                  </div>
                </div>

                {/* 2 Main Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                  <button
                    onClick={() => setActiveTab('EVACUATE')}
                    className="py-2.5 bg-[#0f766e] hover:bg-[#0d9488] text-white font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Evacuate Safe Route</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('SOS')}
                    className="py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>Send SOS Distress</span>
                  </button>
                </div>
              </div>

              {/* SECTION 3: AI PREDICTIVE MATRIX (2-6H NOWCAST) CARD */}
              <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-[#E8F5EF] border border-[#0d9488]/30 flex items-center justify-center text-sm shadow-xs shrink-0 text-[#0f766e]">
                      🧠
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[#263238] uppercase tracking-tight font-mono">AI PREDICTIVE MATRIX (2–6H NOWCAST)</h3>
                      <p className="text-[9px] text-[#6B6F6B] font-mono">Spatiotemporal Transformer &bull; Multi-Task Learning</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsXaiModalOpen(true)}
                    className="px-2.5 py-1 bg-[#FAF8F2] hover:bg-[#E5CDC6] text-[#0f766e] border border-[#DDD5C7] rounded-xl text-[10px] font-mono font-bold flex items-center space-x-1 shadow-xs cursor-pointer transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#0d9488]" />
                    <span>XAI Triggers</span>
                  </button>
                </div>

                {/* 3 MTL Output Head Boxes */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2 bg-[#FAF8F2] rounded-2xl border border-[#DDD5C7]">
                    <span className="text-[8px] font-bold text-[#B45309] uppercase block">🌡️ THERMAL SURGE</span>
                    <span className="text-base font-black text-[#263238]">{liveRiskScore}%</span>
                    <span className="text-[8px] font-bold text-[#B45309] block mt-0.5 uppercase">
                      {liveTempF >= 100 ? 'CRITICAL PEAK' : liveTempF >= 88 ? 'ELEVATED' : 'MODERATE'}
                    </span>
                  </div>

                  <div className="p-2 bg-[#FAF8F2] rounded-2xl border border-[#DDD5C7]">
                    <span className="text-[8px] font-bold text-[#0f766e] uppercase block">⚡ GRID & SQUALL</span>
                    <span className="text-base font-black text-[#263238]">{thunderstormProb}%</span>
                    <span className="text-[8px] text-[#0f766e] block mt-0.5 font-bold">
                      {thunderstormProb > 60 ? 'HIGH LOAD' : 'MONITORING'}
                    </span>
                  </div>

                  <div className="p-2 bg-[#FAF8F2] rounded-2xl border border-[#DDD5C7]">
                    <span className="text-[8px] font-bold text-[#991B1B] uppercase block">🌊 PLUVIAL INUNDATION</span>
                    <span className="text-base font-black text-[#263238]">{flashFloodProb}%</span>
                    <span className="text-[8px] text-[#991B1B] block mt-0.5 font-bold">
                      {cloudburstProb > 50 ? `${cloudburstProb}% Burst` : `+${surgeDepthM}m Surge`}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: TODAY'S WEATHER CARD */}
              <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <div className="flex items-center space-x-1 text-xs font-black text-[#263238] uppercase">
                    <Sun className="w-4 h-4 text-[#D97706]" />
                    <span>TODAY&apos;S ATMOSPHERIC VITALS</span>
                  </div>
                  <span className="text-[9px] text-[#6B6F6B]">Updated: {clockTime}</span>
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-baseline space-x-1 font-mono">
                      <span className="text-3xl font-black text-[#263238]">{liveTempC}°</span>
                      <span className="text-sm font-bold text-[#6B6F6B]">C</span>
                      <span className="text-[#DDD5C7] mx-1">/</span>
                      <span className="text-xl font-bold text-[#5A4D49]">{liveTempF}°</span>
                      <span className="text-xs font-bold text-[#6B6F6B]">F</span>
                    </div>
                    <div className="text-[11px] text-[#5A4D49] mt-0.5">
                      Feels like <b>{liveFeelsLikeC}°C</b> &bull; {weatherCondition}
                    </div>
                    <div className="text-[9.5px] text-[#6B6F6B] mt-0.5 font-mono">
                      CivicPulse Real-Time Telemetry Node
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-[#E8F5EF] border border-[#0d9488]/40 text-[#0f766e] rounded-full text-[10px] font-mono font-bold flex items-center space-x-1 shadow-xs">
                    <CloudRain className="w-3.5 h-3.5 text-[#0d9488]" />
                    <span>{liveRainProb}% Rain Prob</span>
                  </span>
                </div>

                {/* 3 Environmental Vitals Chips */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2 bg-[#FAF8F2] rounded-2xl border border-[#DDD5C7]">
                    <span className="text-[8px] font-bold text-[#6B6F6B] uppercase block">PRECIPITATION</span>
                    <span className="text-xs font-black text-[#263238]">{liveRainIntensity} mm/h</span>
                  </div>
                  <div className="p-2 bg-[#FAF8F2] rounded-2xl border border-[#DDD5C7]">
                    <span className="text-[8px] font-bold text-[#6B6F6B] uppercase block">HUMIDITY</span>
                    <span className="text-xs font-black text-[#263238]">{liveHumidity}%</span>
                  </div>
                  <div className="p-2 bg-[#FAF8F2] rounded-2xl border border-[#DDD5C7]">
                    <span className="text-[8px] font-bold text-[#6B6F6B] uppercase block">WIND SPEED</span>
                    <span className="text-xs font-black text-[#263238]">{liveWindSpeedKm} km/h</span>
                  </div>
                </div>

                <div className="text-[8.5px] text-[#6B6F6B] border-t border-[#DDD5C7] pt-1.5 flex justify-between font-mono">
                  <span>Source: CivicPulse AI Risk Engine & NOAA Ensembles</span>
                  <span className="font-bold text-[#0f766e]">● Live Node</span>
                </div>
              </div>

              {/* SECTION 5: TODAY'S HOURLY NOWCAST CARD */}
              <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-3xl p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between font-mono">
                  <div className="flex items-center space-x-1 text-xs font-black text-[#263238] uppercase">
                    <Clock className="w-4 h-4 text-[#0f766e]" />
                    <span>TODAY&apos;S HOURLY NOWCAST</span>
                  </div>
                  <button onClick={() => setIsXaiModalOpen(true)} className="text-[9.5px] text-[#0f766e] font-bold hover:underline cursor-pointer">
                    View Full 24h Table ➔
                  </button>
                </div>

                <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-thin text-center font-mono">
                  {[
                    { time: 'Now', temp: Math.round(liveTempC), prob: `${liveRainProb}%`, badge: liveRiskScore >= 75 ? 'Critical' : liveRiskScore >= 40 ? 'Moderate' : 'Advisory', badgeColor: liveRiskScore >= 75 ? 'bg-[#DC2626] text-white' : liveRiskScore >= 40 ? 'bg-[#D97706] text-white' : 'bg-[#0f766e] text-white', active: true },
                    { time: '03:00 PM', temp: Math.round(liveTempC + 0.5), prob: `${Math.min(99, liveRainProb + 12)}%`, badge: liveRiskScore >= 75 ? 'Critical' : liveRiskScore >= 40 ? 'Moderate' : 'Advisory', badgeColor: liveRiskScore >= 75 ? 'bg-[#DC2626] text-white' : liveRiskScore >= 40 ? 'bg-[#D97706] text-white' : 'bg-[#0f766e] text-white', active: false },
                    { time: '04:00 PM', temp: Math.round(liveTempC + 1.0), prob: `${Math.min(99, liveRainProb + 25)}%`, badge: liveRiskScore >= 75 ? 'Critical' : 'Moderate', badgeColor: liveRiskScore >= 75 ? 'bg-[#DC2626] text-white' : 'bg-[#D97706] text-white', active: false },
                    { time: '05:00 PM', temp: Math.round(liveTempC - 1.0), prob: `${Math.max(5, liveRainProb - 5)}%`, badge: liveRiskScore >= 75 ? 'Critical' : 'Moderate', badgeColor: liveRiskScore >= 75 ? 'bg-[#DC2626] text-white' : 'bg-[#D97706] text-white', active: false },
                    { time: '06:00 PM', temp: Math.round(liveTempC - 3.0), prob: `${Math.max(5, liveRainProb - 10)}%`, badge: liveRiskScore >= 75 ? 'Critical' : 'Advisory', badgeColor: liveRiskScore >= 75 ? 'bg-[#DC2626] text-white' : 'bg-[#0f766e] text-white', active: false },
                    { time: '07:00 PM', temp: Math.round(liveTempC - 4.5), prob: `${Math.max(5, liveRainProb - 15)}%`, badge: 'Advisory', badgeColor: 'bg-[#0f766e] text-white', active: false },
                  ].map((h, i) => (
                    <div 
                      key={i} 
                      className={`min-w-[68px] p-2 rounded-2xl border flex flex-col items-center justify-between space-y-1 ${
                        h.active 
                          ? 'bg-[#0f766e] text-white border-[#0d9488] shadow-sm' 
                          : 'bg-[#FAF8F2] text-[#263238] border-[#DDD5C7]'
                      }`}
                    >
                      <span className={`text-[9px] font-bold ${h.active ? 'text-[#E8F5EF]' : 'text-[#6B6F6B]'}`}>{h.time}</span>
                      <CloudRain className={`w-4 h-4 ${h.active ? 'text-[#FEF3C7]' : 'text-[#0d9488]'}`} />
                      <span className="text-xs font-black">{h.temp}°</span>
                      <span className={`text-[8.5px] ${h.active ? 'text-[#E8F5EF]' : 'text-[#0f766e] font-bold'}`}>{h.prob}</span>
                      <span className={`text-[7.5px] px-1 py-0.2 rounded font-bold uppercase tracking-wider ${h.badgeColor}`}>
                        {h.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 6: TODAY'S PRECAUTION ENGINE CARD */}
              <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-3xl p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between font-mono">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-[#263238] uppercase">
                    <ShieldCheck className="w-4 h-4 text-[#0f766e]" />
                    <span>TODAY&apos;S PRECAUTION ENGINE</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 text-[9px] font-bold">
                    AI Recommended
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="p-3 bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-bold font-mono">
                      <span className="px-1.5 py-0.2 bg-[#E8F5EF] text-[#0f766e] rounded uppercase font-black">ADVISORY</span>
                      <span className="text-[#6B6F6B]">🕒 Throughout Today</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs font-black text-[#263238] pt-0.5">
                      <span>☂️</span>
                      <span>Hydration & Thermal Mitigation Protocol</span>
                    </div>
                    <p className="text-[11px] text-[#5A4D49] leading-tight">
                      <b>Why:</b> Sustained ambient heat conditions across the urban corridor.
                    </p>
                    <p className="text-[10.5px] text-[#6B6F6B]">
                      Drink regular electrolytes, avoid prolonged exposure, and locate cooling stations.
                    </p>
                  </div>

                  <div className="p-3 bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-bold font-mono">
                      <span className="px-1.5 py-0.2 bg-[#FEF3C7] text-[#92400E] rounded uppercase font-black">CAUTION</span>
                      <span className="text-[#6B6F6B]">🕒 Next 2 Hours</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs font-black text-[#263238] pt-0.5">
                      <span>⚡</span>
                      <span>Peak Solar Radiation & Squall Precaution</span>
                    </div>
                    <p className="text-[11px] text-[#5A4D49] leading-tight">
                      <b>Why:</b> Atmospheric convective instability and high solar radiance.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 7: NEXT 7 DAYS FORECAST */}
              <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-3xl p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between font-mono">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-[#263238] uppercase">
                    <Clock className="w-4 h-4 text-[#0f766e]" />
                    <span>NEXT 7 DAYS FORECAST</span>
                  </div>
                  <span className="text-[9.5px] text-[#6B6F6B]">Tap day for details</span>
                </div>

                <div className="space-y-1.5">
                  {[
                    { day: 'Today', date: 'Sep 20', condition: weatherCondition, high: Math.round(liveTempC), low: Math.max(8, Math.round(liveTempC - (liveTempC > 35 ? 12 : 8))), rainProb: `${liveRainProb}% Rain`, risk: liveRiskScore >= 75 ? 'Critical' : liveRiskScore >= 40 ? 'Caution' : 'Advisory', riskColor: liveRiskScore >= 75 ? 'text-[#DC2626] font-bold' : liveRiskScore >= 40 ? 'text-[#D97706] font-bold' : 'text-[#0f766e] font-bold' },
                    { day: 'Tomorrow', date: 'Sep 21', condition: liveRiskScore >= 75 ? (liveRainIntensity > 10 ? 'Heavy Tropical Storm' : 'Sustained Thermal Surge') : (liveRainIntensity > 5 ? 'Scattered Showers' : 'Partly Cloudy'), high: Math.round(liveTempC + 1), low: Math.max(8, Math.round(liveTempC - (liveTempC > 35 ? 11 : 7))), rainProb: `${Math.min(95, Math.max(5, liveRainProb - 5))}% Rain`, risk: liveRiskScore >= 75 ? 'Critical' : 'Advisory', riskColor: liveRiskScore >= 75 ? 'text-[#DC2626] font-bold' : 'text-[#0f766e] font-bold' },
                    { day: 'Tue', date: 'Sep 22', condition: liveRainIntensity > 10 ? 'Convective Downpour' : (liveRiskScore >= 75 ? 'Excessive Heat Advisory' : 'Convective Squall Watch'), high: Math.round(liveTempC - 2), low: Math.max(8, Math.round(liveTempC - (liveTempC > 35 ? 13 : 9))), rainProb: `${Math.min(95, liveRainProb + 20)}% Rain`, risk: liveRiskScore >= 60 ? 'Critical' : 'Caution', riskColor: liveRiskScore >= 60 ? 'text-[#DC2626] font-bold' : 'text-[#D97706] font-bold' },
                    { day: 'Wed', date: 'Sep 23', condition: 'Thunderstorm Front', high: Math.round(liveTempC - 4), low: Math.max(7, Math.round(liveTempC - (liveTempC > 35 ? 14 : 10))), rainProb: `${Math.min(95, liveRainProb + 30)}% Rain`, risk: 'Caution', riskColor: 'text-[#D97706] font-bold' },
                    { day: 'Thu', date: 'Sep 24', condition: 'Moderate Showers', high: Math.round(liveTempC - 5), low: Math.max(7, Math.round(liveTempC - (liveTempC > 35 ? 15 : 11))), rainProb: '45% Rain', risk: 'Caution', riskColor: 'text-[#D97706] font-bold' },
                    { day: 'Fri', date: 'Sep 25', condition: 'Clearing & Mild', high: Math.round(liveTempC - 3), low: Math.max(8, Math.round(liveTempC - (liveTempC > 35 ? 13 : 9))), rainProb: '25% Rain', risk: 'Advisory', riskColor: 'text-[#0f766e] font-bold' },
                    { day: 'Sat', date: 'Sep 26', condition: 'Stable Baseline', high: Math.round(liveTempC - 1), low: Math.max(8, Math.round(liveTempC - (liveTempC > 35 ? 12 : 8))), rainProb: '10% Rain', risk: 'Advisory', riskColor: 'text-[#0f766e] font-bold' }
                  ].map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDayDetail(i)}
                      className="w-full p-2 bg-[#FAF8F2] hover:bg-[#E5CDC6]/40 border border-[#DDD5C7] rounded-2xl flex items-center justify-between text-xs transition-colors cursor-pointer text-left font-mono"
                    >
                      <div className="w-20">
                        <div className="font-black text-[#263238] text-[11px]">{d.day}</div>
                        <div className="text-[8.5px] text-[#6B6F6B]">{d.date}</div>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-1">
                        <CloudLightning className="w-3.5 h-3.5 text-[#0f766e] shrink-0" />
                        <span className="text-[10px] text-[#5A4D49] truncate">{d.condition}</span>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-[#263238] text-[11px]">{d.high}° / {d.low}°</div>
                        <div className={`text-[8.5px] ${d.riskColor}`}>{d.rainProb} ({d.risk})</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 8: OFFICIAL DISASTER BULLETINS CARD */}
              <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-3xl p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between font-mono">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-[#263238] uppercase">
                    <Bell className="w-4 h-4 text-[#DC2626]" />
                    <span>OFFICIAL DISASTER BULLETINS</span>
                  </div>
                  <button onClick={() => setActiveTab('ALERTS')} className="text-[9.5px] text-[#0f766e] font-bold hover:underline cursor-pointer">
                    View All ➔
                  </button>
                </div>

                <div className="p-3 bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-bold font-mono">
                    <span className="px-1.5 py-0.2 bg-[#E8F5EF] text-[#0f766e] rounded uppercase font-black">ACTIVE NOW</span>
                    <span className="text-[#6B6F6B]">NOAA / FEMA Watch</span>
                  </div>
                  <h4 className="text-xs font-black text-[#263238]">
                    EXCESSIVE HEAT ADVISORY & RESILIENCE BULLETIN
                  </h4>
                  <p className="text-[11px] text-[#5A4D49] leading-tight">
                    Emergency cooling shelters open 24/7. Paramedic units deployed to critical sectors. Dial 911 for emergency medical distress.
                  </p>
                </div>
              </div>

              {/* SECTION 9: QUICK UTILITY GRID / TOOL TILES */}
              <div className="space-y-2">
                {/* Satellite Banner Tile */}
                <button
                  onClick={() => setIsSatelliteModalOpen(true)}
                  className="w-full bg-[#2D2421] text-[#E5CDC6] p-3 rounded-2xl shadow-sm flex items-center justify-between border border-[#3D332F] hover:border-[#0d9488] transition cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-2.5">
                    <div 
                      style={{ backgroundColor: '#FFFDF8', borderColor: '#CCA298' }}
                      className="w-8 h-8 rounded-xl border flex items-center justify-center text-sm shadow-inner shrink-0"
                    >
                      🛰️
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">NOAA GOES-R / NASA Direct</div>
                      <div className="text-[9px] text-[#CCA298] font-mono">Direct L-Band Emergency Telemetry & Downlink (1694.1 MHz)</div>
                    </div>
                  </div>
                  <span className="text-[9px] bg-[#0d9488] text-white px-2 py-0.5 rounded font-mono font-bold shrink-0">
                    1694 MHz
                  </span>
                </button>

                {/* 2x2 Feature Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setIsBleMeshModalOpen(true)}
                    className="p-3 bg-[#FFFDF8] border border-[#DDD5C7] hover:border-[#0d9488] rounded-2xl flex items-center space-x-2 shadow-xs transition cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#FAF8F2] border border-[#DDD5C7] text-[#0f766e] flex items-center justify-center shrink-0">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[#263238] text-[11px]">BLE Mesh Network</div>
                      <div className="text-[8.5px] text-[#6B6F6B]">Zero-Signal Relay</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('PROFILE')}
                    className="p-3 bg-[#FFFDF8] border border-[#DDD5C7] hover:border-[#0d9488] rounded-2xl flex items-center space-x-2 shadow-xs transition cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#FAF8F2] border border-[#DDD5C7] text-[#0f766e] flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[#263238] text-[11px]">Family Safety</div>
                      <div className="text-[8.5px] text-[#6B6F6B]">{familyMembers.length} Registered &bull; {verifiedSafeCount} Safe</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setIsRiverModalOpen(true)}
                    className="p-3 bg-[#FFFDF8] border border-[#DDD5C7] hover:border-[#0d9488] rounded-2xl flex items-center space-x-2 shadow-xs transition cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#FAF8F2] border border-[#DDD5C7] text-[#0f766e] flex items-center justify-center shrink-0">
                      <Waves className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[#263238] text-[11px]">USGS Hydro Telemetry</div>
                      <div className="text-[8.5px] text-[#6B6F6B]">NWIS Water Sensors</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setIsTransitPassOpen(true)}
                    className="p-3 bg-[#FFFDF8] border border-[#DDD5C7] hover:border-[#0d9488] rounded-2xl flex items-center space-x-2 shadow-xs transition cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#FAF8F2] border border-[#DDD5C7] text-[#0f766e] flex items-center justify-center shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[#263238] text-[11px]">Relief Kit QR Auth</div>
                      <div className="text-[8.5px] text-[#6B6F6B]">Offline Validated</div>
                    </div>
                  </button>
                </div>

                {/* Emergency Hotline Card */}
                <div className="p-3 bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#0f766e] text-white flex items-center justify-center text-sm shadow-xs shrink-0">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#263238]">National Emergency & Disaster Helpline</div>
                      <div className="text-[9px] text-[#5A4D49] font-mono">Emergency: <b>911</b> &bull; FEMA Hotline: <b>1-800-621-3362</b></div>
                    </div>
                  </div>
                  <a
                    href="tel:911"
                    className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer font-mono"
                  >
                    Call 911
                  </a>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: LIVE MAP                                                           */}
          {/* ========================================================================= */}
          {activeTab === 'MAP' && (
            <div className="space-y-3 font-mono">
              <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#263238] flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#0f766e]" />
                    <span>GIS EARLY WARNING TACTICAL MAP</span>
                  </span>
                  <span className="text-[9px] bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 px-2 py-0.5 rounded-full font-bold">
                    CivicPulse GIS Layer
                  </span>
                </div>

                <div className="w-full h-64 bg-[#080d17] rounded-2xl relative overflow-hidden border border-[#DDD5C7] flex flex-col items-center justify-center text-center p-4">
                  <div className="absolute inset-0 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
                  <div className="w-16 h-16 rounded-full border-2 border-[#0d9488]/80 animate-ping absolute" />
                  <div className="w-8 h-8 rounded-full bg-[#0f766e] text-white flex items-center justify-center font-bold text-xs shadow-lg relative z-10 border-2 border-white">
                    📍
                  </div>
                  <div className="relative z-10 text-white mt-3 space-y-1">
                    <div className="text-xs font-bold">{locationName.split(',')[0]} Operations Basin</div>
                    <div className="text-[10px] text-[#E5CDC6]">Lat {userCoords.lat.toFixed(4)}, Lng {userCoords.lng.toFixed(4)}</div>
                    <span className="inline-block px-2 py-0.5 bg-[#0d9488] text-white text-[8px] rounded-full font-bold">
                      Designated Safe Elevation & Cool Zone
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button 
                    onClick={() => setActiveTab('EVACUATE')}
                    className="p-2.5 bg-[#0f766e] hover:bg-[#0d9488] text-white font-bold rounded-xl text-center shadow-xs cursor-pointer transition"
                  >
                    View Safe Corridor ➔
                  </button>
                  <button 
                    onClick={() => setActiveTab('SOS')}
                    className="p-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-xl text-center shadow-xs cursor-pointer transition"
                  >
                    Broadcast SOS Pin ➔
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: CIVICPULSE EMERGENCY SCENARIO SIMULATOR                            */}
          {/* ========================================================================= */}
          {activeTab === 'DEMO' && (
            <div className="space-y-3 font-mono">
              <div 
                style={{ backgroundColor: '#E5CDC6', borderColor: '#CCA298' }}
                className="text-[#263238] rounded-3xl p-4 shadow-sm space-y-2 border"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-[#263238]">
                    <span>🎬</span>
                    <span>CIVICPULSE SCENARIO SIMULATOR</span>
                  </span>
                  <span className="text-[9px] bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 px-2 py-0.5 rounded font-bold">LIVE 2-WAY</span>
                </div>
                <p className="text-[11px] text-[#5A4D49] font-sans">
                  Trigger multi-hazard disaster scenarios to demonstrate real-time telemetry updates and 2-way dispatch sync with the CivicPulse EOC command portal.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setLiveTempF(114);
                    setLiveTempC(45.5);
                    setLiveFeelsLikeC(48.2);
                    setLiveHumidity(12);
                    setLiveWindSpeedKm(18.5);
                    setLiveRiskScore(94);
                    setLiveRiskLevel('CRITICAL RISK INDEX');
                    setActionWindowHours(1.5);
                    setHeroTitle('CRITICAL: Historic Heatwave & Grid Demand Surge (114°F)');
                    setHeroDesc('Peak thermal danger threshold exceeded. Emergency cooling shelters & transit waivers active.');
                    setSurgeDepthM(0.1);
                    setLiveRainIntensity(0);
                    setWeatherCondition('Extreme Thermal Peak');
                    setThunderstormProb(15);
                    setCloudburstProb(5);
                    setFlashFloodProb(94);
                    setActiveTab('NOWCAST');
                  }}
                  className="w-full p-3.5 bg-[#FFFDF8] border border-[#DDD5C7] hover:border-[#DC2626] rounded-2xl flex items-center justify-between shadow-xs transition cursor-pointer text-left"
                >
                  <div>
                    <div className="font-bold text-[#DC2626] text-xs">Scenario A: Extreme Heatwave & Grid Crisis</div>
                    <div className="text-[9.5px] text-[#6B6F6B] font-sans">114°F ambient spike, demand response & paramedic surge</div>
                  </div>
                  <span className="px-2.5 py-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg text-[9px] font-bold">Trigger</span>
                </button>

                <button
                  onClick={() => {
                    setLiveTempF(82);
                    setLiveTempC(27.8);
                    setLiveFeelsLikeC(31.2);
                    setLiveHumidity(92);
                    setLiveWindSpeedKm(45.0);
                    setLiveRiskScore(88);
                    setLiveRiskLevel('CRITICAL RISK INDEX');
                    setActionWindowHours(2.0);
                    setHeroTitle('RED CRITICAL: Severe Cloudburst & Flash Flood (+2.8m)');
                    setHeroDesc('Violent convective rainfall (120 mm/h). Ground floor inundation expected in 2 hrs.');
                    setSurgeDepthM(2.8);
                    setLiveRainIntensity(120);
                    setWeatherCondition('Severe Cloudburst');
                    setThunderstormProb(95);
                    setCloudburstProb(90);
                    setFlashFloodProb(88);
                    setActiveTab('NOWCAST');
                  }}
                  className="w-full p-3.5 bg-[#FFFDF8] border border-[#DDD5C7] hover:border-[#0f766e] rounded-2xl flex items-center justify-between shadow-xs transition cursor-pointer text-left"
                >
                  <div>
                    <div className="font-bold text-[#0f766e] text-xs">Scenario B: Storm Downpour & Flash Flood</div>
                    <div className="text-[9.5px] text-[#6B6F6B] font-sans">120 mm/h rain surge, triggers evacuation corridor</div>
                  </div>
                  <span className="px-2.5 py-1 bg-[#0f766e] hover:bg-[#0d9488] text-white rounded-lg text-[9px] font-bold">Trigger</span>
                </button>

                <button
                  onClick={() => {
                    const defaultZone = monitoredZones[0];
                    if (defaultZone) applyZoneTelemetry(defaultZone);
                    else {
                      setLiveTempF(78);
                      setLiveTempC(25.5);
                      setLiveFeelsLikeC(26.0);
                      setLiveHumidity(45);
                      setLiveWindSpeedKm(8.0);
                      setLiveRiskScore(15);
                      setLiveRiskLevel('NORMAL RISK INDEX');
                      setActionWindowHours(12);
                      setHeroTitle('Atmospheric Baseline Stable');
                      setHeroDesc('Current conditions: Stable weather. Safe for outdoor routines.');
                      setSurgeDepthM(0.2);
                      setLiveRainIntensity(0);
                      setWeatherCondition('Clear & Moderate');
                    }
                    setActiveTab('NOWCAST');
                  }}
                  className="w-full p-3.5 bg-[#FFFDF8] border border-[#DDD5C7] hover:border-[#0d9488] rounded-2xl flex items-center justify-between shadow-xs transition cursor-pointer text-left"
                >
                  <div>
                    <div className="font-bold text-[#263238] text-xs">Reset: Restore Baseline Telemetry</div>
                    <div className="text-[9.5px] text-[#6B6F6B] font-sans">Syncs live conditions from NOAA / Open-Meteo feeds</div>
                  </div>
                  <span className="px-2.5 py-1 bg-[#FAF8F2] border border-[#DDD5C7] text-[#0f766e] hover:bg-[#E5CDC6] rounded-lg text-[9px] font-bold">Reset</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: EVACUATE & SHORTEST SAFE ROUTE VISUALIZER                          */}
          {/* ========================================================================= */}
          {activeTab === 'EVACUATE' && (() => {
            const currentShelters = getSheltersForZone(selectedZoneId, locationName, monitoredZones.find(z => z.id === selectedZoneId)?.metro || 'Phoenix, AZ');
            const primaryShelter = currentShelters[0];

            return (
              <div className="space-y-3 font-mono">
                
                {/* 1. SATELLITE TERRAIN SHORTEST EVACUATION ROUTE MAP (Exact Match to Reference Photo) */}
                <div className="w-full h-72 rounded-3xl relative overflow-hidden border-2 border-[#DDD5C7] shadow-md bg-[#1c242b]">
                  {/* Realistic Topographic / Aerial Satellite Texture Grid */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='320' viewBox='0 0 400 320'%3E%3Crect width='400' height='320' fill='%232c3832'/%3E%3Cpath d='M0 70 Q130 50 210 90 T400 130' stroke='%23222c27' stroke-width='42' fill='none' opacity='0.7'/%3E%3Cpath d='M70 0 Q100 160 150 320' stroke='%233d4b43' stroke-width='24' fill='none' opacity='0.6'/%3E%3Cpath d='M260 0 Q290 170 350 320' stroke='%233d4b43' stroke-width='20' fill='none' opacity='0.6'/%3E%3Cpath d='M0 200 Q190 220 400 190' stroke='%234b5c52' stroke-width='16' fill='none' opacity='0.5'/%3E%3Cg opacity='0.25' fill='%23607568'%3E%3Crect x='25' y='25' width='32' height='28'/%3E%3Crect x='65' y='35' width='42' height='22'/%3E%3Crect x='125' y='18' width='28' height='38'/%3E%3Crect x='225' y='35' width='52' height='28'/%3E%3Crect x='305' y='25' width='38' height='42'/%3E%3Crect x='35' y='115' width='48' height='32'/%3E%3Crect x='195' y='125' width='42' height='38'/%3E%3Crect x='315' y='135' width='48' height='28'/%3E%3Crect x='45' y='235' width='52' height='32'/%3E%3Crect x='155' y='245' width='48' height='42'/%3E%3Crect x='285' y='235' width='62' height='38'/%3E%3C/g%3E%3C/svg%3E")`,
                      backgroundSize: 'cover'
                    }}
                  />

                  {/* SVG Tactical Evacuation Route Overlay */}
                  <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 360 288">
                    <defs>
                      <filter id="hazardGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* 1. BLUE DASHED HAZARD DANGER BASIN CIRCLE */}
                    <circle 
                      cx="170" 
                      cy="155" 
                      r="84" 
                      fill="rgba(2, 132, 199, 0.22)" 
                      stroke="#0284c7" 
                      strokeWidth="2.5" 
                      strokeDasharray="6,4"
                      filter="url(#hazardGlow)"
                    />

                    {/* Outer Hazard Wave Ring */}
                    <circle 
                      cx="170" 
                      cy="155" 
                      r="90" 
                      fill="none" 
                      stroke="#38bdf8" 
                      strokeWidth="1" 
                      strokeDasharray="4,6" 
                      opacity="0.6"
                    />

                    {/* 2. GLOWING GREEN DASHED SHORTEST SAFE EVACUATION ROUTE */}
                    {/* Glowing neon shadow trail */}
                    <path 
                      d="M 170 155 Q 215 105, 278 54" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="7" 
                      strokeOpacity="0.35"
                      filter="url(#routeGlow)"
                    />
                    {/* Main animated dashed green evacuation line */}
                    <path 
                      d="M 170 155 Q 215 105, 278 54" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="4" 
                      strokeDasharray="8,5" 
                      strokeLinecap="round"
                    />

                    {/* 3. USER LOCATION NODE (Inside Danger Basin) */}
                    <circle cx="170" cy="155" r="18" fill="#ea580c" opacity="0.35" />
                    <circle cx="170" cy="155" r="10" fill="#ea580c" stroke="#ffffff" strokeWidth="2.5" />
                    <circle cx="170" cy="155" r="4" fill="#ffffff" />

                    {/* 4. DESTINATION REFUGE MARKER (🟢 Safe Oasis on High Ridge) */}
                    <circle cx="278" cy="54" r="14" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                    <path d="M 273 54 L 276 57 L 283 50" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>

                  {/* TOP FLOATING DESTINATION BADGE (Exact Match to Reference Photo) */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-lg border border-[#DDD5C7] flex items-center gap-2.5 z-20">
                    <div className="w-4 h-4 rounded-full bg-[#10b981] flex items-center justify-center shrink-0 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    </div>
                    <div className="flex-1 min-w-0 font-sans">
                      <div className="font-black text-xs text-[#263238] truncate flex items-center gap-1.5">
                        <span>{primaryShelter.name}</span>
                      </div>
                      <div className="text-[10px] text-[#5A4D49] font-mono flex items-center gap-1.5 truncate mt-0.5">
                        <span>Safe Elevation: <b>370m MSL</b></span>
                        <span>•</span>
                        <span className="text-[#0f766e] font-bold">Distance: {primaryShelter.distance}</span>
                      </div>
                    </div>
                  </div>

                  {/* MAP FOOTER ATTRIBUTION (Leaflet / USGS Satellite) */}
                  <div className="absolute bottom-2 left-2.5 z-20 text-[8.5px] font-mono text-white/90 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                    <span className="text-[#38bdf8]">🇺🇦 Leaflet</span>
                    <span className="text-white/40">|</span>
                    <span>© USGS / NOAA Earth Observation Imagery</span>
                  </div>
                </div>

                {/* 2. TACTICAL DESTINATION ACTION CARD (Exact Match to Reference Photo) */}
                <div className="bg-[#E8F5EF] border-2 border-[#0d9488]/40 rounded-3xl p-4 space-y-3 shadow-sm font-sans">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-sm font-black text-[#263238] leading-tight">
                        Destination: {primaryShelter.name}
                      </h3>
                    </div>
                    <div className="text-xs font-black text-[#0f766e] font-mono shrink-0 whitespace-nowrap">
                      {primaryShelter.distance.split(' ')[0]} mi (Safe Ridge Trail)
                    </div>
                  </div>

                  <p className="text-[11px] text-[#0f766e] font-medium leading-relaxed">
                    Ascend via high-ground safe corridor (370m MSL). Bypasses low-lying blue flood/heat basin.
                  </p>

                  {/* 2 Primary Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                    <button
                      onClick={handleToggleNavigation}
                      className={`py-3 rounded-2xl text-xs font-black flex items-center justify-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer text-white ${
                        isNavigating ? 'bg-[#047857] hover:bg-[#065f46] animate-pulse ring-2 ring-[#10b981]' : 'bg-[#0f766e] hover:bg-[#0d9488]'
                      }`}
                    >
                      <Navigation className="w-4 h-4" />
                      <span>{isNavigating ? 'HUD Active (6m)' : 'Start Navigation'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedSOSCategory('FLOOD_TRAP');
                        setSosNotes(`Rescue requested along high-ground evacuation corridor to ${primaryShelter.name}.`);
                        handleTriggerSOS();
                      }}
                      className="py-3 bg-[#ea580c] hover:bg-[#c2410c] active:scale-95 text-white font-black rounded-2xl text-xs flex items-center justify-center space-x-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Siren className="w-4 h-4 animate-pulse" />
                      <span>Request Rescue Pick</span>
                    </button>
                  </div>
                </div>

                {/* 3. ACTIVE TURN-BY-TURN HUD GUIDANCE (Appears when Start Navigation is clicked) */}
                {isNavigating && (
                  <div className="bg-[#FFFDF8] border-2 border-[#0f766e] rounded-3xl p-4 shadow-md space-y-2.5 font-mono animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center justify-between text-xs font-black text-[#0f766e]">
                      <span className="flex items-center gap-1.5">
                        <Navigation className="w-4 h-4 animate-spin text-[#0d9488]" />
                        <span>LIVE GPS HUD & TURN GUIDANCE</span>
                      </span>
                      <span className="text-[9px] bg-[#E8F5EF] px-2 py-0.5 rounded-full border border-[#0d9488]/40 font-bold">
                        GPS LOCKED (370m MSL)
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-sans">
                      <div className="p-2.5 bg-[#E8F5EF] rounded-xl border border-[#0d9488]/40 flex items-start gap-2.5">
                        <span className="text-base">⬆️</span>
                        <div className="flex-1">
                          <div className="font-black text-xs text-[#0f766e]">Step 1: Head North on Central Corridor (0.1 mi)</div>
                          <div className="text-[10.5px] text-[#5A4D49]">Ascend towards high-ridge intersection away from flood basin.</div>
                        </div>
                        <span className="text-[9px] font-mono text-[#0f766e] font-bold shrink-0">1 min</span>
                      </div>

                      <div className="p-2.5 bg-[#FAF8F2] rounded-xl border border-[#DDD5C7] flex items-start gap-2.5 opacity-80">
                        <span className="text-base">↗️</span>
                        <div className="flex-1">
                          <div className="font-bold text-xs text-[#263238]">Step 2: Turn Right onto High Ridge Trail (0.2 mi)</div>
                          <div className="text-[10.5px] text-[#5A4D49]">Safe elevation zone above 350m MSL. Continuous shade & misting.</div>
                        </div>
                        <span className="text-[9px] font-mono text-[#6B6F6B] shrink-0">3 min</span>
                      </div>

                      <div className="p-2.5 bg-[#FAF8F2] rounded-xl border border-[#DDD5C7] flex items-start gap-2.5 opacity-80">
                        <span className="text-base">🏁</span>
                        <div className="flex-1">
                          <div className="font-bold text-xs text-[#263238]">Step 3: Arrive at {primaryShelter.name} (0.1 mi)</div>
                          <div className="text-[10.5px] text-[#5A4D49]">Enter via Gate A for medical triage, cold hydration & power.</div>
                        </div>
                        <span className="text-[9px] font-mono text-[#6B6F6B] shrink-0">2 min</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#DDD5C7] text-[10px]">
                      <span className="text-[#0f766e] font-bold">Total Route: 0.4 mi &bull; ETA 6 min walk</span>
                      <button
                        onClick={() => setIsNavigating(false)}
                        className="text-[#DC2626] font-bold hover:underline cursor-pointer"
                      >
                        End HUD Guidance ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. VERIFIED HIGH-GROUND RELIEF SHELTERS DIRECTORY */}
                <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-3xl p-4 shadow-sm space-y-3 font-sans">
                  <div className="flex items-center justify-between border-b border-[#DDD5C7] pb-2 font-mono">
                    <span className="text-xs font-black text-[#263238] flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#0f766e]" />
                      <span>VERIFIED HIGH-GROUND RELIEF SHELTERS</span>
                    </span>
                    <span className="text-[9px] bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 px-2 py-0.5 rounded-full font-bold">
                      {currentShelters.length} Open
                    </span>
                  </div>

                  <div className="space-y-2.5 font-mono">
                    {currentShelters.map((s) => (
                      <div key={s.id} className="p-3 bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="font-bold text-xs text-[#263238] font-sans">{s.name}</div>
                            <div className="text-[10px] text-[#6B6F6B]">{s.address}</div>
                          </div>
                          <span className="text-[9px] bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 px-2 py-0.5 rounded-full font-bold shrink-0">
                            {s.capacity}
                          </span>
                        </div>

                        {/* Amenities chips */}
                        <div className="flex flex-wrap gap-1">
                          {s.amenities.slice(0, 3).map((a, i) => (
                            <span key={i} className="text-[8px] bg-[#FFFDF8] text-[#5A4D49] border border-[#DDD5C7] px-1.5 py-0.2 rounded-md font-sans">
                              ✓ {a}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[#DDD5C7]">
                          <span className="text-[#0f766e] font-semibold">{s.distance} ({s.walkTime})</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setIsTransitPassOpen(true)}
                              className="bg-[#FAF8F2] hover:bg-[#E5CDC6] border border-[#DDD5C7] text-[#0f766e] px-2 py-1 rounded-lg font-bold text-[9px] cursor-pointer"
                            >
                              Transit Pass
                            </button>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + s.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#0f766e] hover:bg-[#0d9488] text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 text-[9.5px] cursor-pointer"
                            >
                              <span>Navigate</span>
                              <ChevronRight className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* TAB 5: ALERTS                                                             */}
          {/* ========================================================================= */}
          {activeTab === 'ALERTS' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#DDD5C7] pb-2">
                  <span className="text-xs font-black text-[#263238] flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-[#DC2626]" />
                    <span>EMERGENCY DISASTER ADVISORIES</span>
                  </span>
                  <button onClick={toggleAudioAlert} className="text-[10px] text-[#0f766e] font-bold flex items-center gap-1 cursor-pointer">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Audio Broadcast</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="p-3 bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="px-1.5 py-0.2 bg-[#DC2626] text-white rounded uppercase">RED CRITICAL</span>
                      <span className="text-[#6B6F6B]">Just now</span>
                    </div>
                    <h4 className="text-xs font-black text-[#263238]">Severe Inundation & Flash Flood Nowcast</h4>
                    <p className="text-[11px] text-[#5A4D49] font-sans">
                      Move essential belongings to upper floors. High-velocity runoff channeled into lowlands.
                    </p>
                  </div>

                  <div className="p-3 bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="px-1.5 py-0.2 bg-[#D97706] text-white rounded uppercase">AMBER ADVISORY</span>
                      <span className="text-[#6B6F6B]">15 mins ago</span>
                    </div>
                    <h4 className="text-xs font-black text-[#263238]">Lightning & Thunderstorm Advisory</h4>
                    <p className="text-[11px] text-[#5A4D49] font-sans">
                      Avoid open fields, tall trees, and metal structures. Keep phones charged.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: PROFILE / OFFICER TRIAGE                                           */}
          {/* ========================================================================= */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#DDD5C7] pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 rounded-full bg-[#0f766e] text-white flex items-center justify-center font-black text-base shadow">
                      {isOfficerMode ? '👮' : '👤'}
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[#263238]">{isOfficerMode ? 'Battalion Chief Marcus Vance' : 'Alex Morgan'}</h3>
                      <p className="text-[9.5px] text-[#6B6F6B]">{isOfficerMode ? 'Phoenix Fire Rescue & FEMA Task Force 1' : 'Citizen ID: CIVICPULSE-US-8492 • Maricopa County, AZ'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOfficerMode(!isOfficerMode)}
                    className="px-2.5 py-1 bg-[#FAF8F2] border border-[#DDD5C7] rounded-xl text-[9.5px] font-bold text-[#263238] hover:bg-[#E5CDC6] cursor-pointer transition"
                  >
                    Switch Role
                  </button>
                </div>

                {isOfficerMode ? (
                  /* Officer Live Triage Queue */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-bold text-[#263238] text-xs">
                      <span>INCOMING CITIZEN RESCUE CALLS ({allRecentPings.filter(p => p.type !== 'SAFE').length})</span>
                      <button onClick={pollSync} className="text-[#0f766e] text-[10px] flex items-center gap-1 cursor-pointer">
                        <RotateCw className="w-3 h-3" />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {allRecentPings.filter(p => p.type !== 'SAFE').length === 0 ? (
                      <div className="p-4 text-center bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl text-[#6B6F6B]">
                        No pending citizen distress calls.
                      </div>
                    ) : (
                      allRecentPings.filter(p => p.type !== 'SAFE').map((ping) => (
                        <div key={ping.id} className="p-3 bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl space-y-1.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-[#263238] text-xs">{ping.categoryName}</div>
                              <div className="text-[9.5px] text-[#6B6F6B]">{ping.address} &bull; {ping.timeFormatted}</div>
                            </div>
                            <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-bold ${
                              ping.status === 'PENDING' ? 'bg-[#DC2626] text-white' : 'bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40'
                            }`}>
                              {ping.status}
                            </span>
                          </div>

                          <p className="text-[11px] text-[#5A4D49] font-sans bg-[#FFFDF8] p-2 rounded-xl border border-[#DDD5C7]">
                            “{ping.notes}”
                          </p>

                          {ping.status === 'PENDING' && (
                            <button
                              onClick={() => handleOfficerDispatch(ping.id)}
                              className="w-full py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1 transition"
                            >
                              <Siren className="w-3.5 h-3.5" />
                              <span>Acknowledge & Dispatch Phoenix Fire Unit (EMS-04)</span>
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Citizen Profile & Household Network */
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-[#6B6F6B] uppercase tracking-wider block">Household Safety Status</span>
                      {familyMembers.map((m, i) => (
                        <div key={i} className="p-2.5 bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl flex items-center justify-between">
                          <div>
                            <div className="font-bold text-[#263238]">{m.name} ({m.relation})</div>
                            <div className="text-[9.5px] text-[#6B6F6B]">{m.location} &bull; Bat {m.battery}</div>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40">
                            {m.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleCheckInSafe}
                      disabled={isSafeCheckedIn}
                      className="w-full bg-[#0f766e] hover:bg-[#0d9488] text-white py-2.5 rounded-2xl font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition"
                    >
                      <HeartHandshake className="w-4 h-4" />
                      <span>{isSafeCheckedIn ? '✓ You Are Verified Safe' : 'Confirm I Am Safe'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: SOS DISTRESS TRIGGER & LIVE RESCUE PROGRESSION                     */}
          {/* ========================================================================= */}
          {activeTab === 'SOS' && (
            <div className="space-y-3 font-mono">
              {activeSOSBeacon && activeSOSBeacon.status !== 'RESOLVED' ? (
                <div className="bg-[#FFFDF8] border-2 border-[#DC2626] rounded-3xl p-4 shadow-xl space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[#DDD5C7] pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#DC2626] text-white flex items-center justify-center animate-ping">
                        <Siren className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] text-[#DC2626] font-extrabold uppercase">EMERGENCY BEACON ACTIVE</span>
                        <h3 className="text-xs font-bold text-[#263238]">{activeSOSBeacon.categoryName}</h3>
                      </div>
                    </div>
                    <span className="text-[9px] bg-[#DC2626] text-white px-2 py-0.5 rounded-full font-bold">
                      {activeSOSBeacon.status === 'DISPATCHED' 
                        ? 'RESCUE EN ROUTE' 
                        : activeSOSBeacon.status === 'ACKNOWLEDGED' 
                          ? 'EOC ACKNOWLEDGED' 
                          : 'PENDING TRIAGE'}
                    </span>
                  </div>

                  {/* 3-Stage Progress */}
                  <div className="space-y-2 text-xs">
                    {/* Stage 1 */}
                    <div className="flex items-center gap-2 text-[#0f766e] font-bold bg-[#E8F5EF] p-2 rounded-xl border border-[#0d9488]/30">
                      <CheckCircle2 className="w-4 h-4 text-[#0d9488] shrink-0" />
                      <span>1. Transmitted to FEMA IPAWS & Municipal EOC</span>
                      <span className="text-[9px] text-[#6B6F6B] ml-auto">{activeSOSBeacon.timeFormatted}</span>
                    </div>

                    {/* Stage 2: EOC Acknowledgment */}
                    <div className={`flex items-start gap-2 font-bold p-2 rounded-xl border ${
                      activeSOSBeacon.status === 'ACKNOWLEDGED' || activeSOSBeacon.status === 'DISPATCHED'
                        ? 'bg-[#E8F5EF] border-[#0d9488]/40 text-[#0f766e]'
                        : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#D97706] animate-pulse'
                    }`}>
                      {activeSOSBeacon.status === 'ACKNOWLEDGED' || activeSOSBeacon.status === 'DISPATCHED' ? (
                        <CheckCircle2 className="w-4 h-4 text-[#0d9488] shrink-0 mt-0.5" />
                      ) : (
                        <Radio className="w-4 h-4 text-[#D97706] animate-spin shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span>2. ACKNOWLEDGED BY FEMA EOC COMMAND</span>
                          {activeSOSBeacon.acknowledgedAt && <span className="text-[9px] text-[#6B6F6B]">{activeSOSBeacon.acknowledgedAt}</span>}
                        </div>
                        <div className="text-[10px] text-[#5A4D49] font-normal font-sans mt-0.5">
                          {activeSOSBeacon.status === 'ACKNOWLEDGED' || activeSOSBeacon.status === 'DISPATCHED'
                            ? `✓ Locked by ${activeSOSBeacon.acknowledgedBy || 'Battalion Chief Marcus Vance • FEMA Desk #1'}. Siren alarm triggered.`
                            : 'Awaiting EOC Incident Command desk lock & triage acknowledgement...'}
                        </div>
                      </div>
                    </div>

                    {/* Stage 3: First Responder Dispatch */}
                    <div className={`flex items-start gap-2 font-bold p-2.5 rounded-2xl border ${
                      activeSOSBeacon.status === 'DISPATCHED'
                        ? 'bg-[#E8F5EF] border-[#0d9488]/40 text-[#0f766e]'
                        : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#6B6F6B]'
                    }`}>
                      <Siren className={`w-4 h-4 shrink-0 mt-0.5 ${activeSOSBeacon.status === 'DISPATCHED' ? 'text-[#0d9488] animate-bounce' : 'text-[#6B6F6B]'}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span>3. Rescue Team Dispatched!</span>
                          {activeSOSBeacon.status === 'DISPATCHED' && <span className="text-[9px] text-[#0f766e] font-bold">EN ROUTE</span>}
                        </div>
                        {activeSOSBeacon.assignedUnit && (
                          <div className="text-[10px] text-[#0f766e] font-normal font-sans mt-0.5">
                            Assigned: <b>{activeSOSBeacon.assignedUnit}</b> (ETA ~{activeSOSBeacon.etaMinutes || 4} min)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* STANDALONE PROMINENT 880Hz ACOUSTIC SEARCH BEACON BUTTON */}
                  <div className="pt-2 border-t border-[#DDD5C7] space-y-2">
                    <button
                      type="button"
                      onClick={toggleAcousticBeacon}
                      className={`w-full p-3 rounded-2xl border-2 font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98 ${
                        acousticActive 
                          ? 'bg-[#0f766e] text-white border-[#0d9488] shadow-md ring-2 ring-[#0d9488]' 
                          : 'bg-[#FFFDF8] hover:bg-[#FAF8F2] border-[#0f766e] text-[#0f766e]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 text-left">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          acousticActive ? 'bg-white/20 border-white text-white' : 'bg-[#E8F5EF] border-[#0d9488]/40 text-[#0f766e]'
                        }`}>
                          <Radio className={`w-5 h-5 ${acousticActive ? 'animate-ping' : 'animate-pulse'}`} />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase tracking-tight flex items-center gap-1.5 font-mono">
                            <span>880Hz Acoustic Search Beacon</span>
                            {acousticActive && <span className="text-[8px] bg-white text-[#0f766e] px-1.5 py-0.2 rounded-full font-black font-mono animate-pulse">PULSING</span>}
                          </div>
                          <p className={`text-[9.5px] font-sans font-normal leading-tight mt-0.5 ${acousticActive ? 'text-white/90' : 'text-[#5A4D49]'}`}>
                            {acousticActive ? 'Emitting 880Hz/440Hz audio pings for FEMA Search & Rescue (SAR) & K9 units' : 'Tap to emit loud 880Hz acoustic chirps to guide nearby rescue teams'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-1.5 rounded-xl shrink-0 ${
                        acousticActive ? 'bg-white text-[#0f766e]' : 'bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40'
                      }`}>
                        {acousticActive ? 'STOP BEACON' : 'START BEACON'}
                      </span>
                    </button>

                    {/* Secondary Controls: Siren Test & Optical SOS Strobe (2 Columns) */}
                    <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                      <button
                        type="button"
                        onClick={() => {
                          if (isSirenPlaying) stopEmergencySirenSound();
                          else startEmergencySirenSound();
                        }}
                        className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          isSirenPlaying ? 'bg-[#DC2626] text-white animate-pulse' : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#DC2626] hover:bg-[#E5CDC6]'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{isSirenPlaying ? 'Stop Siren' : 'Test Siren (90dB)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStrobeActive(!strobeActive)}
                        className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          strobeActive ? 'bg-[#D97706] text-white animate-pulse' : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#263238] hover:bg-[#E5CDC6]'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{strobeActive ? 'Strobe Flash On' : 'Optical SOS Strobe'}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      stopEmergencySirenSound();
                      setActiveSOSBeacon(null);
                    }}
                    className="w-full py-2 bg-[#FAF8F2] border border-[#DDD5C7] hover:bg-[#E5CDC6] text-[#5A4D49] rounded-xl font-bold text-xs cursor-pointer transition"
                  >
                    Cancel Distress Beacon / I Am Safe
                  </button>
                </div>
              ) : (
                <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-3xl p-4 shadow-sm space-y-3.5">
                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-bold text-[#DC2626] uppercase tracking-widest block">
                      EMERGENCY DISASTER RESCUE NETWORK
                    </span>
                    <h2 className="text-base font-black text-[#263238]">
                      SOS Distress Beacon
                    </h2>
                    <p className="text-[11px] text-[#5A4D49] font-sans">
                      Tap below to transmit an immediate high-priority signal and GPS coordinates to Municipal 911 & FEMA EOC command desks.
                    </p>
                  </div>

                  <div className="py-2 flex justify-center">
                    <button
                      onClick={handleTriggerSOS}
                      disabled={isSendingSOS}
                      className="w-36 h-36 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] active:scale-95 text-white font-mono font-black text-xl tracking-widest flex flex-col items-center justify-center shadow-2xl transition border-4 border-[#991B1B] hover:border-white cursor-pointer"
                    >
                      <Siren className="w-8 h-8 mb-1 animate-bounce" />
                      <span>SOS</span>
                      <span className="text-[8.5px] font-normal tracking-normal opacity-90">SEND RESCUE</span>
                    </button>
                  </div>

                  {/* STANDALONE 880Hz ACOUSTIC SEARCH BEACON QUICK TOOL */}
                  <button
                    type="button"
                    onClick={toggleAcousticBeacon}
                    className={`w-full p-3 rounded-2xl border-2 font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98 ${
                      acousticActive 
                        ? 'bg-[#0f766e] text-white border-[#0d9488] shadow-md ring-2 ring-[#0d9488]' 
                        : 'bg-[#FAF8F2] hover:bg-[#E8F5EF] border-[#0d9488]/40 text-[#0f766e]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        acousticActive ? 'bg-white/20 border-white text-white' : 'bg-[#E8F5EF] border-[#0d9488]/40 text-[#0f766e]'
                      }`}>
                        <Radio className={`w-4 h-4 ${acousticActive ? 'animate-ping' : 'animate-pulse'}`} />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-tight flex items-center gap-1 font-mono">
                          <span>880Hz Acoustic Search Beacon</span>
                          {acousticActive && <span className="text-[8px] bg-white text-[#0f766e] px-1.5 py-0.2 rounded-full font-black animate-pulse">ACTIVE</span>}
                        </div>
                        <p className={`text-[9.5px] font-sans font-normal leading-tight mt-0.5 ${acousticActive ? 'text-white/90' : 'text-[#5A4D49]'}`}>
                          {acousticActive ? 'Transmitting 880Hz audio pulses for K9 & SAR units' : 'Emit high-pitch acoustic pulses to guide rescue teams to your location'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1.5 rounded-xl shrink-0 ${
                      acousticActive ? 'bg-white text-[#0f766e]' : 'bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40'
                    }`}>
                      {acousticActive ? 'STOP BEACON' : 'ACTIVATE BEACON'}
                    </span>
                  </button>

                  {/* 4 Emergency Categories */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => setSelectedSOSCategory('HEAT_STROKE')}
                      className={`p-2.5 rounded-2xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                        selectedSOSCategory === 'HEAT_STROKE' ? 'bg-[#FAF8F2] border-2 border-[#DC2626] text-[#DC2626] font-bold' : 'bg-[#FAF8F2] border border-[#DDD5C7] text-[#5A4D49]'
                      }`}
                    >
                      <span>🌡️ Heat Stroke</span>
                      <span className="text-[8px] opacity-80">Severe Dehydration</span>
                    </button>

                    <button
                      onClick={() => setSelectedSOSCategory('FLOOD_TRAP')}
                      className={`p-2.5 rounded-2xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                        selectedSOSCategory === 'FLOOD_TRAP' ? 'bg-[#FAF8F2] border-2 border-[#0f766e] text-[#0f766e] font-bold' : 'bg-[#FAF8F2] border border-[#DDD5C7] text-[#5A4D49]'
                      }`}
                    >
                      <span>🌊 Flood Trap</span>
                      <span className="text-[8px] opacity-80">Ground Water Cutoff</span>
                    </button>

                    <button
                      onClick={() => setSelectedSOSCategory('POWER_FAILURE')}
                      className={`p-2.5 rounded-2xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                        selectedSOSCategory === 'POWER_FAILURE' ? 'bg-[#FAF8F2] border-2 border-[#D97706] text-[#D97706] font-bold' : 'bg-[#FAF8F2] border border-[#DDD5C7] text-[#5A4D49]'
                      }`}
                    >
                      <span>⚡ Power / AC Outage</span>
                      <span className="text-[8px] opacity-80">Oxygen Meds at Risk</span>
                    </button>

                    <button
                      onClick={() => setSelectedSOSCategory('MEDICAL_SOS')}
                      className={`p-2.5 rounded-2xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                        selectedSOSCategory === 'MEDICAL_SOS' ? 'bg-[#FAF8F2] border-2 border-[#4f46e5] text-[#4f46e5] font-bold' : 'bg-[#FAF8F2] border border-[#DDD5C7] text-[#5A4D49]'
                      }`}
                    >
                      <span>🚑 Medical Emergency</span>
                      <span className="text-[8px] opacity-80">Paramedic Immediate</span>
                    </button>
                  </div>

                  {/* Triage Modifiers */}
                  <div className="pt-2 border-t border-[#DDD5C7] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#6B6F6B] font-bold">Persons in Danger:</span>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 4, 6].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setPeopleCount(cnt)}
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                              peopleCount === cnt
                                ? 'bg-[#0f766e] text-white border-[#0f766e]'
                                : 'bg-[#FAF8F2] text-[#5A4D49] border-[#DDD5C7]'
                            }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[9px]">
                      <button
                        type="button"
                        onClick={() => setHasInfant(!hasInfant)}
                        className={`p-1.5 rounded-lg border font-bold cursor-pointer text-center ${
                          hasInfant ? 'bg-[#FEE2E2] text-[#DC2626] border-[#DC2626]' : 'bg-[#FAF8F2] text-[#5A4D49] border-[#DDD5C7]'
                        }`}
                      >
                        👶 Infant Present
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasElderly(!hasElderly)}
                        className={`p-1.5 rounded-lg border font-bold cursor-pointer text-center ${
                          hasElderly ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]' : 'bg-[#FAF8F2] text-[#5A4D49] border-[#DDD5C7]'
                        }`}
                      >
                        👴 Senior Citizen
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasMedicalOxygen(!hasMedicalOxygen)}
                        className={`p-1.5 rounded-lg border font-bold cursor-pointer text-center ${
                          hasMedicalOxygen ? 'bg-[#E8F5EF] text-[#0f766e] border-[#0d9488]' : 'bg-[#FAF8F2] text-[#5A4D49] border-[#DDD5C7]'
                        }`}
                      >
                        🫁 Oxygen Support
                      </button>
                    </div>

                    <input
                      type="text"
                      value={sosNotes}
                      onChange={(e) => setSosNotes(e.target.value)}
                      placeholder="Optional notes (e.g. Apt 3B, need wheelchair)..."
                      className="w-full bg-[#FAF8F2] border border-[#DDD5C7] rounded-xl px-2.5 py-1.5 text-xs font-sans outline-none focus:border-[#0d9488] text-[#263238] placeholder:text-[#6B6F6B]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* 4. FLOATING SOS EMERGENCY BUTTON (CivicPulse Mobile Layout) */}
        {activeTab !== 'SOS' && (
          <div className="absolute bottom-18 right-3.5 z-40">
            <button
              onClick={() => setActiveTab('SOS')}
              className="w-13 h-13 rounded-full bg-[#DC2626] text-white flex flex-col items-center justify-center shadow-xl border-2 border-white active:scale-95 transition-transform hover:bg-[#B91C1C] cursor-pointer"
              title="Quick SOS Emergency Trigger"
            >
              <Radio className="w-5 h-5 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-wider font-mono">SOS</span>
            </button>
          </div>
        )}

        {/* 5. ANDROID BOTTOM NAVIGATION BAR (Exact CivicPulse Palette #E5CDC6 + Teal #0f766e) */}
        <nav 
          style={{ backgroundColor: '#E5CDC6', borderColor: '#CCA298' }}
          className="border-t px-1 py-1.5 flex items-center justify-around z-50 shrink-0 w-full shadow-sm min-h-[60px]"
        >
          {[
            { id: 'NOWCAST', label: 'Nowcast', icon: CloudRain },
            { id: 'MAP', label: 'Live Map', icon: Compass },
            { id: 'DEMO', label: '🎬 Demo', icon: PlayCircle, isDemo: true },
            { id: 'EVACUATE', label: 'Evacuate', icon: Navigation },
            { id: 'ALERTS', label: 'Alerts', icon: Bell },
            { id: 'PROFILE', label: isOfficerMode ? 'Officer' : 'Profile', icon: isOfficerMode ? Shield : User }
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as CitizenTab)}
                className={`flex flex-col items-center justify-center py-1 px-1 flex-1 h-full select-none transition active:scale-90 cursor-pointer ${
                  isActive 
                    ? 'text-[#0f766e] font-extrabold'
                    : 'text-[#5A4D49] font-medium hover:text-[#263238]'
                }`}
              >
                <div className={`p-1 rounded-xl transition ${
                  isActive 
                    ? 'bg-[#FFFDF8] text-[#0f766e] border border-[#C3988E] shadow-sm font-extrabold' 
                    : 'text-[#5A4D49]'
                }`}>
                  <t.icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </div>
                <span className="text-[9px] leading-none mt-0.5 tracking-tight font-mono">
                  {t.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* ========================================================================= */}
        {/* 🚨 POPUP MODAL: EMERGENCY SIREN ALERT & EOC SOS ACKNOWLEDGEMENT           */}
        {/* ========================================================================= */}
        {isSirenModalOpen && sirenEventData && (
          <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in zoom-in duration-200">
            <div className="bg-[#FFFDF8] rounded-3xl w-full p-4 space-y-3.5 shadow-2xl border-4 border-[#DC2626] font-sans text-[#263238] relative overflow-hidden">
              
              {/* Top Siren Warning Banner */}
              <div className="bg-[#DC2626] -m-4 mb-3 p-3.5 text-white text-center flex flex-col items-center justify-center space-y-1">
                <div className="flex items-center gap-2">
                  <Siren className="w-6 h-6 animate-bounce text-white" />
                  <Volume2 className="w-5 h-5 animate-pulse text-[#FEF3C7]" />
                </div>
                <span className="text-[9.5px] font-mono font-black uppercase tracking-widest text-[#FEF3C7] block">
                  AUDIBLE EMERGENCY SIREN ACTIVE
                </span>
                <h3 className="text-xs sm:text-sm font-black text-white leading-tight font-mono">
                  {sirenEventData.title}
                </h3>
              </div>

              <div className="space-y-2.5 pt-1 text-xs">
                <div className="p-3 bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-[9px] font-bold">
                    <span className="px-2 py-0.5 bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 rounded-full">
                      ✓ EOC DESK ACKNOWLEDGED
                    </span>
                    <span className="text-[#6B6F6B]">{sirenEventData.acknowledgedAt || clockTime}</span>
                  </div>

                  <div className="text-[10.5px] font-bold text-[#263238] pt-1">
                    👤 Commander: <span className="text-[#0f766e]">{sirenEventData.acknowledgedBy || 'Battalion Chief Marcus Vance • FEMA Task Force 1'}</span>
                  </div>

                  {sirenEventData.assignedUnit && (
                    <div className="text-[10.5px] font-bold text-[#263238]">
                      🚑 Assigned Unit: <span className="text-[#DC2626]">{sirenEventData.assignedUnit}</span> (ETA ~{sirenEventData.etaMinutes || 4} min)
                    </div>
                  )}

                  <div className="text-[10.5px] text-[#5A4D49] font-sans leading-relaxed pt-1 border-t border-[#DDD5C7]">
                    “{sirenEventData.message}”
                  </div>
                </div>

                <div className="flex items-center justify-between px-2 text-[9.5px] text-[#6B6F6B] font-mono">
                  <span>📍 GPS: {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}</span>
                  <span className="text-[#0f766e] font-bold">● Beacon Locked</span>
                </div>
              </div>

              <button
                onClick={() => {
                  stopEmergencySirenSound();
                  setIsSirenModalOpen(false);
                }}
                className="w-full py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-mono font-black text-xs rounded-2xl shadow-lg cursor-pointer transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Volume2 className="w-4 h-4" />
                <span>🔕 Mute Siren / Acknowledge Receipt</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 🧠 POPUP MODAL: EXPLAINABLE AI (XAI) MODEL DIAGNOSTICS                    */}
        {/* ========================================================================= */}
        {isXaiModalOpen && (
          <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in zoom-in duration-150">
            <div className="bg-[#FFFDF8] rounded-3xl w-full p-4 space-y-3 shadow-2xl border border-[#DDD5C7] max-h-[92%] overflow-y-auto scrollbar-thin font-sans text-[#263238]">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#DDD5C7]">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-[#E8F5EF] border border-[#0d9488]/40 text-[#0f766e] flex items-center justify-center font-bold text-sm shadow-sm">
                    🧠
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-[#263238]">Explainable AI (XAI) Diagnostics</h3>
                    <p className="text-[9px] text-[#6B6F6B] font-mono">Spatiotemporal Transformer &bull; 2–6h Nowcast</p>
                  </div>
                </div>
                <button onClick={() => setIsXaiModalOpen(false)} className="w-7 h-7 rounded-full bg-[#FAF8F2] border border-[#DDD5C7] text-[#263238] hover:bg-[#E5CDC6] flex items-center justify-center text-sm font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              {/* NWP Bypass Banner */}
              <div className="bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl p-2.5 space-y-1 text-xs text-[#263238]">
                <div className="flex items-center justify-between font-bold text-[10.5px] font-mono">
                  <span className="flex items-center space-x-1 text-[#0f766e]">
                    <Zap className="w-3.5 h-3.5" />
                    <span>NWP Latency Bypass Engine</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#E8F5EF] text-[#0f766e] text-[8.5px]">38ms Inference</span>
                </div>
                <p className="text-[10px] leading-relaxed text-[#5A4D49]">
                  CivicPulse deep learning transformers extract multivariate precursors in <b>38ms</b>, delivering actionable <b>2 to 6-hour lead time</b>.
                </p>
              </div>

              {/* 4 Pillars */}
              <div className="space-y-1.5">
                <h4 className="text-[9.5px] font-black uppercase tracking-wider text-[#6B6F6B] font-mono">4 Atmospheric Predictive Pillars</h4>
                <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                  <div className="p-2 bg-[#FAF8F2] rounded-xl border border-[#DDD5C7]">
                    <span className="text-[8px] font-bold text-[#6B6F6B] uppercase block">💧 Fuel: IWV Moisture</span>
                    <span className="text-[11px] font-black text-[#0f766e]">54.2 kg/m²</span>
                    <span className="text-[7.5px] text-[#0d9488] block font-bold">+8.4 kg/m² / 2h</span>
                  </div>
                  <div className="p-2 bg-[#FAF8F2] rounded-xl border border-[#DDD5C7]">
                    <span className="text-[8px] font-bold text-[#6B6F6B] uppercase block">⚡ Energy: CAPE / CIN</span>
                    <span className="text-[11px] font-black text-[#D97706]">2,450 J/kg</span>
                    <span className="text-[7.5px] text-[#6B6F6B] block">CIN Cap: 15 J/kg</span>
                  </div>
                  <div className="p-2 bg-[#FAF8F2] rounded-xl border border-[#DDD5C7]">
                    <span className="text-[8px] font-bold text-[#6B6F6B] uppercase block">🌪️ Lift: CTT Drop Rate</span>
                    <span className="text-[11px] font-black text-[#263238]">-14.2°C / 15m</span>
                    <span className="text-[7.5px] text-[#6B6F6B] block">Conv: 14.2 × 10⁻⁵</span>
                  </div>
                  <div className="p-2 bg-[#FAF8F2] rounded-xl border border-[#DDD5C7]">
                    <span className="text-[8px] font-bold text-[#6B6F6B] uppercase block">⛰️ Topography: LiDAR</span>
                    <span className="text-[11px] font-black text-[#0f766e]">28.4° Slope</span>
                    <span className="text-[7.5px] text-[#6B6F6B] block">Soil Sat: 86%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsXaiModalOpen(false)}
                className="w-full py-2 bg-[#0f766e] hover:bg-[#0d9488] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition font-mono"
              >
                Close Model Diagnostics
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 🛰️ POPUP MODAL: SATELLITE-DIRECT EWMS                                     */}
        {/* ========================================================================= */}
        {isSatelliteModalOpen && (
          <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in zoom-in duration-150">
            <div className="bg-[#FFFDF8] rounded-3xl w-full p-4 space-y-3 shadow-2xl border border-[#DDD5C7] max-h-[92%] overflow-y-auto scrollbar-thin font-sans text-[#263238]">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#DDD5C7]">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-[#2D2421] text-white flex items-center justify-center text-sm shadow">
                    🛰️
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-[#263238]">NOAA GOES-16/18 Downlink EWMS</h3>
                    <p className="text-[9px] text-[#6B6F6B] font-mono">L-Band Direct Telemetry & HRIT Broadcast</p>
                  </div>
                </div>
                <button onClick={() => setIsSatelliteModalOpen(false)} className="w-7 h-7 rounded-full bg-[#FAF8F2] border border-[#DDD5C7] text-[#263238] hover:bg-[#E5CDC6] flex items-center justify-center text-sm font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="p-3 bg-[#2D2421] text-[#00e5a3] rounded-2xl font-mono text-[9.5px] space-y-1">
                <div className="text-[#E5CDC6] text-[8px] flex justify-between">
                  <span>RAW L-BAND EMWIN PACKET:</span>
                  <span className="text-[#0d9488]">CRC-16 OK (0x9B4F)</span>
                </div>
                <div className="tracking-widest">
                  55 AA 04 1E 08 4E 1A 9B 4F 82 11 F0 38 29
                </div>
                <div className="text-[8.5px] text-[#DDD5C7]">
                  Payload: NOAA Multi-Hazard Emergency Alert &bull; 1694.1 MHz HRIT
                </div>
              </div>

              <button
                onClick={() => setIsSatelliteModalOpen(false)}
                className="w-full py-2 bg-[#0f766e] hover:bg-[#0d9488] text-white rounded-xl text-xs font-bold shadow cursor-pointer transition font-mono"
              >
                Close Satellite Telemetry
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 🎟️ POPUP MODAL: FREE TRANSIT PASS                                         */}
        {/* ========================================================================= */}
        {isTransitPassOpen && (
          <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in zoom-in duration-150">
            <div className="bg-[#FFFDF8] rounded-3xl w-full p-4 space-y-3 shadow-2xl border border-[#DDD5C7] font-sans text-[#263238] relative">
              <div className="flex justify-between items-start border-b border-[#DDD5C7] pb-2">
                <div>
                  <span className="text-[8.5px] font-bold text-[#0f766e] uppercase tracking-wider block font-mono">
                    MUNICIPAL DISASTER RELIEF
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-[#263238]">
                    Emergency Free Transit Pass
                  </h3>
                </div>
                <span className="text-[8.5px] bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 px-2 py-0.5 rounded-full font-bold font-mono">
                  VALID TODAY
                </span>
              </div>

              <div className="bg-[#FAF8F2] border border-[#DDD5C7] p-3 rounded-2xl text-center space-y-2">
                <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl border border-[#DDD5C7] shadow-inner flex flex-col items-center justify-center">
                  <div className="grid grid-cols-6 gap-1 p-1">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-3 h-3 rounded-xs ${i % 2 === 0 || i % 5 === 0 ? 'bg-[#263238]' : 'bg-transparent'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-[8px] text-[#6B6F6B] font-mono mt-0.5">#CIVICPULSE-RELIEF-AUTH</span>
                </div>

                <div className="text-[10.5px] text-[#5A4D49]">
                  Show this pass to transit operators for zero-fare boarding to verified emergency cooling centers.
                </div>
              </div>

              <button
                onClick={() => setIsTransitPassOpen(false)}
                className="w-full bg-[#0f766e] hover:bg-[#0d9488] text-white py-2 rounded-xl font-bold text-xs shadow cursor-pointer transition font-mono"
              >
                Done / Close Pass
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 📶 POPUP MODAL: BLE MESH NETWORK                                          */}
        {/* ========================================================================= */}
        {isBleMeshModalOpen && (
          <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in zoom-in duration-150">
            <div className="bg-[#FFFDF8] rounded-3xl w-full p-4 space-y-3 shadow-2xl border border-[#DDD5C7] font-sans text-[#263238]">
              <div className="flex justify-between items-start border-b border-[#DDD5C7] pb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-xl bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 flex items-center justify-center font-bold text-sm">
                    📶
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#263238]">BLE Mesh Zero-Signal Relay</h3>
                    <p className="text-[8.5px] text-[#6B6F6B] font-mono">Device-to-Device Multi-Hop Network</p>
                  </div>
                </div>
                <button onClick={() => setIsBleMeshModalOpen(false)} className="w-7 h-7 rounded-full bg-[#FAF8F2] border border-[#DDD5C7] text-[#263238] hover:bg-[#E5CDC6] flex items-center justify-center text-sm font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="p-3 bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl text-xs space-y-1.5">
                <div className="font-bold text-[#263238] flex items-center justify-between font-mono">
                  <span>Mesh Peers Nearby:</span>
                  <span className="text-[#0f766e] font-black">6 Nodes Connected</span>
                </div>
                <p className="text-[10.5px] text-[#5A4D49]">
                  When cellular 4G/5G towers collapse, your emergency SOS hops across neighbouring phones via BLE until reaching a satellite uplink node.
                </p>
              </div>

              <button
                onClick={() => setIsBleMeshModalOpen(false)}
                className="w-full bg-[#0f766e] hover:bg-[#0d9488] text-white py-2 rounded-xl font-bold text-xs shadow cursor-pointer transition font-mono"
              >
                Close Mesh Telemetry
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 🌊 POPUP MODAL: USGS HYDROLOGICAL TELEMETRY                                */}
        {/* ========================================================================= */}
        {isRiverModalOpen && (
          <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in zoom-in duration-150">
            <div className="bg-[#FFFDF8] rounded-3xl w-full p-4 space-y-3 shadow-2xl border border-[#DDD5C7] font-sans text-[#263238]">
              <div className="flex justify-between items-start border-b border-[#DDD5C7] pb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-xl bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 flex items-center justify-center font-bold text-sm">
                    🌊
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#263238]">USGS Streamflow & River Gauges</h3>
                    <p className="text-[8.5px] text-[#6B6F6B] font-mono">USGS National Water Information System</p>
                  </div>
                </div>
                <button onClick={() => setIsRiverModalOpen(false)} className="w-7 h-7 rounded-full bg-[#FAF8F2] border border-[#DDD5C7] text-[#263238] hover:bg-[#E5CDC6] flex items-center justify-center text-sm font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-[#FAF8F2] border border-[#DDD5C7] rounded-xl">
                  <span className="text-[8px] text-[#6B6F6B] uppercase block">River Water Level</span>
                  <span className="text-xs font-black text-[#0f766e]">2.45 m</span>
                  <span className="text-[7.5px] text-[#D97706] block font-bold">Warning Level: 3.50m</span>
                </div>
                <div className="p-2.5 bg-[#FAF8F2] border border-[#DDD5C7] rounded-xl">
                  <span className="text-[8px] text-[#6B6F6B] uppercase block">Discharge Flow</span>
                  <span className="text-xs font-black text-[#263238]">1,840 cfs</span>
                  <span className="text-[7.5px] text-[#6B6F6B] block">Velocity: 2.1 m/s</span>
                </div>
              </div>

              <button
                onClick={() => setIsRiverModalOpen(false)}
                className="w-full bg-[#0f766e] hover:bg-[#0d9488] text-white py-2 rounded-xl font-bold text-xs shadow cursor-pointer transition font-mono"
              >
                Close Hydrological Data
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 📅 POPUP MODAL: DAY INSPECTION MODAL                                      */}
        {/* ========================================================================= */}
        {selectedDayDetail !== null && (
          <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in zoom-in duration-150">
            <div className="bg-[#FFFDF8] rounded-3xl w-full p-4 space-y-3 shadow-2xl border border-[#DDD5C7] font-sans text-[#263238]">
              <div className="flex justify-between items-start border-b border-[#DDD5C7] pb-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#263238]">7-Day Meteorological Outlook</h3>
                  <p className="text-[8.5px] text-[#6B6F6B] font-mono">Detailed Day Forecast & Hazards</p>
                </div>
                <button onClick={() => setSelectedDayDetail(null)} className="w-7 h-7 rounded-full bg-[#FAF8F2] border border-[#DDD5C7] text-[#263238] hover:bg-[#E5CDC6] flex items-center justify-center text-sm font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="p-3 bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl text-xs space-y-1.5">
                <div className="font-bold text-[#263238] font-mono text-[11px]">Precautionary Recommendation:</div>
                <p className="text-[10.5px] text-[#5A4D49]">
                  Maintain charged battery reserves, locate verified cooling shelters, and monitor official CivicPulse disaster advisories.
                </p>
              </div>

              <button
                onClick={() => setSelectedDayDetail(null)}
                className="w-full bg-[#0f766e] hover:bg-[#0d9488] text-white py-2 rounded-xl font-bold text-xs shadow cursor-pointer transition font-mono"
              >
                Close Details
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
