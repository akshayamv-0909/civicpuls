'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity,
  MapPin, 
  Clock, 
  CheckCircle2, 
  Navigation, 
  Volume2, 
  QrCode, 
  ChevronRight, 
  HeartHandshake, 
  Sun, 
  AlertTriangle, 
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
  Shield
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

const DEFAULT_SHELTERS: Shelter[] = [
  {
    id: 'sh-1',
    name: 'Burton Barr Central Cooling Oasis & Medical Triage',
    address: '1221 N Central Ave, Downtown Transit Hub',
    distance: '0.4 mi away',
    walkTime: '6 min walk',
    capacity: '420 / 600 Available',
    status: 'OPEN',
    amenities: ['High-Power Commercial AC', 'Cold Hydration Refill', 'Paramedics on Duty', 'Device Charging', 'Backup Generator']
  },
  {
    id: 'sh-2',
    name: 'Civic Community Resilience Center & Refuge',
    address: '1112 E Buckeye Corridor Safe Haven',
    distance: '1.1 mi away',
    walkTime: '14 min walk',
    capacity: '280 / 450 Available',
    status: 'OPEN',
    amenities: ['AC Gymnasium', 'Senior Hydration Station', 'Free Transit Shuttle Bay', 'Medical First Aid']
  },
  {
    id: 'sh-3',
    name: 'Municipal Convention Center Emergency Refuge Hub',
    address: '100 N 3rd St, High Ground Sector',
    distance: '1.8 mi away',
    walkTime: '22 min walk',
    capacity: '1,200 / 2,000 Available',
    status: 'OPEN',
    amenities: ['Mass Shaded Concourse', 'Oxygen Concentrators', 'Free Meal Distribution', 'Pet-Friendly Area']
  }
];

