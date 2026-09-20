'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
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
  const [flashFloodProb, setFlashFloodProb] = useState<number>(88); // Heat surge / thermal stress head

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
    { name: 'Me (Alex)', relation: 'Self', status: 'SAFE', location: 'Downtown Central District', battery: '88%', lastUpdated: 'Just now' },
    { name: 'Father (David)', relation: 'Father', status: 'AT_SHELTER', location: 'Burton Barr Cooling Oasis', battery: '64%', lastUpdated: '12 min ago' },
    { name: 'Sister (Sarah)', relation: 'Sister', status: 'SAFE', location: 'North Desert Foothills', battery: '92%', lastUpdated: '25 min ago' }
  ]);

  // -------------------------------------------------------------
  // 1. Live Clock
  // -------------------------------------------------------------
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // -------------------------------------------------------------
  // 2. Acoustic Sonar Pulse
  // -------------------------------------------------------------
  const playSonarPulse = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtxRef.current.currentTime + 0.35);

      gain.gain.setValueAtTime(0.35, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + 0.45);
    } catch (e) {
      console.warn('Audio beacon error:', e);
    }
  }, []);

  const toggleAcousticBeacon = () => {
    if (acousticActive) {
      if (beaconIntervalRef.current) clearInterval(beaconIntervalRef.current);
      beaconIntervalRef.current = null;
      setAcousticActive(false);
    } else {
      setAcousticActive(true);
      playSonarPulse();
      beaconIntervalRef.current = setInterval(playSonarPulse, 1200);
    }
  };

  useEffect(() => {
    return () => {
      if (beaconIntervalRef.current) clearInterval(beaconIntervalRef.current);
    };
  }, []);

  // -------------------------------------------------------------
  // 3. Strobe
  // -------------------------------------------------------------
  useEffect(() => {
    let strobeTimer: NodeJS.Timeout | null = null;
    if (strobeActive) {
      let isLit = false;
      strobeTimer = setInterval(() => {
        isLit = !isLit;
        const root = document.getElementById('strobe-overlay');
        if (root) {
          root.style.opacity = isLit ? '0.9' : '0.0';
        }
      }, 250);
    }
    return () => {
      if (strobeTimer) clearInterval(strobeTimer);
    };
  }, [strobeActive]);

  // -------------------------------------------------------------
  // 4. Polling for Live SOS Status Updates & Weather Telemetry
  // -------------------------------------------------------------
  const pollSync = useCallback(async () => {
    try {
      // 1. Citizen Sync
      const res = await fetch('/api/citizen-sync', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          setVerifiedSafeCount(data.stats.totalVerifiedSafe || 1423);
        }
        if (data.recentPings) {
          setAllRecentPings(data.recentPings);
          if (activeSOSBeacon) {
            const matching = data.recentPings.find((p: CitizenPing) => p.id === activeSOSBeacon.id);
            if (matching && matching.status !== activeSOSBeacon.status) {
              setActiveSOSBeacon(matching);
            }
          }
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, [activeSOSBeacon]);

  useEffect(() => {
    pollSync();
    const interval = setInterval(pollSync, 3000);
    return () => clearInterval(interval);
  }, [pollSync]);

  // -------------------------------------------------------------
  // 4b. Fetch CivicPulse Live System Telemetry from /api/live-data
  // -------------------------------------------------------------
  const applyZoneTelemetry = useCallback((zone: LiveZoneTelemetry) => {
    setSelectedZoneId(zone.id);
    setLocationName(`${zone.name}, ${zone.metro}`);
    setUserCoords({ lat: zone.lat, lng: zone.lng });
    
    const tF = zone.temperatureF !== null ? zone.temperatureF : 104;
    const tC = zone.temperatureC !== null ? zone.temperatureC : Math.round(((tF - 32) * 5) / 9);
    const feelsF = zone.apparentTempF !== null ? zone.apparentTempF : tF + 3;
    const feelsC = Math.round(((feelsF - 32) * 5) / 9);
    const hum = zone.humidityPct !== null ? zone.humidityPct : 18;
    const wind = zone.windSpeedMph !== null ? Math.round(zone.windSpeedMph * 1.609) : 12;
    const rain = zone.precipitationIn !== null ? Math.round(zone.precipitationIn * 25.4 * 10) / 10 : 0;
    const score = zone.liveRiskScore !== null ? zone.liveRiskScore : 78;

    setLiveTempF(tF);
    setLiveTempC(tC);
    setLiveFeelsLikeC(feelsC);
    setLiveHumidity(hum);
    setLiveWindSpeedKm(wind);
    setLiveRainIntensity(rain);
    setLiveRiskScore(score);

    if (score >= 70 || tF >= 100) {
      setLiveRiskLevel('CRITICAL RISK INDEX');
      setActionWindowHours(2.5);
      setHeroTitle(`CRITICAL: Extreme Thermal Surge Alert (${tF}°F / ${tC}°C)`);
      setHeroDesc(`Severe heat stress & ozone spike in ${zone.name}. 14 municipal cooling centers activated.`);
      setSurgeDepthM(0.2);
      setLiveRainProb(hum > 40 ? 35 : 10);
      setThunderstormProb(tF > 105 ? 30 : 15);
      setCloudburstProb(8);
      setFlashFloodProb(score);
      setWeatherCondition('Extreme Heatwave Alert');
    } else if (score >= 40 || tF >= 88) {
      setLiveRiskLevel('ELEVATED RISK INDEX');
      setActionWindowHours(5.0);
      setHeroTitle(`ELEVATED: High Thermal & Solar Watch (${tF}°F / ${tC}°C)`);
      setHeroDesc(`Elevated heat index observed. Hydration stations active across ${zone.metro}.`);
      setSurgeDepthM(0.4);
      setLiveRainProb(25);
      setThunderstormProb(45);
      setCloudburstProb(25);
      setFlashFloodProb(score);
      setWeatherCondition('Warm & Sunny');
    } else {
      setLiveRiskLevel('NORMAL RISK INDEX');
      setActionWindowHours(12);
      setHeroTitle('Atmospheric Baseline Stable');
      setHeroDesc(`Current conditions: Stable baseline at ${tC}°C (${tF}°F). Safe for outdoor routines.`);
      setSurgeDepthM(0.4);
      setLiveRainProb(15);
      setThunderstormProb(20);
      setCloudburstProb(10);
      setFlashFloodProb(15);
      setWeatherCondition('Clear & Moderate');
    }
  }, []);

  const fetchCivicPulseLiveData = useCallback(async () => {
    try {
      const res = await fetch('/api/live-data', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.zones && data.zones.length > 0) {
          setMonitoredZones(data.zones);
          const activeZone = data.zones.find((z: LiveZoneTelemetry) => z.id === selectedZoneId) || data.zones[0];
          if (activeZone) {
            applyZoneTelemetry(activeZone);
          }
        }
      }
    } catch (e) {
      console.warn('Live telemetry fetch error:', e);
    }
  }, [selectedZoneId, applyZoneTelemetry]);

  useEffect(() => {
    fetchCivicPulseLiveData();
    const interval = setInterval(fetchCivicPulseLiveData, 60000);
    return () => clearInterval(interval);
  }, [fetchCivicPulseLiveData]);

  // -------------------------------------------------------------
  // 5. Dynamic Location Search & Open-Meteo Fetch
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
                setHeroTitle('HIGH RISK: Monsoon Rain & Inundation Watch');
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
  // 6. Trigger SOS Distress
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
  // 7. Safe Check-in
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
  // 8. Officer Dispatch
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
          etaMinutes: 4
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
  // 9. Audio Broadcast
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center sm:py-4 px-0 sm:px-4 text-slate-800 font-sans antialiased selection:bg-blue-900 selection:text-white relative">
      
      {/* Desktop Companion Top Navigation Bar */}
      <div className="hidden sm:flex items-center justify-between max-w-[440px] w-full mb-2.5 px-2 text-slate-300 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-extrabold text-white tracking-wider">CIVICPULSE CITIZEN HUB</span>
        </div>
        <a 
          href="/" 
          className="px-2.5 py-1 rounded-lg bg-blue-900/90 hover:bg-blue-800 text-cyan-200 border border-blue-500/50 font-bold text-[10.5px] flex items-center gap-1.5 transition shadow-sm"
        >
          <span>🏛️ CivicPulse EOC Dashboard</span>
          <span>↗</span>
        </a>
      </div>

      {/* Visual Strobe Overlay for Night Signaling */}
      <div 
        id="strobe-overlay" 
        className="fixed inset-0 bg-white z-[999] pointer-events-none transition-opacity duration-75 opacity-0"
      />

      {/* Clean Mobile Phone Shell (Exact Phone Grid Length & Frame) */}
      <div className="w-full max-w-[440px] h-[100dvh] sm:h-[890px] sm:max-h-[94vh] sm:my-auto bg-[#f8fafc] sm:rounded-[40px] sm:border-[10px] sm:border-[#1e293b] sm:shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col relative overflow-hidden">
        
        {/* 1. ANDROID STATUS BAR */}
        <div className="h-7 bg-[#0f172a] text-white px-4 flex items-center justify-between text-[11px] font-mono font-bold shrink-0 z-50">
          <span>{clockTime}</span>
          <div className="w-16 h-3 bg-black/60 rounded-full mx-auto" />
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold">5G GPS</span>
            <Wifi className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[10px] text-emerald-400 font-bold">88% ⚡</span>
          </div>
        </div>

        {/* 2. OFFICIAL CIVICPULSE GOVERNMENT HEADER (Emblem + Title + Role Toggle + EOC Link) */}
        <header className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white px-3.5 py-2.5 shadow-md z-40 sticky top-0 border-b-2 border-orange-500 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow text-blue-900 font-black text-base border-2 border-orange-500 shrink-0">
                🏛️
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-black text-sm tracking-tight text-white">CivicPulse</span>
                  <span className="text-[8px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded uppercase">NOAA / FEMA</span>
                </div>
                <p className="text-[8.5px] text-blue-200 font-medium">National NOAA & FEMA Multi-Hazard Early Warning</p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <a
                href="/"
                title="Open Main CivicPulse EOC Command Portal"
                className="px-2 py-1 rounded-lg text-[9.5px] font-bold bg-blue-950/80 text-cyan-200 hover:bg-blue-800 transition border border-blue-500/40 flex items-center space-x-0.5 cursor-pointer"
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
                  setHeroTitle('CRITICAL: Severe Cloudburst & Inundation Warning');
                  setHeroDesc('Severe precipitation observed (120 mm/h). High risk of flash flooding. Move to high ground.');
                  setSurgeDepthM(2.8);
                  setLiveRainIntensity(120);
                }}
                title="Launch SIH Demo Dashboard" 
                className="px-2 py-1 rounded-lg text-[9.5px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 transition shadow flex items-center space-x-1 border border-amber-400 cursor-pointer active:scale-95"
              >
                <span>🎬</span>
                <span>Demo</span>
              </button>

              <button 
                onClick={() => {
                  setIsOfficerMode(!isOfficerMode);
                  if (!isOfficerMode) setActiveTab('PROFILE');
                  else setActiveTab('NOWCAST');
                }}
                className={`px-2 py-1 rounded-lg text-[9.5px] font-bold transition border cursor-pointer ${
                  isOfficerMode 
                    ? 'bg-red-800 text-red-100 border-red-600 animate-pulse' 
                    : 'bg-blue-800 text-blue-100 border-blue-600 hover:bg-blue-700'
                }`}
              >
                {isOfficerMode ? '🚨 Officer' : '👤 Citizen'}
              </button>
            </div>
          </div>
        </header>

        {/* 3. SCROLLABLE SCREEN CONTENT CONTAINER (PHONE VIEWPORT) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3.5 space-y-3.5 pb-20 bg-slate-100">
          
          {/* ========================================================================= */}
          {/* TAB 1: NOWCAST (FIRST PAGE — ALL 4 SCREENSHOT SECTIONS IN EXACT ORDER)      */}
          {/* ========================================================================= */}
          {activeTab === 'NOWCAST' && (
            <div className="space-y-3.5">
              
              {/* SECTION 1: CIVICPULSE ZONE SELECTOR & SEARCH BAR */}
              <div className="bg-white border border-slate-200 p-2.5 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-blue-800 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch(searchQuery)}
                    placeholder="Search City / District (e.g. Phoenix, Miami, Delhi)..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
                  />
                  <button
                    onClick={() => handleLocationSearch(searchQuery)}
                    disabled={isSearchingLocation}
                    className="px-2.5 py-1 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg text-xs shrink-0 cursor-pointer"
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
                    className="p-1 bg-slate-100 border border-slate-300 text-blue-900 hover:bg-slate-200 rounded-lg shrink-0 cursor-pointer"
                  >
                    <Crosshair className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => fetchCivicPulseLiveData()}
                    title="Refresh Live NOAA & CivicPulse Feeds"
                    className="p-1 bg-slate-100 border border-slate-300 text-blue-900 hover:bg-slate-200 rounded-lg shrink-0 cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Horizontal Scrolling CivicPulse Monitored Zone Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5 border-t border-slate-100">
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider shrink-0">CivicPulse Zones:</span>
                  {monitoredZones.slice(0, 10).map((z) => (
                    <button
                      key={z.id}
                      onClick={() => applyZoneTelemetry(z)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
                        selectedZoneId === z.id
                          ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      📍 {z.name.split(' ')[0]} ({z.temperatureF !== null ? `${z.temperatureF}°F` : '95°F'})
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-600 pt-0.5 border-t border-slate-100">
                  <span className="truncate max-w-[220px]">📍 Active: <b>{locationName}</b></span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider text-[8px] flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-ping" />
                    <span>EOC LIVE FEED</span>
                  </span>
                </div>
              </div>

              {/* SECTION 2: HERO RISK STATUS BANNER CARD (Photo 1) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                    liveRiskScore >= 75 ? 'bg-red-100 text-red-800' : liveRiskScore >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${liveRiskScore >= 75 ? 'bg-red-600' : liveRiskScore >= 40 ? 'bg-amber-600' : 'bg-emerald-600'} inline-block`} />
                    <span>{liveRiskLevel}</span>
                  </span>

                  <div className="text-right">
                    <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider">ACTION WINDOW</span>
                    <span className="text-sm font-black font-mono text-slate-900">{actionWindowHours} hrs</span>
                  </div>
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-900 leading-tight">
                    {heroTitle}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {heroDesc}
                  </p>
                </div>

                {/* 3 Telemetry Metrics Chips */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[8px] font-bold text-slate-500 uppercase block">THREAT LEVEL</span>
                    <span className="text-sm font-black text-slate-900">{liveRiskScore}<span className="text-[9px] text-slate-400 font-normal">/100</span></span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[8px] font-bold text-slate-500 uppercase block">SURGE DEPTH</span>
                    <span className="text-sm font-black text-blue-900">+{surgeDepthM}m</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[8px] font-bold text-slate-500 uppercase block">PRECIPITATION</span>
                    <span className="text-sm font-black text-slate-900">{liveRainIntensity} <span className="text-[9px] text-slate-400 font-normal">mm/h</span></span>
                  </div>
                </div>

                {/* 2 Main Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setActiveTab('EVACUATE')}
                    className="py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Evacuate Safe Route</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('SOS')}
                    className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>Send SOS Distress</span>
                  </button>
                </div>
              </div>

              {/* SECTION 3: AI PREDICTIVE MATRIX (2-6H NOWCAST) CARD (Photo 1) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-sm shadow-xs shrink-0">
                      🧠
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">AI PREDICTIVE MATRIX (2–6H NOWCAST)</h3>
                      <p className="text-[9px] text-slate-500 font-mono">Spatiotemporal Transformer &bull; Multi-Task Learning</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsXaiModalOpen(true)}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-[10px] font-bold flex items-center space-x-1 shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
                    <span>XAI Triggers</span>
                  </button>
                </div>

                {/* 3 MTL Output Head Boxes */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-amber-50 rounded-2xl border border-amber-200">
                    <span className="text-[8px] font-bold text-amber-800 uppercase block">🌡️ THERMAL SURGE</span>
                    <span className="text-base font-black font-mono text-amber-950">{liveRiskScore}%</span>
                    <span className="text-[8px] font-bold text-amber-800 block mt-0.5 uppercase">
                      {liveTempF >= 100 ? 'CRITICAL PEAK' : liveTempF >= 88 ? 'ELEVATED' : 'MODERATE'}
                    </span>
                  </div>

                  <div className="p-2 bg-blue-50 rounded-2xl border border-blue-200">
                    <span className="text-[8px] font-bold text-blue-800 uppercase block">⚡ GRID & SQUALL</span>
                    <span className="text-base font-black font-mono text-blue-950">{thunderstormProb}%</span>
                    <span className="text-[8px] text-blue-800 block mt-0.5 font-bold font-mono">
                      {thunderstormProb > 60 ? 'HIGH LOAD' : 'MONITORING'}
                    </span>
                  </div>

                  <div className="p-2 bg-rose-50 rounded-2xl border border-rose-200">
                    <span className="text-[8px] font-bold text-rose-800 uppercase block">🌊 PLUVIAL INUNDATION</span>
                    <span className="text-base font-black font-mono text-rose-950">{flashFloodProb}%</span>
                    <span className="text-[8px] text-rose-800 block mt-0.5 font-bold font-mono">
                      {cloudburstProb > 50 ? `${cloudburstProb}% Burst` : `+${surgeDepthM}m Surge`}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: TODAY'S WEATHER CARD (Photo 2) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-xs font-black text-slate-900 uppercase">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>TODAY&apos;S ATMOSPHERIC VITALS</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">Updated: {clockTime}</span>
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl font-black text-slate-900 font-mono">{liveTempC}°</span>
                      <span className="text-sm font-bold text-slate-500">C</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-xl font-bold text-slate-600 font-mono">{liveTempF}°</span>
                      <span className="text-xs font-bold text-slate-400">F</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Feels like <b>{liveFeelsLikeC}°C</b> &bull; {weatherCondition}
                    </div>
                    <div className="text-[9.5px] text-slate-400 mt-0.5">
                      CivicPulse Real-Time Telemetry Node
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-full text-[10px] font-bold flex items-center space-x-1 shadow-xs">
                    <CloudRain className="w-3.5 h-3.5 text-indigo-700" />
                    <span>{liveRainProb}% Rain Prob</span>
                  </span>
                </div>

                {/* 3 Environmental Vitals Chips */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[8px] font-bold text-slate-500 uppercase block">PRECIPITATION</span>
                    <span className="text-xs font-black text-slate-900">{liveRainIntensity} mm/h</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[8px] font-bold text-slate-500 uppercase block">HUMIDITY</span>
                    <span className="text-xs font-black text-slate-900">{liveHumidity}%</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[8px] font-bold text-slate-500 uppercase block">WIND SPEED</span>
                    <span className="text-xs font-black text-slate-900">{liveWindSpeedKm} km/h</span>
                  </div>
                </div>

                <div className="text-[8.5px] text-slate-400 border-t border-slate-100 pt-1.5 flex justify-between">
                  <span>Source: CivicPulse AI Risk Engine & NOAA Open-Meteo Ensembles</span>
                  <span className="font-bold text-slate-600">● Live Node</span>
                </div>
              </div>

              {/* SECTION 5: TODAY'S HOURLY NOWCAST CARD (Photo 2) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-xs font-black text-slate-900 uppercase">
                    <Clock className="w-4 h-4 text-blue-900" />
                    <span>TODAY&apos;S HOURLY NOWCAST</span>
                  </div>
                  <button onClick={() => setIsXaiModalOpen(true)} className="text-[9.5px] text-blue-900 font-bold hover:underline cursor-pointer">
                    View Full 24h Table ➔
                  </button>
                </div>

                <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-thin text-center font-mono">
                  {[
                    { time: 'Now', temp: 32, prob: '53%', badge: 'Moderate', badgeColor: 'bg-amber-500 text-white', active: true },
                    { time: '03:00 PM', temp: 32, prob: '68%', badge: 'Moderate', badgeColor: 'bg-amber-500 text-white', active: false },
                    { time: '04:00 PM', temp: 32, prob: '87%', badge: 'Critical', badgeColor: 'bg-red-600 text-white', active: false },
                    { time: '05:00 PM', temp: 29, prob: '98%', badge: 'Critical', badgeColor: 'bg-red-600 text-white', active: false },
                    { time: '06:00 PM', temp: 27, prob: '92%', badge: 'Critical', badgeColor: 'bg-red-600 text-white', active: false },
                    { time: '07:00 PM', temp: 26, prob: '85%', badge: 'Critical', badgeColor: 'bg-red-600 text-white', active: false },
                  ].map((h, i) => (
                    <div 
                      key={i} 
                      className={`min-w-[68px] p-2 rounded-2xl border flex flex-col items-center justify-between space-y-1 ${
                        h.active ? 'bg-blue-950 text-white border-blue-900 shadow-sm' : 'bg-slate-50 text-slate-900 border-slate-200'
                      }`}
                    >
                      <span className={`text-[9px] font-bold ${h.active ? 'text-blue-200' : 'text-slate-500'}`}>{h.time}</span>
                      <CloudRain className={`w-4 h-4 ${h.active ? 'text-amber-400' : 'text-blue-600'}`} />
                      <span className="text-xs font-black">{h.temp}°</span>
                      <span className={`text-[8.5px] ${h.active ? 'text-blue-300' : 'text-blue-700 font-bold'}`}>{h.prob}</span>
                      <span className={`text-[7.5px] px-1 py-0.2 rounded font-bold uppercase tracking-wider ${h.badgeColor}`}>
                        {h.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 6: TODAY'S PRECAUTION ENGINE CARD (Photo 2) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-slate-900 uppercase">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>TODAY&apos;S PRECAUTION ENGINE</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                    AI Recommended
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-bold text-blue-900">
                      <span className="px-1.5 py-0.2 bg-blue-100 rounded uppercase font-black">ADVISORY</span>
                      <span className="text-slate-500">🕒 Throughout Today</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs font-black text-slate-900 pt-0.5">
                      <span>☂️</span>
                      <span>Rain Gear & Commute Alert</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-tight">
                      <b>Why:</b> Persistent rain showers forecasted across the urban sector.
                    </p>
                    <p className="text-[10.5px] text-slate-600">
                      Carry rain gear, stay clear of low-lying waterlogged roads.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-bold text-amber-900">
                      <span className="px-1.5 py-0.2 bg-amber-100 rounded uppercase font-black">CAUTION</span>
                      <span className="text-slate-500">🕒 Next 2 Hours</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs font-black text-slate-900 pt-0.5">
                      <span>⚡</span>
                      <span>Lightning & Convective Surge Precaution</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-tight">
                      <b>Why:</b> Atmospheric convective instability producing lightning.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 7: NEXT 7 DAYS FORECAST (Photo 3) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-slate-900 uppercase">
                    <Clock className="w-4 h-4 text-blue-900" />
                    <span>NEXT 7 DAYS FORECAST</span>
                  </div>
                  <span className="text-[9.5px] text-slate-400">Tap day for details</span>
                </div>

                <div className="space-y-1.5">
                  {[
                    { day: 'Today', date: 'Sep 20', condition: 'Thunderstorm ...', high: 32, low: 25, rainProb: '98% Rain', risk: 'Critical', riskColor: 'text-red-600 font-bold' },
                    { day: 'Tomorrow', date: 'Sep 21', condition: 'Thunderstorm ...', high: 31, low: 23, rainProb: '98% Rain', risk: 'Critical', riskColor: 'text-red-600 font-bold' },
                    { day: 'Tue', date: 'Sep 22', condition: 'Thunderstorm ...', high: 31, low: 23, rainProb: '90% Rain', risk: 'Critical', riskColor: 'text-red-600 font-bold' },
                    { day: 'Wed', date: 'Sep 23', condition: 'Thunderstorm ...', high: 28, low: 23, rainProb: '86% Rain', risk: 'Critical', riskColor: 'text-red-600 font-bold' },
                    { day: 'Thu', date: 'Sep 24', condition: 'Moderate Sho...', high: 26, low: 22, rainProb: '83% Rain', risk: 'Caution', riskColor: 'text-amber-600 font-bold' },
                    { day: 'Fri', date: 'Sep 25', condition: 'Slight Rain Sho...', high: 27, low: 22, rainProb: '69% Rain', risk: 'Caution', riskColor: 'text-amber-600 font-bold' },
                    { day: 'Sat', date: 'Sep 26', condition: 'Light Drizzle', high: 29, low: 23, rainProb: '45% Rain', risk: 'Advisory', riskColor: 'text-blue-600 font-bold' }
                  ].map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDayDetail(i)}
                      className="w-full p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between text-xs transition-colors cursor-pointer text-left font-mono"
                    >
                      <div className="w-20">
                        <div className="font-black text-slate-900 text-[11px]">{d.day}</div>
                        <div className="text-[8.5px] text-slate-400">{d.date}</div>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-1">
                        <CloudLightning className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        <span className="text-[10px] text-slate-700 truncate">{d.condition}</span>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-slate-900 text-[11px]">{d.high}° / {d.low}°</div>
                        <div className={`text-[8.5px] ${d.riskColor}`}>{d.rainProb} ({d.risk})</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 8: OFFICIAL DISASTER BULLETINS CARD (Photo 4) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-slate-900 uppercase">
                    <Bell className="w-4 h-4 text-orange-600" />
                    <span>OFFICIAL DISASTER BULLETINS</span>
                  </div>
                  <button onClick={() => setActiveTab('ALERTS')} className="text-[9.5px] text-blue-900 font-bold hover:underline cursor-pointer">
                    View All ➔
                  </button>
                </div>

                <div className="p-3 bg-red-50/50 border border-red-200 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-bold">
                    <span className="px-1.5 py-0.2 bg-red-100 text-red-800 rounded uppercase font-black">NORMAL</span>
                    <span className="text-slate-500">Active</span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900">
                    GREEN NORMAL: Regional Weather & Readiness Watch
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Atmospheric indicators within normal range. Early warning sensors connected and scanning 24/7.
                  </p>
                </div>
              </div>

              {/* SECTION 9: QUICK UTILITY GRID / TOOL TILES (Photo 4) */}
              <div className="space-y-2">
                {/* Satellite Banner Tile */}
                <button
                  onClick={() => setIsSatelliteModalOpen(true)}
                  className="w-full bg-gradient-to-r from-blue-950 to-indigo-900 text-white p-3 rounded-2xl shadow-sm flex items-center justify-between border border-blue-800 hover:opacity-95 transition cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-800/80 flex items-center justify-center text-sm shadow-inner shrink-0">
                      🛰️
                    </div>
                    <div>
                      <div className="font-bold text-xs">NOAA GOES-R / NASA Direct</div>
                      <div className="text-[9px] text-blue-200 font-mono">Direct L-Band Emergency Telemetry & Downlink (1694.1 MHz)</div>
                    </div>
                  </div>
                  <span className="text-[9px] bg-blue-800/90 text-blue-200 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                    1694 MHz
                  </span>
                </button>

                {/* 2x2 Feature Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setIsBleMeshModalOpen(true)}
                    className="p-3 bg-white border border-slate-200 hover:border-blue-700 rounded-2xl flex items-center space-x-2 shadow-xs transition cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-[11px]">BLE Mesh Network</div>
                      <div className="text-[8.5px] text-slate-500">Zero-Signal Relay</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('PROFILE')}
                    className="p-3 bg-white border border-slate-200 hover:border-blue-700 rounded-2xl flex items-center space-x-2 shadow-xs transition cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-[11px]">Family Safety</div>
                      <div className="text-[8.5px] text-slate-500">{familyMembers.length} Registered &bull; {verifiedSafeCount} Safe</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setIsRiverModalOpen(true)}
                    className="p-3 bg-white border border-slate-200 hover:border-blue-700 rounded-2xl flex items-center space-x-2 shadow-xs transition cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
                      <Waves className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-[11px]">USGS Hydro Telemetry</div>
                      <div className="text-[8.5px] text-slate-500">NWIS Water Sensors</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setIsTransitPassOpen(true)}
                    className="p-3 bg-white border border-slate-200 hover:border-blue-700 rounded-2xl flex items-center space-x-2 shadow-xs transition cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-[11px]">Relief Kit QR Auth</div>
                      <div className="text-[8.5px] text-slate-500">Offline Validated</div>
                    </div>
                  </button>
                </div>

                {/* Emergency Hotline Card */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center text-sm shadow-xs shrink-0">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">National Emergency & Disaster Helpline</div>
                      <div className="text-[9px] text-slate-600 font-mono">Emergency: <b>911</b> &bull; FEMA Hotline: <b>1-800-621-3362</b></div>
                    </div>
                  </div>
                  <a
                    href="tel:911"
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
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
            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-blue-900" />
                    <span>GIS EARLY WARNING TACTICAL MAP</span>
                  </span>
                  <span className="text-[9px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                    CivicPulse GIS Layer
                  </span>
                </div>

                <div className="w-full h-64 bg-slate-900 rounded-2xl relative overflow-hidden border border-slate-300 flex flex-col items-center justify-center text-center p-4">
                  <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                  <div className="w-16 h-16 rounded-full border-2 border-emerald-500/80 animate-ping absolute" />
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-lg relative z-10 border-2 border-white">
                    📍
                  </div>
                  <div className="relative z-10 text-white mt-3 space-y-1">
                    <div className="text-xs font-bold">{locationName.split(',')[0]} Operations Basin</div>
                    <div className="text-[10px] text-blue-200">Lat {userCoords.lat.toFixed(4)}, Lng {userCoords.lng.toFixed(4)}</div>
                    <span className="inline-block px-2 py-0.5 bg-emerald-600 text-white text-[8px] rounded-full font-bold">
                      Designated Safe Ridge Elevation & Cool Zone
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button 
                    onClick={() => setActiveTab('EVACUATE')}
                    className="p-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-center shadow-xs cursor-pointer"
                  >
                    View Safe Corridor ➔
                  </button>
                  <button 
                    onClick={() => setActiveTab('SOS')}
                    className="p-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-center shadow-xs cursor-pointer"
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
              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white rounded-3xl p-4 shadow-sm space-y-2 border border-blue-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span>🎬</span>
                    <span>CIVICPULSE SCENARIO SIMULATOR</span>
                  </span>
                  <span className="text-[9px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-2 py-0.5 rounded font-bold">LIVE 2-WAY</span>
                </div>
                <p className="text-[11px] text-blue-200 font-sans">
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
                  className="w-full p-3 bg-white border border-red-300 hover:border-red-600 rounded-2xl flex items-center justify-between shadow-xs transition cursor-pointer text-left"
                >
                  <div>
                    <div className="font-bold text-red-900 text-xs">Scenario A: Extreme Heatwave & Grid Crisis</div>
                    <div className="text-[9.5px] text-slate-500 font-sans">114°F ambient spike, demand response & paramedic surge</div>
                  </div>
                  <span className="px-2 py-1 bg-red-600 text-white rounded-lg text-[9px] font-bold">Trigger</span>
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
                  className="w-full p-3 bg-white border border-blue-300 hover:border-blue-600 rounded-2xl flex items-center justify-between shadow-xs transition cursor-pointer text-left"
                >
                  <div>
                    <div className="font-bold text-blue-900 text-xs">Scenario B: Monsoon Cloudburst & Flash Flood</div>
                    <div className="text-[9.5px] text-slate-500 font-sans">120 mm/h rain surge, triggers evacuation corridor</div>
                  </div>
                  <span className="px-2 py-1 bg-blue-700 text-white rounded-lg text-[9px] font-bold">Trigger</span>
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
                  className="w-full p-3 bg-white border border-emerald-300 hover:border-emerald-600 rounded-2xl flex items-center justify-between shadow-xs transition cursor-pointer text-left"
                >
                  <div>
                    <div className="font-bold text-emerald-900 text-xs">Reset: Restore Baseline Telemetry</div>
                    <div className="text-[9.5px] text-slate-500 font-sans">Syncs live conditions from NOAA / Open-Meteo feeds</div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-700 text-white rounded-lg text-[9px] font-bold">Reset</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: EVACUATE & SAFE ROUTES                                             */}
          {/* ========================================================================= */}
          {activeTab === 'EVACUATE' && (
            <div className="space-y-3 font-mono">
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-blue-700" />
                    <span>DESIGNATED SAFE EVACUATION CORRIDOR</span>
                  </span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    ACTIVE ROUTE
                  </span>
                </div>

                <div className="space-y-2 text-xs font-sans">
                  <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-2xl flex items-start gap-2 text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold font-mono text-xs">PRIMARY SAFE ROUTE: North High Ridge Corridor</div>
                      <div className="text-[11px] text-emerald-800 leading-tight mt-0.5">
                        Proceed North via Temple Hill Pass (1.2 km). Elevated relief camp with emergency power and paramedics on duty.
                      </div>
                    </div>
                  </div>

                  <div className="bg-rose-50 border border-rose-300 p-2.5 rounded-2xl flex items-start gap-2 text-rose-950">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold font-mono text-xs">HAZARD CUTOFF: Lowland River Basin</div>
                      <div className="text-[11px] text-rose-800 leading-tight mt-0.5">
                        Water surge inundation wave expected. Avoid underpasses and river bank roads.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                  <span className="text-blue-900 font-bold">Free Municipal Transit Active</span>
                  <button
                    onClick={() => setIsTransitPassOpen(true)}
                    className="bg-blue-900 hover:bg-blue-950 text-white px-3 py-1 rounded-xl font-bold flex items-center gap-1 shadow-xs text-xs cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Relief Transit Pass</span>
                  </button>
                </div>
              </div>

              {/* Verified Relief Shelters */}
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-900" />
                    <span>VERIFIED HIGH-GROUND RELIEF SHELTERS</span>
                  </span>
                  <span className="text-[9px] text-slate-500">3 Open</span>
                </div>

                <div className="space-y-2.5">
                  {DEFAULT_SHELTERS.map((s) => (
                    <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-bold text-xs text-slate-900 font-sans">{s.name}</div>
                          <div className="text-[10px] text-slate-500">{s.address}</div>
                        </div>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold shrink-0">
                          {s.capacity}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200">
                        <span className="text-blue-900 font-semibold">{s.distance} ({s.walkTime})</span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + s.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-900 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 text-[9.5px]"
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
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-orange-600" />
                    <span>EMERGENCY DISASTER ADVISORIES</span>
                  </span>
                  <button onClick={toggleAudioAlert} className="text-[10px] text-blue-900 font-bold flex items-center gap-1 cursor-pointer">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Audio Broadcast</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="px-1.5 py-0.2 bg-red-600 text-white rounded uppercase">RED CRITICAL</span>
                      <span className="text-slate-500">Just now</span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900">Severe Inundation & Flash Flood Nowcast</h4>
                    <p className="text-[11px] text-slate-700 font-sans">
                      Move essential belongings to upper floors. High-velocity runoff channeled into lowlands.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="px-1.5 py-0.2 bg-amber-600 text-white rounded uppercase">AMBER ADVISORY</span>
                      <span className="text-slate-500">15 mins ago</span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900">Lightning & Thunderstorm Advisory</h4>
                    <p className="text-[11px] text-slate-700 font-sans">
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
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center font-black text-base shadow">
                      {isOfficerMode ? '👮' : '👤'}
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900">{isOfficerMode ? 'Battalion Chief Marcus Vance' : 'Alex Morgan'}</h3>
                      <p className="text-[9.5px] text-slate-500">{isOfficerMode ? 'Phoenix Fire Rescue & FEMA Task Force 1' : 'Citizen ID: CIVICPULSE-US-8492 • Maricopa County, AZ'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOfficerMode(!isOfficerMode)}
                    className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-xl text-[9.5px] font-bold hover:bg-slate-200 cursor-pointer"
                  >
                    Switch Role
                  </button>
                </div>

                {isOfficerMode ? (
                  /* Officer Live Triage Queue */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-900 text-xs">
                      <span>INCOMING CITIZEN RESCUE CALLS ({allRecentPings.filter(p => p.type !== 'SAFE').length})</span>
                      <button onClick={pollSync} className="text-blue-900 text-[10px] flex items-center gap-1 cursor-pointer">
                        <RotateCw className="w-3 h-3" />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {allRecentPings.filter(p => p.type !== 'SAFE').length === 0 ? (
                      <div className="p-4 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500">
                        No pending citizen distress calls.
                      </div>
                    ) : (
                      allRecentPings.filter(p => p.type !== 'SAFE').map((ping) => (
                        <div key={ping.id} className="p-3 bg-red-50/50 border border-red-200 rounded-2xl space-y-1.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{ping.categoryName}</div>
                              <div className="text-[9.5px] text-slate-500">{ping.address} &bull; {ping.timeFormatted}</div>
                            </div>
                            <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-bold ${
                              ping.status === 'PENDING' ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {ping.status}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-700 font-sans bg-white p-2 rounded-xl border border-slate-200">
                            “{ping.notes}”
                          </p>

                          {ping.status === 'PENDING' && (
                            <button
                              onClick={() => handleOfficerDispatch(ping.id)}
                              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Siren className="w-3.5 h-3.5" />
                              <span>Dispatch Phoenix Fire Unit (EMS-04)</span>
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
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Household Safety Status</span>
                      {familyMembers.map((m, i) => (
                        <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{m.name} ({m.relation})</div>
                            <div className="text-[9.5px] text-slate-500">{m.location} &bull; Bat {m.battery}</div>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                            {m.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleCheckInSafe}
                      disabled={isSafeCheckedIn}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-2xl font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
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
                <div className="bg-white border-2 border-red-500 rounded-3xl p-4 shadow-xl space-y-3.5">
                  <div className="flex items-center justify-between border-b border-red-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center animate-ping">
                        <Siren className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] text-red-600 font-extrabold uppercase">EMERGENCY BEACON ACTIVE</span>
                        <h3 className="text-xs font-bold text-slate-900">{activeSOSBeacon.categoryName}</h3>
                      </div>
                    </div>
                    <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                      {activeSOSBeacon.status === 'DISPATCHED' ? 'RESCUE EN ROUTE' : 'PENDING TRIAGE'}
                    </span>
                  </div>

                  {/* 3-Stage Progress */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>1. Transmitted to FEMA IPAWS & Municipal EOC</span>
                      <span className="text-[9px] text-slate-500 ml-auto">{activeSOSBeacon.timeFormatted}</span>
                    </div>

                    <div className={`flex items-center gap-2 font-bold ${
                      activeSOSBeacon.status === 'DISPATCHED' ? 'text-emerald-700' : 'text-amber-700 animate-pulse'
                    }`}>
                      {activeSOSBeacon.status === 'DISPATCHED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Radio className="w-4 h-4 text-amber-600 animate-spin" />
                      )}
                      <span>2. Municipal 911 Command Desk Locked</span>
                      <span className="text-[9px] text-slate-500 ml-auto">GPS Verified</span>
                    </div>

                    <div className={`flex items-center gap-2 font-bold p-2.5 rounded-2xl border ${
                      activeSOSBeacon.status === 'DISPATCHED'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <Siren className={`w-4 h-4 ${activeSOSBeacon.status === 'DISPATCHED' ? 'text-emerald-600 animate-bounce' : 'text-slate-400'}`} />
                      <div>
                        <div>3. Rescue Team Dispatched!</div>
                        {activeSOSBeacon.assignedUnit && (
                          <div className="text-[10px] text-emerald-700 font-normal">
                            Assigned: <b>{activeSOSBeacon.assignedUnit}</b> (ETA ~{activeSOSBeacon.etaMinutes || 4} min)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sonar & Strobe controls */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={toggleAcousticBeacon}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        acousticActive ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{acousticActive ? 'Sonar Active' : 'Acoustic (880Hz)'}</span>
                    </button>

                    <button
                      onClick={() => setStrobeActive(!strobeActive)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        strobeActive ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      <span>{strobeActive ? 'Strobe Active' : 'Morse Strobe'}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setActiveSOSBeacon(null)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Cancel Distress Beacon / I Am Safe
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3.5">
                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest block">
                      EMERGENCY DISASTER RESCUE NETWORK
                    </span>
                    <h2 className="text-base font-black text-slate-900">
                      SOS Distress Beacon
                    </h2>
                    <p className="text-[11px] text-slate-500 font-sans">
                      Tap below to transmit an immediate high-priority signal and GPS coordinates to Municipal 911 & FEMA EOC command desks.
                    </p>
                  </div>

                  <div className="py-2 flex justify-center">
                    <button
                      onClick={handleTriggerSOS}
                      disabled={isSendingSOS}
                      className="w-36 h-36 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-mono font-black text-xl tracking-widest flex flex-col items-center justify-center shadow-2xl transition border-4 border-red-800 hover:border-white cursor-pointer"
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
                        selectedSOSCategory === 'HEAT_STROKE' ? 'bg-red-50 border-red-500 text-red-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>🌡️ Heat Stroke</span>
                      <span className="text-[8px] opacity-80">Severe Dehydration</span>
                    </button>

                    <button
                      onClick={() => setSelectedSOSCategory('FLOOD_TRAP')}
                      className={`p-2.5 rounded-2xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                        selectedSOSCategory === 'FLOOD_TRAP' ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>🌊 Flood Trap</span>
                      <span className="text-[8px] opacity-80">Ground Water Cutoff</span>
                    </button>

                    <button
                      onClick={() => setSelectedSOSCategory('POWER_FAILURE')}
                      className={`p-2.5 rounded-2xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                        selectedSOSCategory === 'POWER_FAILURE' ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>⚡ Power / AC Outage</span>
                      <span className="text-[8px] opacity-80">Oxygen Meds at Risk</span>
                    </button>

                    <button
                      onClick={() => setSelectedSOSCategory('MEDICAL_SOS')}
                      className={`p-2.5 rounded-2xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                        selectedSOSCategory === 'MEDICAL_SOS' ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>🚑 Medical Emergency</span>
                      <span className="text-[8px] opacity-80">Paramedic Immediate</span>
                    </button>
                  </div>

                  {/* Triage Modifiers */}
                  <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-bold">Persons in Danger:</span>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 4, 6].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setPeopleCount(cnt)}
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                              peopleCount === cnt
                                ? 'bg-blue-900 text-white border-blue-900'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
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
                          hasInfant ? 'bg-red-100 text-red-900 border-red-400' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        👶 Infant Present
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasElderly(!hasElderly)}
                        className={`p-1.5 rounded-lg border font-bold cursor-pointer text-center ${
                          hasElderly ? 'bg-amber-100 text-amber-900 border-amber-400' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        👴 Senior Citizen
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasMedicalOxygen(!hasMedicalOxygen)}
                        className={`p-1.5 rounded-lg border font-bold cursor-pointer text-center ${
                          hasMedicalOxygen ? 'bg-blue-100 text-blue-900 border-blue-400' : 'bg-slate-50 text-slate-600 border-slate-200'
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-sans outline-none focus:border-blue-900"
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
              className="w-13 h-13 rounded-full bg-red-600 text-white flex flex-col items-center justify-center shadow-xl border-2 border-white active:scale-95 transition-transform hover:bg-red-700 cursor-pointer"
              title="Quick SOS Emergency Trigger"
            >
              <Radio className="w-5 h-5 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-wider">SOS</span>
            </button>
          </div>
        )}

        {/* 5. ANDROID BOTTOM NAVIGATION BAR (Clean White / Blue Accent - 6 Tabs) */}
        <nav className="bg-white border-t border-slate-200 px-1 py-1.5 flex items-center justify-around z-50 shrink-0 w-full shadow-[0_-4px_12px_rgba(0,0,0,0.06)] min-h-[60px]">
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
                    ? t.isDemo ? 'text-amber-600 font-black' : 'text-blue-900 font-extrabold'
                    : 'text-slate-500 font-medium hover:text-slate-700'
                }`}
              >
                <div className={`p-1 rounded-xl transition ${
                  isActive 
                    ? t.isDemo ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-blue-50 text-blue-900'
                    : t.isDemo ? 'bg-amber-50/80 text-amber-700' : 'text-slate-500'
                }`}>
                  <t.icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </div>
                <span className={`text-[9px] leading-none mt-0.5 tracking-tight ${t.isDemo ? 'font-bold text-amber-700' : ''}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </nav>

      </div>

      {/* ========================================================================= */}
      {/* 🧠 POPUP MODAL: EXPLAINABLE AI (XAI) MODEL DIAGNOSTICS                    */}
      {/* ========================================================================= */}
      {isXaiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto scrollbar-thin font-sans text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-900 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow">
                  🧠
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Explainable AI (XAI) Diagnostics</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Spatiotemporal Transformer &bull; 2–6h Nowcast</p>
                </div>
              </div>
              <button onClick={() => setIsXaiModalOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-bold cursor-pointer">
                &times;
              </button>
            </div>

            {/* NWP Bypass Banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 space-y-1 text-xs text-indigo-950">
              <div className="flex items-center justify-between font-bold text-[11px]">
                <span className="flex items-center space-x-1 text-indigo-800">
                  <Zap className="w-4 h-4" />
                  <span>NWP Latency Bypass Engine</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900 text-[9px] font-mono">38ms Inference</span>
              </div>
              <p className="text-[10.5px] leading-relaxed">
                Traditional physics-based NWP models require 6–12 hour simulation runs. CivicPulse deep learning transformers extract multivariate precursors in <b>38 milliseconds</b>, delivering actionable <b>2 to 6-hour lead time</b>.
              </p>
            </div>

            {/* 4 Pillars */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">4 Atmospheric Predictive Pillars</h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[8.5px] font-bold text-slate-500 uppercase block">💧 Fuel: IWV Moisture</span>
                  <span className="text-xs font-black text-blue-900">54.2 kg/m²</span>
                  <span className="text-[8px] text-emerald-700 block font-bold">+8.4 kg/m² / 2h</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[8.5px] font-bold text-slate-500 uppercase block">⚡ Energy: CAPE / CIN</span>
                  <span className="text-xs font-black text-amber-700">2,450 J/kg</span>
                  <span className="text-[8px] text-slate-500 block">CIN Cap: 15 J/kg</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[8.5px] font-bold text-slate-500 uppercase block">🌪️ Lift: CTT Drop Rate</span>
                  <span className="text-xs font-black text-purple-900">-14.2°C / 15m</span>
                  <span className="text-[8px] text-slate-500 block">Conv: 14.2 × 10⁻⁵</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[8.5px] font-bold text-slate-500 uppercase block">⛰️ Topography: USGS 3DEP LiDAR</span>
                  <span className="text-xs font-black text-emerald-900">28.4° Slope</span>
                  <span className="text-[8px] text-slate-500 block">Soil Sat: 86%</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsXaiModalOpen(false)}
              className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold shadow cursor-pointer"
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
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto scrollbar-thin font-sans text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-950 text-white flex items-center justify-center text-sm shadow">
                  🛰️
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">NOAA GOES-16/18 Direct Downlink EWMS</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Direct L-Band Emergency Telemetry & HRIT/EMWIN Broadcast</p>
                </div>
              </div>
              <button onClick={() => setIsSatelliteModalOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-bold cursor-pointer">
                &times;
              </button>
            </div>

            <div className="p-3 bg-slate-900 text-emerald-400 rounded-2xl font-mono text-[10px] space-y-1">
              <div className="text-slate-400 text-[8.5px] flex justify-between">
                <span>RAW L-BAND EMWIN PACKET:</span>
                <span className="text-emerald-300">CRC-16 OK (0x9B4F)</span>
              </div>
              <div className="tracking-widest">
                55 AA 04 1E 08 4E 1A 9B 4F 82 11 F0 38 29
              </div>
              <div className="text-[9px] text-slate-300">
                Payload: NOAA Multi-Hazard Emergency Alert &bull; Frequency: 1694.1 MHz HRIT
              </div>
            </div>

            <button
              onClick={() => setIsSatelliteModalOpen(false)}
              className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold shadow cursor-pointer"
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
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl font-sans text-slate-800 relative">
            <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
              <div>
                <span className="text-[9px] font-bold text-blue-900 uppercase tracking-wider block">
                  MUNICIPAL DISASTER RELIEF
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Emergency Free Transit Pass
                </h3>
              </div>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                VALID TODAY
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-center space-y-2">
              <div className="w-36 h-36 mx-auto bg-white p-2 rounded-xl border border-slate-200 shadow-inner flex flex-col items-center justify-center">
                <div className="grid grid-cols-6 gap-1 p-1.5">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-3.5 h-3.5 rounded-xs ${i % 2 === 0 || i % 5 === 0 ? 'bg-slate-900' : 'bg-transparent'}`} 
                    />
                  ))}
                </div>
                <span className="text-[8.5px] text-slate-500 font-mono mt-0.5">#CIVICPULSE-2026-RELIEF-AUTH</span>
              </div>

              <div className="text-[11px] text-slate-700">
                Show this pass to any transit operator for zero-fare boarding to verified emergency cooling centers.
              </div>
            </div>

            <button
              onClick={() => setIsTransitPassOpen(false)}
              className="w-full bg-blue-900 hover:bg-blue-950 text-white py-2 rounded-xl font-bold text-xs shadow cursor-pointer"
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
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl font-sans text-slate-800">
            <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-sm">
                  📶
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">BLE Mesh Zero-Signal Relay</h3>
                  <p className="text-[9px] text-slate-500">Device-to-Device Multi-Hop Network</p>
                </div>
              </div>
              <button onClick={() => setIsBleMeshModalOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-bold cursor-pointer">
                &times;
              </button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-1.5">
              <div className="font-bold text-blue-950 flex items-center justify-between">
                <span>Mesh Peers Nearby:</span>
                <span className="text-emerald-700 font-mono font-black">6 Nodes Connected</span>
              </div>
              <p className="text-[11px] text-slate-700">
                When cellular 4G/5G towers collapse, your emergency SOS hops across neighbouring phones via Bluetooth Low Energy (BLE) until reaching an active satellite uplink node.
              </p>
            </div>

            <button
              onClick={() => setIsBleMeshModalOpen(false)}
              className="w-full bg-blue-900 hover:bg-blue-950 text-white py-2 rounded-xl font-bold text-xs shadow cursor-pointer"
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
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl font-sans text-slate-800">
            <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-900 flex items-center justify-center font-bold text-sm">
                  🌊
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">USGS Streamflow & River Gauges</h3>
                  <p className="text-[9px] text-slate-500">USGS National Water Information System (NWIS)</p>
                </div>
              </div>
              <button onClick={() => setIsRiverModalOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-bold cursor-pointer">
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[8.5px] text-slate-500 uppercase block">River Water Level</span>
                <span className="text-sm font-black text-cyan-900">2.45 m</span>
                <span className="text-[8px] text-amber-700 block font-bold">Warning Level: 3.50m</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[8.5px] text-slate-500 uppercase block">Discharge Flow</span>
                <span className="text-sm font-black text-slate-900">1,840 cusecs</span>
                <span className="text-[8px] text-slate-500 block">Velocity: 2.1 m/s</span>
              </div>
            </div>

            <button
              onClick={() => setIsRiverModalOpen(false)}
              className="w-full bg-blue-900 hover:bg-blue-950 text-white py-2 rounded-xl font-bold text-xs shadow cursor-pointer"
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
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl font-sans text-slate-800">
            <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">7-Day Meteorological Outlook</h3>
                <p className="text-[9px] text-slate-500 font-mono">Detailed Day Forecast & Hazards</p>
              </div>
              <button onClick={() => setSelectedDayDetail(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-bold cursor-pointer">
                &times;
              </button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-1.5">
              <div className="font-bold text-blue-950">Precautionary Recommendation:</div>
              <p className="text-[11px] text-slate-700">
                Maintain charged battery reserves, avoid waterlogged lowlands, and monitor official CivicPulse disaster advisories.
              </p>
            </div>

            <button
              onClick={() => setSelectedDayDetail(null)}
              className="w-full bg-blue-900 hover:bg-blue-950 text-white py-2 rounded-xl font-bold text-xs shadow cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