export default function CitizenLifelinePage() {
  // Navigation & Role
  const [activeTab, setActiveTab] = useState<CitizenTab>('NOWCAST');
  const [isOfficerMode, setIsOfficerMode] = useState<boolean>(false);
  const [clockTime, setClockTime] = useState<string>('02:15 PM');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

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
  const [monitoredZones, setMonitoredZones] = useState<LiveZoneTelemetry[]>(INITIAL_ZONES.map(z => ({
    ...z,
    temperatureF: 104,
    temperatureC: 40,
    apparentTempF: 107,
    humidityPct: 18,
    precipitationIn: 0,
    windSpeedMph: 8,
    weatherCode: 0,
    localObservationTime: '14:00',
    isDaytime: true,
    airQualityAqi: 52,
    pm25: 12,
    pm10: 24,
    liveRiskScore: 84,
    isLiveAvailable: true,
    lastUpdatedUtc: new Date().toUTCString(),
    dataSourceCitation: 'NOAA / Open-Meteo HRRR'
  })));
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zone-phx-core');

  // Location & Weather Telemetry
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('Phoenix Core Urban, Phoenix, AZ');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: 33.4484, lng: -112.0740 });
  const [isSearchingLocation, setIsSearchingLocation] = useState<boolean>(false);

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

    const tempF = zone.temperatureF ?? 104;
    const tempC = zone.temperatureC ?? Math.round((tempF - 32) * 5 / 9);
    const feelsC = zone.apparentTempF ? Math.round((zone.apparentTempF - 32) * 5 / 9) : tempC + 2;
    const hum = zone.humidityPct ?? 18;
    const wind = Math.round((zone.windSpeedMph ?? 8) * 1.609);
    const rain = Math.round((zone.precipitationIn ?? 0) * 25.4 * 10) / 10;
    const risk = zone.liveRiskScore ?? 84;

    setLiveTempC(tempC);
    setLiveTempF(tempF);
    setLiveFeelsLikeC(feelsC);
    setLiveHumidity(hum);
    setLiveWindSpeedKm(wind);
    setLiveRainIntensity(rain);
    setLiveRainProb(hum > 70 ? 85 : hum > 40 ? 45 : 15);
    setLiveRiskScore(risk);

    if (risk >= 75) {
      setLiveRiskLevel('CRITICAL RISK INDEX');
      setActionWindowHours(3.5);
      setHeroTitle(`CRITICAL: Extreme Urban Heat Surge Warning`);
      setHeroDesc(`Ambient thermal peak ${tempC}°C (${tempF}°F) observed. Municipal cooling shelters open 24/7.`);
      setSurgeDepthM(0.2);
      setWeatherCondition('Extreme Thermal Spike');
      setThunderstormProb(28);
      setCloudburstProb(14);
      setFlashFloodProb(92);
    } else if (risk >= 40) {
      setLiveRiskLevel('HIGH RISK INDEX');
      setActionWindowHours(6.0);
      setHeroTitle(`HIGH RISK: Elevated Atmospheric Thermal Load`);
      setHeroDesc(`Elevated heat index ${tempF}°F. Stay hydrated and monitor cooling shelters.`);
      setSurgeDepthM(0.3);
      setWeatherCondition('Severe Thermal Stress');
      setThunderstormProb(45);
      setCloudburstProb(30);
      setFlashFloodProb(55);
    } else {
      setLiveRiskLevel('NORMAL RISK INDEX');
      setActionWindowHours(12.0);
      setHeroTitle('Atmospheric Baseline Stable');
      setHeroDesc(`Conditions stable at ${tempF}°F. Safe for outdoor activities.`);
      setSurgeDepthM(0.1);
      setWeatherCondition('Partly Sunny');
      setThunderstormProb(15);
      setCloudburstProb(8);
      setFlashFloodProb(12);
    }
  }, []);

  const fetchCivicPulseLiveData = useCallback(async () => {
    try {
      const res = await fetch('/api/weather', { cache: 'no-store' });
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
  // 6. Dynamic Location Search & Open-Meteo Fetch
  // -------------------------------------------------------------
  const handleLocationSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsSearchingLocation(true);
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryText)}&count=1&language=en&format=json`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          const loc = geoData.results[0];
          const newLat = loc.latitude;
          const newLng = loc.longitude;
          const fullName = [loc.name, loc.admin1, loc.country].filter(Boolean).join(', ');
          
          setUserCoords({ lat: newLat, lng: newLng });
          setLocationName(fullName);

          // Fetch Live Open-Meteo for Searched City
          const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${newLat}&longitude=${newLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto`);
          if (wRes.ok) {
            const wData = await wRes.json();
            if (wData.current) {
              const tC = Math.round(wData.current.temperature_2m * 10) / 10;
              const feelsC = Math.round((wData.current.apparent_temperature || wData.current.temperature_2m) * 10) / 10;
              const hum = Math.round(wData.current.relative_humidity_2m);
              const wind = Math.round(wData.current.wind_speed_10m * 10) / 10;
              const rain = Math.round((wData.current.precipitation || wData.current.rain || 0) * 10) / 10;
              const wCode = wData.current.weather_code || 0;

              setLiveTempC(tC);
              setLiveFeelsLikeC(feelsC);
              setLiveHumidity(hum);
              setLiveWindSpeedKm(wind);
              setLiveRainIntensity(rain);
              setLiveRainProb(hum > 80 ? 88 : hum > 50 ? 53 : 20);
              setWeatherCondition(wCode >= 95 ? 'Severe Thunderstorm' : wCode >= 60 ? 'Active Rain' : hum > 70 ? 'Humid & Overcast' : 'Partly Cloudy');

              if (rain >= 15 || wCode >= 95) {
                setLiveRiskScore(88);
                setLiveRiskLevel('CRITICAL RISK INDEX');
                setActionWindowHours(2.5);
                setHeroTitle('CRITICAL: Severe Inundation & Storm Warning');
                setHeroDesc(`Heavy downpour (${rain} mm/h) observed. Flash flood surge expected.`);
                setSurgeDepthM(2.8);
                setThunderstormProb(92);
                setCloudburstProb(84);
                setFlashFloodProb(90);
              } else if (rain >= 4 || hum >= 80) {
                setLiveRiskScore(54);
                setLiveRiskLevel('HIGH RISK INDEX');
                setActionWindowHours(4.5);
                setHeroTitle('HIGH RISK: Storm & Inundation Watch');
                setHeroDesc(`Active rain showers underway. Avoid low-lying corridors.`);
                setSurgeDepthM(1.4);
                setThunderstormProb(78);
                setCloudburstProb(56);
                setFlashFloodProb(60);
              } else {
                setLiveRiskScore(15);
                setLiveRiskLevel('NORMAL RISK INDEX');
                setActionWindowHours(12);
                setHeroTitle('Atmospheric Baseline Stable');
                setHeroDesc(`Current conditions: Partly Cloudy at ${tC}°C. Safe for outdoor routines.`);
                setSurgeDepthM(0.4);
                setThunderstormProb(35);
                setCloudburstProb(22);
                setFlashFloodProb(18);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Geocoding search failed:', err);
    } finally {
      setIsSearchingLocation(false);
    }
  };

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
          {/* TAB 1: NOWCAST (FIRST PAGE — ALL 9 OFFICIAL CIVICPULSE SECTIONS)           */}
          {/* ========================================================================= */}
          {activeTab === 'NOWCAST' && (
            <div className="space-y-3.5">
              
              {/* SECTION 1: CIVICPULSE ZONE SELECTOR & SEARCH BAR */}
              <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-3 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-[#0f766e] shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch(searchQuery)}
                    placeholder="Search City / Sector (e.g. Phoenix, Miami, Austin)..."
                    className="w-full bg-[#FAF8F2] border border-[#DDD5C7] rounded-lg px-2.5 py-1 text-xs text-[#263238] placeholder:text-[#6B6F6B] focus:outline-none focus:ring-1 focus:ring-[#0d9488] focus:border-[#0d9488]"
                  />
                  <button
                    onClick={() => handleLocationSearch(searchQuery)}
                    disabled={isSearchingLocation}
                    className="px-2.5 py-1 bg-[#0f766e] hover:bg-[#0d9488] text-white font-bold rounded-lg text-xs shrink-0 cursor-pointer shadow-xs transition"
                  >
                    {isSearchingLocation ? '...' : 'Search'}
                  </button>
                  <button
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                          handleLocationSearch(`${pos.coords.latitude}, ${pos.coords.longitude}`);
                        });
                      }
                    }}
                    title="Use GPS"
                    className="p-1 bg-[#FAF8F2] border border-[#DDD5C7] text-[#0f766e] hover:bg-[#E5CDC6] rounded-lg shrink-0 cursor-pointer transition shadow-xs"
                  >
                    <Crosshair className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => fetchCivicPulseLiveData()}
                    title="Refresh Live NOAA & CivicPulse Feeds"
                    className="p-1 bg-[#FAF8F2] border border-[#DDD5C7] text-[#0f766e] hover:bg-[#E5CDC6] rounded-lg shrink-0 cursor-pointer transition shadow-xs"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Horizontal Scrolling CivicPulse Monitored Zone Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5 border-t border-[#DDD5C7]">
                  <span className="text-[8.5px] font-bold text-[#6B6F6B] uppercase tracking-wider shrink-0 font-mono">CivicPulse Zones:</span>
                  {monitoredZones.slice(0, 10).map((z) => (
                    <button
                      key={z.id}
                      onClick={() => applyZoneTelemetry(z)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
                        selectedZoneId === z.id
                          ? 'bg-[#0f766e] text-white border-[#0f766e] shadow-xs'
                          : 'bg-[#FAF8F2] text-[#5A4D49] border-[#DDD5C7] hover:bg-[#E5CDC6]'
                      }`}
                    >
                      📍 {z.name.split(' ')[0]} ({z.temperatureF !== null ? `${z.temperatureF}°F` : '95°F'})
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#5A4D49] pt-0.5 border-t border-[#DDD5C7] font-mono">
                  <span className="truncate max-w-[220px]">📍 Active: <b>{locationName}</b></span>
                  <span className="px-1.5 py-0.2 rounded bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 font-bold uppercase tracking-wider text-[8px] flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0d9488] inline-block animate-ping" />
                    <span>EOC LIVE FEED</span>
                  </span>
                </div>
              </div>

              {/* SECTION 2: HERO RISK STATUS BANNER CARD */}
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
                    { time: 'Now', temp: 32, prob: '53%', badge: 'Moderate', badgeColor: 'bg-[#D97706] text-white', active: true },
                    { time: '03:00 PM', temp: 32, prob: '68%', badge: 'Moderate', badgeColor: 'bg-[#D97706] text-white', active: false },
                    { time: '04:00 PM', temp: 32, prob: '87%', badge: 'Critical', badgeColor: 'bg-[#DC2626] text-white', active: false },
                    { time: '05:00 PM', temp: 29, prob: '98%', badge: 'Critical', badgeColor: 'bg-[#DC2626] text-white', active: false },
                    { time: '06:00 PM', temp: 27, prob: '92%', badge: 'Critical', badgeColor: 'bg-[#DC2626] text-white', active: false },
                    { time: '07:00 PM', temp: 26, prob: '85%', badge: 'Critical', badgeColor: 'bg-[#DC2626] text-white', active: false },
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
                    { day: 'Today', date: 'Sep 20', condition: 'Thermal Peak ...', high: 40, low: 28, rainProb: '15% Rain', risk: 'Critical', riskColor: 'text-[#DC2626] font-bold' },
                    { day: 'Tomorrow', date: 'Sep 21', condition: 'Severe Heat ...', high: 41, low: 29, rainProb: '10% Rain', risk: 'Critical', riskColor: 'text-[#DC2626] font-bold' },
                    { day: 'Tue', date: 'Sep 22', condition: 'Convective Storm', high: 38, low: 27, rainProb: '65% Rain', risk: 'Critical', riskColor: 'text-[#DC2626] font-bold' },
                    { day: 'Wed', date: 'Sep 23', condition: 'Thunderstorm ...', high: 34, low: 24, rainProb: '86% Rain', risk: 'Critical', riskColor: 'text-[#DC2626] font-bold' },
                    { day: 'Thu', date: 'Sep 24', condition: 'Moderate Showers', high: 32, low: 23, rainProb: '70% Rain', risk: 'Caution', riskColor: 'text-[#D97706] font-bold' },
                    { day: 'Fri', date: 'Sep 25', condition: 'Slight Showers', high: 33, low: 24, rainProb: '45% Rain', risk: 'Caution', riskColor: 'text-[#D97706] font-bold' },
                    { day: 'Sat', date: 'Sep 26', condition: 'Partly Sunny', high: 35, low: 25, rainProb: '20% Rain', risk: 'Advisory', riskColor: 'text-[#0f766e] font-bold' }
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
          {/* TAB 4: EVACUATE & SAFE ROUTES                                             */}
          {/* ========================================================================= */}
          {activeTab === 'EVACUATE' && (
            <div className="space-y-3 font-mono">
              <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#DDD5C7] pb-2">
                  <span className="text-xs font-black text-[#0f766e] flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#0d9488]" />
                    <span>DESIGNATED SAFE EVACUATION CORRIDOR</span>
                  </span>
                  <span className="text-[9px] bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 px-2 py-0.5 rounded-full font-bold">
                    ACTIVE ROUTE
                  </span>
                </div>

                <div className="space-y-2 text-xs font-sans">
                  <div className="bg-[#FAF8F2] border border-[#0d9488]/40 p-3 rounded-2xl flex items-start gap-2 text-[#263238]">
                    <CheckCircle2 className="w-4 h-4 text-[#0d9488] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold font-mono text-xs text-[#0f766e]">PRIMARY SAFE ROUTE: North High Ridge Corridor</div>
                      <div className="text-[11px] text-[#5A4D49] leading-tight mt-0.5">
                        Proceed North via Temple Hill Pass (1.2 km). Elevated relief camp with emergency power and paramedics on duty.
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FAF8F2] border border-[#DC2626]/40 p-3 rounded-2xl flex items-start gap-2 text-[#263238]">
                    <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold font-mono text-xs text-[#DC2626]">HAZARD CUTOFF: Lowland River Basin</div>
                      <div className="text-[11px] text-[#5A4D49] leading-tight mt-0.5">
                        Water surge inundation wave expected. Avoid underpasses and river bank roads.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#DDD5C7]">
                  <span className="text-[#0f766e] font-bold">Free Municipal Transit Active</span>
                  <button
                    onClick={() => setIsTransitPassOpen(true)}
                    className="bg-[#0f766e] hover:bg-[#0d9488] text-white px-3 py-1 rounded-xl font-bold flex items-center gap-1 shadow-xs text-xs cursor-pointer transition"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Relief Transit Pass</span>
                  </button>
                </div>
              </div>

              {/* Verified Relief Shelters */}
              <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#DDD5C7] pb-2">
                  <span className="text-xs font-black text-[#263238] flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#0f766e]" />
                    <span>VERIFIED HIGH-GROUND RELIEF SHELTERS</span>
                  </span>
                  <span className="text-[9px] text-[#6B6F6B]">3 Open</span>
                </div>

                <div className="space-y-2.5">
                  {DEFAULT_SHELTERS.map((s) => (
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

                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#DDD5C7]">
                        <span className="text-[#0f766e] font-semibold">{s.distance} ({s.walkTime})</span>
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
                  ))}
                </div>
              </div>
            </div>
          )}

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

                  {/* Siren Sound, Sonar & Strobe controls */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-[#DDD5C7] text-[10.5px]">
                    <button
                      onClick={() => {
                        if (isSirenPlaying) stopEmergencySirenSound();
                        else startEmergencySirenSound();
                      }}
                      className={`p-2 rounded-xl border font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                        isSirenPlaying ? 'bg-[#DC2626] text-white animate-pulse' : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#DC2626] hover:bg-[#E5CDC6]'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isSirenPlaying ? 'Stop Siren' : 'Test Siren'}</span>
                    </button>

                    <button
                      onClick={toggleAcousticBeacon}
                      className={`p-2 rounded-xl border font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                        acousticActive ? 'bg-[#0f766e] text-white animate-pulse' : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#263238] hover:bg-[#E5CDC6]'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>{acousticActive ? 'Sonar On' : '880Hz Sonar'}</span>
                    </button>

                    <button
                      onClick={() => setStrobeActive(!strobeActive)}
                      className={`p-2 rounded-xl border font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                        strobeActive ? 'bg-[#D97706] text-white animate-pulse' : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#263238] hover:bg-[#E5CDC6]'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{strobeActive ? 'Strobe On' : 'Morse Strobe'}</span>
                    </button>
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

      </div>

      {/* ========================================================================= */}
      {/* 🚨 POPUP MODAL: EMERGENCY SIREN ALERT & EOC SOS ACKNOWLEDGEMENT           */}
      {/* ========================================================================= */}
      {isSirenModalOpen && sirenEventData && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-[#FFFDF8] rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border-4 border-[#DC2626] font-sans text-[#263238] relative overflow-hidden">
            
            {/* Top Siren Warning Banner */}
            <div className="bg-[#DC2626] -m-5 mb-3 p-4 text-white text-center flex flex-col items-center justify-center space-y-1">
              <div className="flex items-center gap-2">
                <Siren className="w-7 h-7 animate-bounce text-white" />
                <Volume2 className="w-6 h-6 animate-pulse text-[#FEF3C7]" />
              </div>
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#FEF3C7] block">
                AUDIBLE EMERGENCY SIREN ACTIVE
              </span>
              <h3 className="text-sm font-black text-white leading-tight font-mono">
                {sirenEventData.title}
              </h3>
            </div>

            <div className="space-y-2.5 pt-2 text-xs">
              <div className="p-3 bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-[9px] font-bold">
                  <span className="px-2 py-0.5 bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 rounded-full">
                    ✓ EOC DESK ACKNOWLEDGED
                  </span>
                  <span className="text-[#6B6F6B]">{sirenEventData.acknowledgedAt || clockTime}</span>
                </div>

                <div className="text-[11px] font-bold text-[#263238] pt-1">
                  👤 Commander: <span className="text-[#0f766e]">{sirenEventData.acknowledgedBy || 'Battalion Chief Marcus Vance • FEMA Task Force 1'}</span>
                </div>

                {sirenEventData.assignedUnit && (
                  <div className="text-[11px] font-bold text-[#263238]">
                    🚑 Assigned Unit: <span className="text-[#DC2626]">{sirenEventData.assignedUnit}</span> (ETA ~{sirenEventData.etaMinutes || 4} min)
                  </div>
                )}

                <div className="text-[10.5px] text-[#5A4D49] font-sans leading-relaxed pt-1 border-t border-[#DDD5C7]">
                  “{sirenEventData.message}”
                </div>
              </div>

              <div className="flex items-center justify-between px-2 text-[10px] text-[#6B6F6B] font-mono">
                <span>📍 GPS: {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}</span>
                <span className="text-[#0f766e] font-bold">● Beacon Locked</span>
              </div>
            </div>

            <button
              onClick={() => {
                stopEmergencySirenSound();
                setIsSirenModalOpen(false);
              }}
              className="w-full py-3 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-mono font-black text-xs rounded-2xl shadow-lg cursor-pointer transition flex items-center justify-center gap-2 active:scale-95"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FFFDF8] rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-[#DDD5C7] max-h-[90vh] overflow-y-auto scrollbar-thin font-sans text-[#263238]">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDD5C7]">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E8F5EF] border border-[#0d9488]/40 text-[#0f766e] flex items-center justify-center font-bold text-sm shadow-sm">
                  🧠
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#263238]">Explainable AI (XAI) Diagnostics</h3>
                  <p className="text-[10px] text-[#6B6F6B] font-mono">Spatiotemporal Transformer &bull; 2–6h Nowcast</p>
                </div>
              </div>
              <button onClick={() => setIsXaiModalOpen(false)} className="w-7 h-7 rounded-full bg-[#FAF8F2] border border-[#DDD5C7] text-[#263238] hover:bg-[#E5CDC6] flex items-center justify-center text-sm font-bold cursor-pointer">
                &times;
              </button>
            </div>

            {/* NWP Bypass Banner */}
            <div className="bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl p-3 space-y-1 text-xs text-[#263238]">
              <div className="flex items-center justify-between font-bold text-[11px] font-mono">
                <span className="flex items-center space-x-1 text-[#0f766e]">
                  <Zap className="w-4 h-4" />
                  <span>NWP Latency Bypass Engine</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#E8F5EF] text-[#0f766e] text-[9px]">38ms Inference</span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-[#5A4D49]">
                Traditional physics-based NWP models require 6–12 hour simulation runs. CivicPulse deep learning transformers extract multivariate precursors in <b>38 milliseconds</b>, delivering actionable <b>2 to 6-hour lead time</b>.
              </p>
            </div>

            {/* 4 Pillars */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-[#6B6F6B] font-mono">4 Atmospheric Predictive Pillars</h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-[#FAF8F2] rounded-xl border border-[#DDD5C7]">
                  <span className="text-[8.5px] font-bold text-[#6B6F6B] uppercase block">💧 Fuel: IWV Moisture</span>
                  <span className="text-xs font-black text-[#0f766e]">54.2 kg/m²</span>
                  <span className="text-[8px] text-[#0d9488] block font-bold">+8.4 kg/m² / 2h</span>
                </div>
                <div className="p-2.5 bg-[#FAF8F2] rounded-xl border border-[#DDD5C7]">
                  <span className="text-[8.5px] font-bold text-[#6B6F6B] uppercase block">⚡ Energy: CAPE / CIN</span>
                  <span className="text-xs font-black text-[#D97706]">2,450 J/kg</span>
                  <span className="text-[8px] text-[#6B6F6B] block">CIN Cap: 15 J/kg</span>
                </div>
                <div className="p-2.5 bg-[#FAF8F2] rounded-xl border border-[#DDD5C7]">
                  <span className="text-[8.5px] font-bold text-[#6B6F6B] uppercase block">🌪️ Lift: CTT Drop Rate</span>
                  <span className="text-xs font-black text-[#263238]">-14.2°C / 15m</span>
                  <span className="text-[8px] text-[#6B6F6B] block">Conv: 14.2 × 10⁻⁵</span>
                </div>
                <div className="p-2.5 bg-[#FAF8F2] rounded-xl border border-[#DDD5C7]">
                  <span className="text-[8.5px] font-bold text-[#6B6F6B] uppercase block">⛰️ Topography: USGS 3DEP LiDAR</span>
                  <span className="text-xs font-black text-[#0f766e]">28.4° Slope</span>
                  <span className="text-[8px] text-[#6B6F6B] block">Soil Sat: 86%</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsXaiModalOpen(false)}
              className="w-full py-2.5 bg-[#0f766e] hover:bg-[#0d9488] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition font-mono"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FFFDF8] rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-[#DDD5C7] max-h-[90vh] overflow-y-auto scrollbar-thin font-sans text-[#263238]">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDD5C7]">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#2D2421] text-white flex items-center justify-center text-sm shadow">
                  🛰️
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#263238]">NOAA GOES-16/18 Direct Downlink EWMS</h3>
                  <p className="text-[10px] text-[#6B6F6B] font-mono">Direct L-Band Emergency Telemetry & HRIT/EMWIN Broadcast</p>
                </div>
              </div>
              <button onClick={() => setIsSatelliteModalOpen(false)} className="w-7 h-7 rounded-full bg-[#FAF8F2] border border-[#DDD5C7] text-[#263238] hover:bg-[#E5CDC6] flex items-center justify-center text-sm font-bold cursor-pointer">
                &times;
              </button>
            </div>

            <div className="p-3 bg-[#2D2421] text-[#00e5a3] rounded-2xl font-mono text-[10px] space-y-1">
              <div className="text-[#E5CDC6] text-[8.5px] flex justify-between">
                <span>RAW L-BAND EMWIN PACKET:</span>
                <span className="text-[#0d9488]">CRC-16 OK (0x9B4F)</span>
              </div>
              <div className="tracking-widest">
                55 AA 04 1E 08 4E 1A 9B 4F 82 11 F0 38 29
              </div>
              <div className="text-[9px] text-[#DDD5C7]">
                Payload: NOAA Multi-Hazard Emergency Alert &bull; Frequency: 1694.1 MHz HRIT
              </div>
            </div>

            <button
              onClick={() => setIsSatelliteModalOpen(false)}
              className="w-full py-2.5 bg-[#0f766e] hover:bg-[#0d9488] text-white rounded-xl text-xs font-bold shadow cursor-pointer transition font-mono"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FFFDF8] rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl border border-[#DDD5C7] font-sans text-[#263238] relative">
            <div className="flex justify-between items-start border-b border-[#DDD5C7] pb-2.5">
              <div>
                <span className="text-[9px] font-bold text-[#0f766e] uppercase tracking-wider block font-mono">
                  MUNICIPAL DISASTER RELIEF
                </span>
                <h3 className="text-sm font-bold text-[#263238]">
                  Emergency Free Transit Pass
                </h3>
              </div>
              <span className="text-[9px] bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 px-2 py-0.5 rounded-full font-bold font-mono">
                VALID TODAY
              </span>
            </div>

            <div className="bg-[#FAF8F2] border border-[#DDD5C7] p-3.5 rounded-2xl text-center space-y-2">
              <div className="w-36 h-36 mx-auto bg-white p-2 rounded-xl border border-[#DDD5C7] shadow-inner flex flex-col items-center justify-center">
                <div className="grid grid-cols-6 gap-1 p-1.5">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-3.5 h-3.5 rounded-xs ${i % 2 === 0 || i % 5 === 0 ? 'bg-[#263238]' : 'bg-transparent'}`} 
                    />
                  ))}
                </div>
                <span className="text-[8.5px] text-[#6B6F6B] font-mono mt-0.5">#CIVICPULSE-2026-RELIEF-AUTH</span>
              </div>

              <div className="text-[11px] text-[#5A4D49]">
                Show this pass to any transit operator for zero-fare boarding to verified emergency cooling centers.
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FFFDF8] rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl border border-[#DDD5C7] font-sans text-[#263238]">
            <div className="flex justify-between items-start border-b border-[#DDD5C7] pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 flex items-center justify-center font-bold text-sm">
                  📶
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#263238]">BLE Mesh Zero-Signal Relay</h3>
                  <p className="text-[9px] text-[#6B6F6B] font-mono">Device-to-Device Multi-Hop Network</p>
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
              <p className="text-[11px] text-[#5A4D49]">
                When cellular 4G/5G towers collapse, your emergency SOS hops across neighbouring phones via Bluetooth Low Energy (BLE) until reaching an active satellite uplink node.
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FFFDF8] rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl border border-[#DDD5C7] font-sans text-[#263238]">
            <div className="flex justify-between items-start border-b border-[#DDD5C7] pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#E8F5EF] text-[#0f766e] border border-[#0d9488]/40 flex items-center justify-center font-bold text-sm">
                  🌊
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#263238]">USGS Streamflow & River Gauges</h3>
                  <p className="text-[9px] text-[#6B6F6B] font-mono">USGS National Water Information System (NWIS)</p>
                </div>
              </div>
              <button onClick={() => setIsRiverModalOpen(false)} className="w-7 h-7 rounded-full bg-[#FAF8F2] border border-[#DDD5C7] text-[#263238] hover:bg-[#E5CDC6] flex items-center justify-center text-sm font-bold cursor-pointer">
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-[#FAF8F2] border border-[#DDD5C7] rounded-xl">
                <span className="text-[8.5px] text-[#6B6F6B] uppercase block">River Water Level</span>
                <span className="text-sm font-black text-[#0f766e]">2.45 m</span>
                <span className="text-[8px] text-[#D97706] block font-bold">Warning Level: 3.50m</span>
              </div>
              <div className="p-2.5 bg-[#FAF8F2] border border-[#DDD5C7] rounded-xl">
                <span className="text-[8.5px] text-[#6B6F6B] uppercase block">Discharge Flow</span>
                <span className="text-sm font-black text-[#263238]">1,840 cfs</span>
                <span className="text-[8px] text-[#6B6F6B] block">Velocity: 2.1 m/s</span>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FFFDF8] rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl border border-[#DDD5C7] font-sans text-[#263238]">
            <div className="flex justify-between items-start border-b border-[#DDD5C7] pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-[#263238]">7-Day Meteorological Outlook</h3>
                <p className="text-[9px] text-[#6B6F6B] font-mono">Detailed Day Forecast & Hazards</p>
              </div>
              <button onClick={() => setSelectedDayDetail(null)} className="w-7 h-7 rounded-full bg-[#FAF8F2] border border-[#DDD5C7] text-[#263238] hover:bg-[#E5CDC6] flex items-center justify-center text-sm font-bold cursor-pointer">
                &times;
              </button>
            </div>

            <div className="p-3 bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl text-xs space-y-1.5">
              <div className="font-bold text-[#263238] font-mono">Precautionary Recommendation:</div>
              <p className="text-[11px] text-[#5A4D49]">
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
  );
}
