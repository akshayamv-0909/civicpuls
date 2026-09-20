'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Navigation, 
  Volume2, 
  VolumeX, 
  QrCode, 
  ChevronRight, 
  HeartHandshake, 
  ArrowLeft,
  Sun,
  Wind,
  Droplets,
  AlertTriangle,
  Siren,
  PhoneCall,
  Flame,
  Compass,
  Building2,
  Radio,
  Zap,
  CheckSquare,
  Square,
  Users,
  Bell,
  Sliders,
  Sparkles,
  Share2,
  Search,
  Crosshair,
  RotateCw,
  Cpu,
  Satellite,
  ShieldCheck
} from 'lucide-react';
import { SOSCategory, CitizenPing } from '@/app/api/citizen-sync/route';

type CitizenTab = 'WEATHER' | 'SOS' | 'EVACUATION' | 'OFFICER';

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

interface EvacKitItem {
  id: number;
  text: string;
  category: string;
  done: boolean;
}

interface NotificationSetting {
  inApp: boolean;
  push: boolean;
  sms: boolean;
  callIvr: boolean;
  quietHours: boolean;
  criticalBypass: boolean;
}

const DEFAULT_SHELTERS: Shelter[] = [
  {
    id: 'sh-1',
    name: 'Burton Barr Central Library (Municipal Cooling Hub)',
    address: '1221 N Central Ave, Phoenix, AZ 85004',
    distance: '0.4 miles away',
    walkTime: '8 min walk',
    capacity: '48 / 120 Available',
    status: 'OPEN',
    amenities: ['High-Power AC', 'Cold Water Refill', 'Medical Staff on Duty', 'Device Charging', 'Backup Generator']
  },
  {
    id: 'sh-2',
    name: 'Eastlake Park Community Center',
    address: '1549 E Jefferson St, Phoenix, AZ 85034',
    distance: '0.9 miles away',
    walkTime: '18 min walk / 4 min bus',
    capacity: '32 / 80 Available',
    status: 'OPEN',
    amenities: ['AC Gymnasium', 'Hydration Station', 'Senior Care Area', 'Backup Generator']
  },
  {
    id: 'sh-3',
    name: 'Harmon Park Civic Recreation Hub',
    address: '1239 S 5th Ave, Phoenix, AZ 85003',
    distance: '1.2 miles away',
    walkTime: '24 min walk / 6 min bus',
    capacity: '15 / 60 Available',
    status: 'LIMITED',
    amenities: ['Shaded Pavilion', 'Emergency Medical Kit', 'Free Bus Transfer', 'Pet Friendly Area']
  }
];

export default function CitizenLifelinePage() {
  // Navigation & Role
  const [activeTab, setActiveTab] = useState<CitizenTab>('WEATHER');
  const [isOfficerMode, setIsOfficerMode] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState(9900); // ~2h 45m
  const [language, setLanguage] = useState<'EN' | 'ES'>('EN');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Modals
  const [isTransitPassOpen, setIsTransitPassOpen] = useState(false);
  const [isXaiModalOpen, setIsXaiModalOpen] = useState(false);
  const [isSatelliteModalOpen, setIsSatelliteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Acoustic Search Beacon & Optical Strobe
  const [acousticActive, setAcousticActive] = useState<boolean>(false);
  const [strobeActive, setStrobeActive] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beaconIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Live Location & Weather Telemetry
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('Phoenix Downtown Core, AZ');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: 33.4484, lng: -112.0740 });
  const [gpsStatus, setGpsStatus] = useState<string>('GPS Locked (Ward 4)');
  const [isSearchingLocation, setIsSearchingLocation] = useState<boolean>(false);

  const [liveTemp, setLiveTemp] = useState<number>(84.4);
  const [liveFeelsLike, setLiveFeelsLike] = useState<number>(87.6);
  const [liveHumidity, setLiveHumidity] = useState<number>(25);
  const [liveAqi, setLiveAqi] = useState<number>(68);
  const [liveWindSpeed, setLiveWindSpeed] = useState<number>(6.8);
  const [livePressure, setLivePressure] = useState<number>(1012.4);
  const [weatherCondition, setWeatherCondition] = useState<string>('Sunny & Clear');

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

  // Family Safety Status
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { name: 'Me (Citizen)', relation: 'Self', status: 'SAFE', location: 'Phoenix Downtown Core', battery: '88%', lastUpdated: 'Just now' },
    { name: 'Elena (Mother)', relation: 'Mother', status: 'AT_SHELTER', location: 'Burton Barr Cooling Hub', battery: '64%', lastUpdated: '12 min ago' },
    { name: 'David (Brother)', relation: 'Brother', status: 'SAFE', location: 'Tempe Midtown', battery: '92%', lastUpdated: '25 min ago' }
  ]);

  // Evacuation Kit Checklist
  const [evacKit, setEvacKit] = useState<EvacKitItem[]>([
    { id: 1, text: 'Drinking Water (2 Liters / Person)', category: 'Hydration', done: true },
    { id: 2, text: 'Government ID & Health Cards in Sealed Pouch', category: 'Documents', done: true },
    { id: 3, text: 'Prescription Medicines & Electrolyte Salts', category: 'Medical', done: true },
    { id: 4, text: 'Fully Charged Mobile Phone & 10000mAh Powerbank', category: 'Comms', done: true },
    { id: 5, text: 'Emergency High-Decibel Whistle & Flashlight', category: 'Safety', done: false }
  ]);

  // Multi-Channel Notification Settings
  const [notifSettings, setNotifSettings] = useState<NotificationSetting>({
    inApp: true,
    push: true,
    sms: true,
    callIvr: true,
    quietHours: false,
    criticalBypass: true
  });

  // -------------------------------------------------------------
  // 1. Acoustic Search Beacon (Native Web Audio 880Hz Sonar Pulses)
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
  // 2. Optical SOS Morse Strobe (··· --- ···)
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
  // 3. Polling for Live SOS Status Updates & Weather Telemetry
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

      // 2. Real Weather Telemetry
      const weatherRes = await fetch('/api/live-data', { cache: 'no-store' });
      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        if (wData.zones && wData.zones.length > 0) {
          const phx = wData.zones[0];
          if (phx.temperatureF !== null) {
            setLiveTemp(phx.temperatureF);
            setLiveFeelsLike(Math.round((phx.temperatureF + (phx.humidityPct > 40 ? 4.2 : 2.1)) * 10) / 10);
          }
          if (phx.humidityPct !== null) setLiveHumidity(phx.humidityPct);
          if (phx.airQualityAqi !== null) setLiveAqi(phx.airQualityAqi);
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

  // Real GPS acquisition on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus(`GPS Active (${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°W)`);
        },
        () => {
          setGpsStatus('Phoenix Downtown Core (Ward 4 - Sky Harbor Sensor)');
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(countdownSeconds / 3600);
  const minutes = Math.floor((countdownSeconds % 3600) / 60);
  const seconds = countdownSeconds % 60;
  const formattedCountdown = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // -------------------------------------------------------------
  // 4. Dynamic Location Search & Open-Meteo Fetch
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
          setGpsStatus(`Coordinates: ${newLat.toFixed(4)}°, ${newLng.toFixed(4)}°`);

          // Fetch Live Open-Meteo for Searched City
          const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${newLat}&longitude=${newLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`);
          if (wRes.ok) {
            const wData = await wRes.json();
            if (wData.current) {
              setLiveTemp(Math.round(wData.current.temperature_2m * 10) / 10);
              setLiveFeelsLike(Math.round((wData.current.apparent_temperature || wData.current.temperature_2m) * 10) / 10);
              setLiveHumidity(Math.round(wData.current.relative_humidity_2m));
              setLiveWindSpeed(Math.round(wData.current.wind_speed_10m * 10) / 10);
              setLivePressure(Math.round(wData.current.surface_pressure * 10) / 10);
              setWeatherCondition(wData.current.weather_code >= 95 ? 'Severe Thunderstorm' : wData.current.weather_code >= 60 ? 'Active Rain' : 'Partly Cloudy');
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
  // 5. Send SOS Distress Beacon
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
  // 6. Safe Check-in
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
  // 7. Dispatch Rescue Team (In Officer Triage Mode)
  // -------------------------------------------------------------
  const handleOfficerDispatch = async (pingId: string) => {
    try {
      const res = await fetch('/api/citizen-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DISPATCH_RESCUE',
          pingId,
          assignedUnit: 'EMS Paramedic Rapid Unit #04',
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
  // 8. Audio Voice Alert (Web Speech API)
  // -------------------------------------------------------------
  const toggleAudioAlert = () => {
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
    } else {
      const text = language === 'EN' 
        ? `Emergency Weather Broadcast. High heat and multi-hazard warning in effect for ${locationName}. Live temperature is ${liveTemp} degrees Fahrenheit. Please pre-cool living spaces, locate cooling hubs at Burton Barr Library, and keep hydration supplies ready. Free transit passes are active.`
        : `Transmisión de Emergencia Climática. Advertencia de riesgo y calor extremo para ${locationName}. La temperatura actual es de ${((liveTemp - 32) * 5 / 9).toFixed(1)} grados Celsius. Por favor utilice los centros de enfriamiento municipales. El transporte público es gratuito.`;
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'EN' ? 'en-US' : 'es-MX';
      utterance.rate = 0.95;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis?.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  const completedKitCount = evacKit.filter(i => i.done).length;
  const kitPercentage = Math.round((completedKitCount / evacKit.length) * 100);

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#263238] font-sans antialiased selection:bg-[#0f766e] selection:text-white flex justify-center pb-16 relative">
      
      {/* Visual Strobe Overlay for Night Signaling */}
      <div 
        id="strobe-overlay" 
        className="fixed inset-0 bg-white z-[999] pointer-events-none transition-opacity duration-75 opacity-0"
      />

      {/* Mobile Frame Container */}
      <div className="w-full max-w-md bg-[#FFFDF8] border-x border-[#DDD5C7] min-h-screen shadow-2xl flex flex-col relative">
        
        {/* Top Header & Navigation */}
        <header className="sticky top-0 z-40 bg-[#E5CDC6] border-b border-[#C3988E] px-3.5 py-2 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Link 
              href="/"
              className="w-8 h-8 rounded-full bg-[#FFFDF8] border border-[#C3988E] flex items-center justify-center text-[#263238] hover:bg-[#FAF8F2] transition-colors shadow-xs shrink-0"
              title="Return to City EOC Commander Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-[#0f766e]" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#be123c] font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#dc2626] inline-block animate-ping" />
                <span>CITIZEN LIFELINE &bull; {isOfficerMode ? 'OFFICER TRIAGE' : 'LIVE SYNC'}</span>
              </div>
              <h1 className="text-xs font-bold text-[#263238] font-mono leading-tight">
                CivicPulse Handset
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Officer Switcher */}
            <button
              onClick={() => {
                setIsOfficerMode(!isOfficerMode);
                if (!isOfficerMode) setActiveTab('OFFICER');
                else setActiveTab('WEATHER');
              }}
              className={`text-[9px] font-mono font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer shadow-xs ${
                isOfficerMode 
                  ? 'bg-[#991B1B] text-white border-[#7F1D1D] animate-pulse' 
                  : 'bg-[#FFFDF8] text-[#0f766e] border-[#C3988E] hover:bg-[#FAF8F2]'
              }`}
              title="Toggle Officer Triage / Citizen Mode"
            >
              {isOfficerMode ? '🚨 Officer Mode' : '👤 Citizen'}
            </button>

            {/* Language */}
            <button
              onClick={() => setLanguage(l => l === 'EN' ? 'ES' : 'EN')}
              className="text-[9px] font-mono font-bold bg-[#FFFDF8] border border-[#C3988E] px-1.5 py-1 rounded-lg text-[#0f766e] hover:bg-[#FAF8F2] cursor-pointer shadow-xs"
            >
              {language === 'EN' ? '🇺🇸 EN' : '🇲🇽 ES'}
            </button>

            {/* Satellite Modal Launcher */}
            <button
              onClick={() => setIsSatelliteModalOpen(true)}
              className="p-1 rounded-lg bg-[#FFFDF8] border border-[#C3988E] text-[#0f766e] hover:bg-[#FAF8F2] cursor-pointer shadow-xs"
              title="Open Satellite-Direct EWMS Telemetry"
            >
              <Satellite className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Global Search & Location Bar */}
        <div className="bg-[#FAF8F2] border-b border-[#DDD5C7] px-3.5 py-2 space-y-1.5 font-mono">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 flex items-center">
              <Search className="w-3.5 h-3.5 text-[#6B6F6B] absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch(searchQuery)}
                placeholder="Search city, district, or sector..."
                className="w-full bg-[#FFFDF8] border border-[#DDD5C7] rounded-xl pl-8 pr-2 py-1 text-xs outline-none focus:border-[#0f766e] text-[#263238]"
              />
            </div>
            <button
              onClick={() => handleLocationSearch(searchQuery)}
              disabled={isSearchingLocation}
              className="bg-[#0f766e] hover:bg-[#0d9488] text-white px-2.5 py-1 rounded-xl text-[10px] font-bold cursor-pointer"
            >
              {isSearchingLocation ? '...' : 'Search'}
            </button>
            <button
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setGpsStatus(`GPS Active (${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}°)`);
                    handleLocationSearch(`${pos.coords.latitude}, ${pos.coords.longitude}`);
                  });
                }
              }}
              className="p-1 bg-[#FFFDF8] border border-[#DDD5C7] rounded-xl text-[#0f766e] hover:bg-[#FAF8F2] cursor-pointer"
              title="Detect Device GPS"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[9.5px] text-[#6B6F6B]">
            <span className="flex items-center gap-1 font-bold text-[#263238] truncate max-w-[240px]">
              <MapPin className="w-3 h-3 text-[#dc2626] shrink-0" />
              <span className="truncate">{locationName}</span>
            </span>
            <span className="text-[#0f766e] font-semibold">{gpsStatus}</span>
          </div>
        </div>

        {/* 3-Page Navigation Bar */}
        <nav className="bg-[#D8B6AD] border-b border-[#C3988E] px-2 py-1.5 flex items-center justify-around text-xs font-mono font-bold shadow-xs">
          <button
            onClick={() => setActiveTab('WEATHER')}
            className={`flex-1 py-1.5 px-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer text-[11px] ${
              activeTab === 'WEATHER'
                ? 'bg-[#FFFDF8] text-[#0f766e] border border-[#C3988E] shadow-sm font-extrabold'
                : 'text-[#4A3E3B] hover:text-[#263238]'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-[#0d9488]" />
            <span>1. Weather</span>
          </button>

          <button
            onClick={() => setActiveTab('SOS')}
            className={`flex-1 py-1.5 px-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer text-[11px] ${
              activeTab === 'SOS'
                ? 'bg-[#DC2626] text-white border border-[#991B1B] shadow-sm font-extrabold'
                : 'text-[#881337] hover:text-[#be123c]'
            }`}
          >
            <Siren className="w-3.5 h-3.5 text-current animate-pulse" />
            <span>2. SOS Rescue</span>
            {activeSOSBeacon && activeSOSBeacon.status !== 'RESOLVED' && (
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('EVACUATION')}
            className={`flex-1 py-1.5 px-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer text-[11px] ${
              activeTab === 'EVACUATION'
                ? 'bg-[#FFFDF8] text-[#0369a1] border border-[#C3988E] shadow-sm font-extrabold'
                : 'text-[#4A3E3B] hover:text-[#263238]'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>3. Evac & Kit</span>
          </button>

          {isOfficerMode && (
            <button
              onClick={() => setActiveTab('OFFICER')}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer text-[11px] ${
                activeTab === 'OFFICER'
                  ? 'bg-[#991B1B] text-white border border-[#7F1D1D] shadow-sm font-extrabold'
                  : 'text-[#991B1B]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Triage</span>
            </button>
          )}
        </nav>

        {/* ========================================================================= */}
        {/* PAGE 1: WEATHER HUB & MULTI-HAZARD NOWCAST                                */}
        {/* ========================================================================= */}
        {activeTab === 'WEATHER' && (
          <main className="p-3.5 space-y-3.5 flex-1 overflow-y-auto">
            
            {/* Live Atmospheric Conditions Card */}
            <div className="bg-gradient-to-br from-[#FFFDF8] to-[#FAF8F2] border border-[#DDD5C7] rounded-3xl p-4 shadow-md space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-[#0f766e] font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{locationName.split(',')[0]}</span>
                  </div>
                  <div className="text-3xl font-extrabold text-[#263238] font-mono tracking-tight mt-1">
                    {liveTemp.toFixed(1)}°F
                    <span className="text-sm font-normal text-[#6B6F6B] ml-2">
                      ({((liveTemp - 32) * 5 / 9).toFixed(1)}°C)
                    </span>
                  </div>
                  <div className="text-xs text-[#dc2626] font-bold font-mono mt-0.5">
                    Feels Like: {liveFeelsLike.toFixed(1)}°F &bull; {weatherCondition}
                  </div>
                </div>

                <div className="text-right">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 shadow-sm ml-auto">
                    <Sun className="w-7 h-7 animate-spin-slow" />
                  </div>
                  <span className="text-[10px] font-mono text-[#6B6F6B] block mt-1">Live Telemetry</span>
                </div>
              </div>

              {/* 4 Environmental Vitals */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#EEE8DC] font-mono text-center">
                <div className="bg-[#FFFDF8] p-2 rounded-xl border border-[#EEE8DC]">
                  <div className="text-[8px] text-[#6B6F6B] uppercase font-bold">Humidity</div>
                  <div className="text-xs font-bold text-[#0f766e] flex items-center justify-center gap-0.5 mt-0.5">
                    <Droplets className="w-3 h-3 text-[#0d9488]" />
                    <span>{liveHumidity}%</span>
                  </div>
                </div>

                <div className="bg-[#FFFDF8] p-2 rounded-xl border border-[#EEE8DC]">
                  <div className="text-[8px] text-[#6B6F6B] uppercase font-bold">Air Quality</div>
                  <div className="text-xs font-bold text-amber-600 flex items-center justify-center gap-0.5 mt-0.5">
                    <Wind className="w-3 h-3 text-amber-500" />
                    <span>{liveAqi} AQI</span>
                  </div>
                </div>

                <div className="bg-[#FFFDF8] p-2 rounded-xl border border-[#EEE8DC]">
                  <div className="text-[8px] text-[#6B6F6B] uppercase font-bold">Pressure</div>
                  <div className="text-xs font-bold text-[#0369a1] flex items-center justify-center gap-0.5 mt-0.5">
                    <span>{livePressure}</span>
                  </div>
                </div>

                <div className="bg-[#FFFDF8] p-2 rounded-xl border border-[#EEE8DC]">
                  <div className="text-[8px] text-[#6B6F6B] uppercase font-bold">Wind</div>
                  <div className="text-xs font-bold text-[#263238] flex items-center justify-center gap-0.5 mt-0.5">
                    <span>{liveWindSpeed} mph</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Tools Bar (XAI Diagnostics & Satellite EWMS) */}
            <div className="grid grid-cols-2 gap-2 font-mono">
              <button
                onClick={() => setIsXaiModalOpen(true)}
                className="bg-[#FFFDF8] border border-[#DDD5C7] hover:border-[#0f766e] p-2.5 rounded-2xl flex items-center gap-2 shadow-xs transition-all cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#263238]">🧠 XAI Diagnostics</div>
                  <div className="text-[8.5px] text-[#6B6F6B]">Transformer MTL Head</div>
                </div>
              </button>

              <button
                onClick={() => setIsSatelliteModalOpen(true)}
                className="bg-[#FFFDF8] border border-[#DDD5C7] hover:border-[#0284c7] p-2.5 rounded-2xl flex items-center gap-2 shadow-xs transition-all cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                  <Satellite className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#263238]">🛰️ Satellite EWMS</div>
                  <div className="text-[8.5px] text-[#6B6F6B]">Zero-Telecom Downlink</div>
                </div>
              </button>
            </div>

            {/* Official WEA Emergency Alert Card with Audio Siren */}
            <div className="bg-[#FFF1F2] border-2 border-[#dc2626] rounded-2xl p-4 shadow-md space-y-2.5 relative overflow-hidden">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#dc2626] flex items-center justify-center text-white shrink-0 shadow-sm">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-extrabold uppercase tracking-wider text-[#be123c] block">
                      {language === 'EN' ? 'OFFICIAL NWS EMERGENCY BROADCAST' : 'ALERTA OFICIAL DE EMERGENCIA'}
                    </span>
                    <h2 className="text-sm font-bold text-[#263238] leading-tight font-mono">
                      {language === 'EN' ? 'Multi-Hazard Risk & Grid Precaution' : 'Ola de Calor Extremo y Sobrecarga'}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={toggleAudioAlert}
                  className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    isPlayingAudio 
                      ? 'bg-[#dc2626] text-white border-[#dc2626] animate-pulse' 
                      : 'bg-[#FFFDF8] text-[#be123c] border-[#FECDD3] hover:bg-[#FFE4E6]'
                  }`}
                  title={isPlayingAudio ? 'Mute Alert Audio' : 'Play Audio Siren & Broadcast'}
                >
                  {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-xs text-[#263238] font-sans leading-relaxed">
                {language === 'EN' 
                  ? 'NOAA HRRR spatiotemporal models project peak surge at 2:30 PM. Free municipal transit passes to verified cooling shelters are active.' 
                  : 'Modelos de NOAA proyectan impacto térmico a las 2:30 PM. El transporte a centros de enfriamiento es gratuito.'}
              </p>

              {/* Pre-Hazard Countdown */}
              <div className="bg-[#FFFDF8] p-2.5 rounded-xl border border-[#FECDD3] flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-1.5 text-[#be123c] font-bold">
                  <Clock className="w-4 h-4 text-[#dc2626]" />
                  <span>COUNTDOWN TO PEAK:</span>
                </div>
                <div className="text-base font-extrabold text-[#dc2626] tracking-wider">
                  {formattedCountdown}
                </div>
              </div>
            </div>

            {/* Dynamic AI Precaution Engine Cards */}
            <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-2xl p-3.5 shadow-sm space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between text-[#0f766e] font-bold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#0d9488]" />
                  <span>AI DYNAMIC PRECAUTION ENGINE</span>
                </span>
                <span className="text-[9px] text-[#6B6F6B]">Contextual Live</span>
              </div>

              <div className="space-y-2 font-sans">
                <div className="p-2.5 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-[#991B1B]">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-[#dc2626]" />
                      <span>Extreme Thermal & Dehydration Advisory</span>
                    </span>
                    <span className="text-[9px] font-mono bg-[#FEE2E2] px-1.5 py-0.5 rounded text-[#dc2626]">Priority</span>
                  </div>
                  <p className="text-[11px] text-[#263238]">
                    <strong>Reason:</strong> High ambient heat index of {liveFeelsLike}°F.
                  </p>
                  <p className="text-[11px] text-[#263238]">
                    <strong>Required Action:</strong> Pre-cool living spaces to 70°F before 1 PM and hydrate with electrolytic fluids.
                  </p>
                </div>

                <div className="p-2.5 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-[#92400E]">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-[#d97706]" />
                      <span>Grid Load & Power Backup Rule</span>
                    </span>
                    <span className="text-[9px] font-mono bg-[#FEF9C3] px-1.5 py-0.5 rounded text-[#b45309]">Advisory</span>
                  </div>
                  <p className="text-[11px] text-[#263238]">
                    <strong>Action:</strong> Keep mobile handsets and auxiliary powerbanks at 100% capacity to utilize zero-telecom beacons if local transformers trip.
                  </p>
                </div>
              </div>
            </div>

            {/* 12-Hour Hourly Forecast Timeline */}
            <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-2xl p-3.5 shadow-sm space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs font-bold text-[#0f766e]">
                <span>12-HOUR HOURLY TEMPERATURE PROFILE</span>
                <span className="text-[9px] text-[#6B6F6B]">Peak at 2:30 PM</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 text-center scrollbar-thin">
                {[
                  { time: '10 AM', temp: Math.round(liveTemp - 4), condition: 'Sunny', heatRisk: 'Moderate' },
                  { time: '12 PM', temp: Math.round(liveTemp + 2), condition: 'High Solar', heatRisk: 'High' },
                  { time: '2 PM', temp: Math.round(liveTemp + 8), condition: 'Peak Surge', heatRisk: 'Extreme' },
                  { time: '4 PM', temp: Math.round(liveTemp + 6), condition: 'Severe Heat', heatRisk: 'Extreme' },
                  { time: '6 PM', temp: Math.round(liveTemp + 1), condition: 'Warm Breeze', heatRisk: 'High' },
                  { time: '8 PM', temp: Math.round(liveTemp - 5), condition: 'Night Cooling', heatRisk: 'Moderate' },
                ].map((h, i) => (
                  <div key={i} className="min-w-[64px] bg-[#FAF8F2] border border-[#EEE8DC] p-2 rounded-xl flex flex-col items-center">
                    <span className="text-[9px] text-[#6B6F6B] font-bold">{h.time}</span>
                    <Sun className={`w-4 h-4 my-1 ${h.temp >= 90 ? 'text-[#dc2626]' : 'text-amber-500'}`} />
                    <span className="text-xs font-bold text-[#263238]">{h.temp}°</span>
                    <span className={`text-[7.5px] px-1 py-0.2 rounded font-bold mt-1 ${
                      h.heatRisk === 'Extreme' ? 'bg-[#FEE2E2] text-[#dc2626]' : h.heatRisk === 'High' ? 'bg-[#FFEDD5] text-[#c2410c]' : 'bg-[#FEF3C7] text-[#b45309]'
                    }`}>
                      {h.heatRisk}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </main>
        )}

        {/* ========================================================================= */}
        {/* PAGE 2: SOS DISTRESS, SEARCH BEACONS & LIVE RESCUE                        */}
        {/* ========================================================================= */}
        {activeTab === 'SOS' && (
          <main className="p-3.5 space-y-3.5 flex-1 overflow-y-auto">
            
            {/* Active SOS Rescue Status Banner (If Triggered) */}
            {activeSOSBeacon && activeSOSBeacon.status !== 'RESOLVED' ? (
              <div className="bg-[#FFF1F2] border-2 border-[#dc2626] rounded-3xl p-4 shadow-xl space-y-3.5 font-mono">
                <div className="flex items-center justify-between border-b border-[#FECDD3] pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#dc2626] text-white flex items-center justify-center animate-ping">
                      <Siren className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[9px] text-[#dc2626] font-extrabold uppercase">EMERGENCY BEACON ACTIVE</span>
                      <h3 className="text-xs font-bold text-[#263238]">{activeSOSBeacon.categoryName}</h3>
                    </div>
                  </div>
                  <span className="text-[9px] bg-[#dc2626] text-white px-2 py-0.5 rounded-full font-bold">
                    {activeSOSBeacon.status === 'DISPATCHED' ? 'RESCUE EN ROUTE' : 'PENDING TRIAGE'}
                  </span>
                </div>

                {/* 3-Stage Progress Bar */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>1. Beacon Transmitted to City EOC</span>
                    <span className="text-[9px] text-[#6B6F6B] ml-auto">{activeSOSBeacon.timeFormatted}</span>
                  </div>

                  <div className={`flex items-center gap-2 font-bold ${
                    activeSOSBeacon.status === 'DISPATCHED' ? 'text-emerald-700' : 'text-amber-700 animate-pulse'
                  }`}>
                    {activeSOSBeacon.status === 'DISPATCHED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Radio className="w-4 h-4 text-amber-600 animate-spin" />
                    )}
                    <span>2. EOC Command Dispatch Locked</span>
                    <span className="text-[9px] text-[#6B6F6B] ml-auto">GPS Verified</span>
                  </div>

                  <div className={`flex items-center gap-2 font-bold p-2.5 rounded-xl border ${
                    activeSOSBeacon.status === 'DISPATCHED'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-[#FFFDF8] border-[#FECDD3] text-[#6B6F6B]'
                  }`}>
                    <Siren className={`w-4 h-4 ${activeSOSBeacon.status === 'DISPATCHED' ? 'text-emerald-600 animate-bounce' : 'text-[#6B6F6B]'}`} />
                    <div>
                      <div>3. Rescue Unit Dispatched!</div>
                      {activeSOSBeacon.assignedUnit && (
                        <div className="text-[10px] text-emerald-700 font-normal">
                          Assigned: <strong>{activeSOSBeacon.assignedUnit}</strong> (ETA ~{activeSOSBeacon.etaMinutes || 5} min)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tactical Search Beacons While Waiting */}
                <div className="pt-2 border-t border-[#FECDD3] space-y-2">
                  <span className="text-[10px] text-[#be123c] font-bold block">ACTIVATE ON-SITE SEARCH BEACONS:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={toggleAcousticBeacon}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        acousticActive
                          ? 'bg-[#dc2626] text-white border-[#991B1B] animate-pulse shadow-md'
                          : 'bg-[#FFFDF8] border-[#FECDD3] text-[#be123c] hover:bg-[#FFE4E6]'
                      }`}
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{acousticActive ? 'Sonar Active (880Hz)' : 'Acoustic Sonar'}</span>
                    </button>

                    <button
                      onClick={() => setStrobeActive(!strobeActive)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        strobeActive
                          ? 'bg-amber-500 text-white border-amber-600 animate-pulse shadow-md'
                          : 'bg-[#FFFDF8] border-[#FECDD3] text-amber-700 hover:bg-[#FEF3C7]'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      <span>{strobeActive ? 'Strobe Active (SOS)' : 'Morse Strobe'}</span>
                    </button>
                  </div>
                </div>

                {/* Direct Cancel / Safe Button */}
                <button
                  onClick={() => setActiveSOSBeacon(null)}
                  className="w-full bg-[#FFFDF8] hover:bg-[#FAF8F2] border border-[#DDD5C7] text-[#6B6F6B] py-2 rounded-xl font-bold text-xs cursor-pointer"
                >
                  I Am Now Safe / Cancel Distress Beacon
                </button>
              </div>
            ) : (
              /* High-Contrast One-Tap SOS Distress Trigger */
              <div className="space-y-3.5">
                
                {/* Main SOS Trigger Card */}
                <div className="bg-gradient-to-b from-[#FFF1F2] to-[#FFFDF8] border-2 border-[#dc2626] rounded-3xl p-5 text-center space-y-3 shadow-xl relative overflow-hidden font-mono">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-[#be123c] block">
                      EMERGENCY DISASTER RESCUE NETWORK
                    </span>
                    <h2 className="text-lg font-extrabold text-[#263238]">
                      SOS Distress Beacon
                    </h2>
                    <p className="text-[11px] text-[#6B6F6B] font-sans">
                      Transmits high-priority coordinates and family triage parameters to City EOC command desks.
                    </p>
                  </div>

                  {/* Huge Pitch-Red SOS Button */}
                  <div className="py-1 flex justify-center">
                    <button
                      onClick={handleTriggerSOS}
                      disabled={isSendingSOS}
                      className="w-36 h-36 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] active:scale-95 text-white font-mono font-black text-xl tracking-widest flex flex-col items-center justify-center shadow-2xl transition-all cursor-pointer border-4 border-[#991B1B] hover:border-white"
                      title="Tap to trigger immediate EOC Rescue Dispatch"
                    >
                      <Siren className="w-8 h-8 mb-1 animate-bounce" />
                      <span>SOS</span>
                      <span className="text-[8.5px] font-normal tracking-normal opacity-90">SEND RESCUE</span>
                    </button>
                  </div>

                  {/* Geolocation Status */}
                  <div className="bg-[#FFFDF8] p-2 rounded-xl border border-[#FECDD3] text-[9.5px] text-[#263238] flex items-center justify-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#dc2626] shrink-0" />
                    <span className="font-bold truncate">{locationName}</span>
                  </div>
                </div>

                {/* 4 Emergency Categories Selector */}
                <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-2xl p-3.5 shadow-sm space-y-2.5 font-mono">
                  <div className="flex items-center justify-between text-xs font-bold text-[#263238]">
                    <span>SELECT DISTRESS REASON:</span>
                    <span className="text-[9px] text-[#0f766e]">Prioritizes Triage</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => setSelectedSOSCategory('HEAT_STROKE')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                        selectedSOSCategory === 'HEAT_STROKE'
                          ? 'bg-[#FEE2E2] border-[#dc2626] text-[#991B1B] font-bold shadow-sm'
                          : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#6B6F6B]'
                      }`}
                    >
                      <span className="text-base">🌡️</span>
                      <span className="font-bold text-[10.5px]">Heat Stroke</span>
                      <span className="text-[8px] opacity-80">Dehydration & Dizziness</span>
                    </button>

                    <button
                      onClick={() => setSelectedSOSCategory('POWER_FAILURE')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                        selectedSOSCategory === 'POWER_FAILURE'
                          ? 'bg-[#FEF3C7] border-[#d97706] text-[#b45309] font-bold shadow-sm'
                          : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#6B6F6B]'
                      }`}
                    >
                      <span className="text-base">⚡</span>
                      <span className="font-bold text-[10.5px]">Power / AC Outage</span>
                      <span className="text-[8px] opacity-80">Oxygen / Meds at Risk</span>
                    </button>

                    <button
                      onClick={() => setSelectedSOSCategory('FLOOD_TRAP')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                        selectedSOSCategory === 'FLOOD_TRAP'
                          ? 'bg-[#E0F2FE] border-[#0284c7] text-[#0369a1] font-bold shadow-sm'
                          : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#6B6F6B]'
                      }`}
                    >
                      <span className="text-base">🌊</span>
                      <span className="font-bold text-[10.5px]">Flash Flood / Trap</span>
                      <span className="text-[8px] opacity-80">Ground Floor Cutoff</span>
                    </button>

                    <button
                      onClick={() => setSelectedSOSCategory('MEDICAL_SOS')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                        selectedSOSCategory === 'MEDICAL_SOS'
                          ? 'bg-[#F3E8FF] border-[#9333ea] text-[#7e22ce] font-bold shadow-sm'
                          : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#6B6F6B]'
                      }`}
                    >
                      <span className="text-base">🚑</span>
                      <span className="font-bold text-[10.5px]">Senior Medical</span>
                      <span className="text-[8px] opacity-80">Paramedic Immediate</span>
                    </button>
                  </div>

                  {/* Triage Modifiers (People Count, Medical Flags) */}
                  <div className="pt-2 border-t border-[#EEE8DC] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#6B6F6B] font-bold">Persons in Danger:</span>
                      <div className="flex items-center gap-2">
                        {[1, 2, 4, '5+'].map((cnt, i) => (
                          <button
                            key={i}
                            onClick={() => setPeopleCount(typeof cnt === 'number' ? cnt : 5)}
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                              (typeof cnt === 'number' && peopleCount === cnt) || (cnt === '5+' && peopleCount >= 5)
                                ? 'bg-[#0f766e] text-white border-[#0f766e]'
                                : 'bg-[#FAF8F2] text-[#6B6F6B] border-[#DDD5C7]'
                            }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[9px]">
                      <button
                        onClick={() => setHasInfant(!hasInfant)}
                        className={`p-1.5 rounded-lg border font-bold cursor-pointer text-center ${
                          hasInfant ? 'bg-[#FEE2E2] text-[#991B1B] border-[#dc2626]' : 'bg-[#FAF8F2] text-[#6B6F6B] border-[#DDD5C7]'
                        }`}
                      >
                        👶 Infant Present
                      </button>
                      <button
                        onClick={() => setHasElderly(!hasElderly)}
                        className={`p-1.5 rounded-lg border font-bold cursor-pointer text-center ${
                          hasElderly ? 'bg-[#FEF3C7] text-[#92400E] border-[#d97706]' : 'bg-[#FAF8F2] text-[#6B6F6B] border-[#DDD5C7]'
                        }`}
                      >
                        👴 Senior Citizen
                      </button>
                      <button
                        onClick={() => setHasMedicalOxygen(!hasMedicalOxygen)}
                        className={`p-1.5 rounded-lg border font-bold cursor-pointer text-center ${
                          hasMedicalOxygen ? 'bg-[#E0F2FE] text-[#0369a1] border-[#0284c7]' : 'bg-[#FAF8F2] text-[#6B6F6B] border-[#DDD5C7]'
                        }`}
                      >
                        🫁 Oxygen Support
                      </button>
                    </div>

                    {/* Optional Notes */}
                    <input
                      type="text"
                      value={sosNotes}
                      onChange={(e) => setSosNotes(e.target.value)}
                      placeholder="Optional notes (e.g. Apt 3B, senior needing wheelchair)..."
                      className="w-full bg-[#FAF8F2] border border-[#DDD5C7] rounded-xl px-3 py-1.5 text-xs font-sans outline-none focus:border-[#0f766e]"
                    />
                  </div>
                </div>

                {/* Acoustic Sonar & Strobe Tools */}
                <div className="bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl p-3 shadow-xs space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between font-bold text-[#0f766e]">
                    <span>SEARCH & RESCUE AUDIBLE BEACONS</span>
                    <span className="text-[9px] text-[#6B6F6B]">Zero-Signal Tools</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={toggleAcousticBeacon}
                      className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        acousticActive
                          ? 'bg-[#dc2626] text-white border-[#991B1B] animate-pulse shadow-md'
                          : 'bg-[#FFFDF8] border-[#DDD5C7] text-[#263238] hover:bg-[#FAF8F2]'
                      }`}
                    >
                      <Volume2 className="w-4 h-4 text-[#dc2626]" />
                      <span>{acousticActive ? 'Sonar Active' : 'Acoustic (880Hz)'}</span>
                    </button>

                    <button
                      onClick={() => setStrobeActive(!strobeActive)}
                      className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        strobeActive
                          ? 'bg-amber-500 text-white border-amber-600 animate-pulse shadow-md'
                          : 'bg-[#FFFDF8] border-[#DDD5C7] text-[#263238] hover:bg-[#FAF8F2]'
                      }`}
                    >
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>{strobeActive ? 'Strobe Active' : 'Morse Strobe'}</span>
                    </button>
                  </div>
                </div>

                {/* Family Safety Network */}
                <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-2xl p-3.5 shadow-sm space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between font-bold text-[#0f766e]">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-[#0d9488]" />
                      <span>FAMILY WELFARE & SAFETY NETWORK</span>
                    </span>
                    <span className="text-[9px] text-[#6B6F6B]">{verifiedSafeCount} Safe in City</span>
                  </div>

                  <div className="space-y-1.5">
                    {familyMembers.map((m, i) => (
                      <div key={i} className="p-2 bg-[#FAF8F2] border border-[#EEE8DC] rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-bold text-[#263238]">{m.name}</div>
                          <div className="text-[9.5px] text-[#6B6F6B]">{m.location} &bull; Bat {m.battery}</div>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleCheckInSafe}
                      disabled={isSafeCheckedIn}
                      className="flex-1 bg-[#0f766e] hover:bg-[#0d9488] text-white py-2 rounded-xl font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <HeartHandshake className="w-4 h-4" />
                      <span>{isSafeCheckedIn ? '✓ You Are Verified Safe' : 'Confirm I Am Safe'}</span>
                    </button>

                    <button
                      onClick={() => {
                        const text = `🚨 CivicPulse Alert: I am safe at ${locationName}. Battery: 88%. Verified on Municipal Disaster Lifeline.`;
                        if (navigator.share) {
                          navigator.share({ title: 'Safety Check-in', text });
                        } else {
                          navigator.clipboard.writeText(text);
                          alert('Safety status copied to clipboard!');
                        }
                      }}
                      className="p-2 bg-[#FFFDF8] border border-[#DDD5C7] rounded-xl text-[#0f766e] hover:bg-[#FAF8F2] cursor-pointer"
                      title="Share Safe Status with Family via WhatsApp/SMS"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Direct Calling Hotline Shortcuts */}
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <a
                    href="tel:911"
                    className="bg-[#DC2626] hover:bg-[#B91C1C] text-white p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Call 911 Emergency</span>
                  </a>

                  <a
                    href="tel:311"
                    className="bg-[#0f766e] hover:bg-[#0d9488] text-white p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Call 311 City Triage</span>
                  </a>
                </div>

              </div>
            )}

          </main>
        )}

        {/* ========================================================================= */}
        {/* PAGE 3: EVACUATION ROUTES & EMERGENCY KIT                                 */}
        {/* ========================================================================= */}
        {activeTab === 'EVACUATION' && (
          <main className="p-3.5 space-y-3.5 flex-1 overflow-y-auto">
            
            {/* Evacuation Route Guide Card */}
            <div className="bg-gradient-to-br from-[#E0F2FE] to-[#FFFDF8] border-2 border-[#0284c7] rounded-3xl p-4 shadow-md space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-[#BAE6FD] pb-2">
                <span className="text-xs font-bold text-[#0369a1] flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-[#0284c7]" />
                  <span>DESIGNATED SAFE EVACUATION CORRIDOR</span>
                </span>
                <span className="text-[9px] bg-[#0284c7] text-white px-2 py-0.5 rounded-full font-bold">
                  ACTIVE ROUTE
                </span>
              </div>

              {/* Visual Corridor Breakdown */}
              <div className="space-y-2 text-xs font-sans">
                <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl flex items-start gap-2 text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold font-mono text-xs">PRIMARY SAFE ROUTE: North Central Shaded Corridor</div>
                    <div className="text-[11px] text-emerald-800 leading-tight mt-0.5">
                      Proceed North via 3rd Ave towards Burton Barr Library (0.4 mi). Fully shaded sidewalks, misting poles, and active cooling shuttles.
                    </div>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-300 p-2.5 rounded-xl flex items-start gap-2 text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold font-mono text-xs">HAZARD SECTOR TO AVOID: East Washington Street</div>
                    <div className="text-[11px] text-rose-800 leading-tight mt-0.5">
                      High thermal pavement (122°F surface temp) & substation grid surge. Avoid pedestrian travel east of 7th St.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#BAE6FD]">
                <span className="text-[#0369a1] font-bold">Free Transit Passes Active</span>
                <button
                  onClick={() => setIsTransitPassOpen(true)}
                  className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-3 py-1 rounded-xl font-bold flex items-center gap-1 shadow-sm text-xs cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Open Bus Pass</span>
                </button>
              </div>
            </div>

            {/* Emergency Evacuation Kit Checklist */}
            <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-2xl p-3.5 shadow-sm space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between font-bold text-[#0f766e]">
                <span>🎒 EMERGENCY EVACUATION KIT</span>
                <span className="text-[10px] text-[#263238] font-bold">{kitPercentage}% Ready ({completedKitCount}/{evacKit.length})</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#EEE8DC] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#0f766e] to-[#0d9488] h-full transition-all duration-300"
                  style={{ width: `${kitPercentage}%` }}
                />
              </div>

              <div className="space-y-1.5 pt-1">
                {evacKit.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setEvacKit(prev => prev.map(k => k.id === item.id ? { ...k, done: !k.done } : k))}
                    className="w-full p-2 bg-[#FAF8F2] border border-[#EEE8DC] rounded-xl flex items-center gap-2 text-left hover:border-[#0f766e] transition-colors cursor-pointer"
                  >
                    {item.done ? (
                      <CheckSquare className="w-4 h-4 text-[#0f766e] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-[#6B6F6B] shrink-0" />
                    )}
                    <span className={`text-[11px] font-sans flex-1 ${item.done ? 'text-[#263238] font-medium line-through opacity-70' : 'text-[#263238] font-semibold'}`}>
                      {item.text}
                    </span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#FFFDF8] text-[#6B6F6B] border border-[#DDD5C7] shrink-0">
                      {item.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Verified Safe Havens & Cooling Shelters */}
            <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-2xl p-3.5 shadow-sm space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-[#EEE8DC] pb-2">
                <span className="text-xs font-bold text-[#0f766e] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#0d9488]" />
                  <span>VERIFIED SAFE HAVENS & COOLING CENTERS</span>
                </span>
                <span className="text-[9px] text-[#6B6F6B]">3 Open</span>
              </div>

              <div className="space-y-2.5">
                {DEFAULT_SHELTERS.map((s) => (
                  <div 
                    key={s.id}
                    className="bg-[#FAF8F2] border border-[#DDD5C7] p-3 rounded-2xl space-y-2 hover:border-[#0d9488] transition-all"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-bold text-xs text-[#263238] font-sans">{s.name}</div>
                        <div className="text-[10px] text-[#6B6F6B]">{s.address}</div>
                      </div>
                      <span className="text-[9px] bg-[#E8F5EF] text-[#0f766e] border border-[#A7F3D0] px-2 py-0.5 rounded-full font-bold shrink-0">
                        {s.capacity}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[#EEE8DC]">
                      <span className="text-[#0369a1] font-semibold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#0284c7]" />
                        <span>{s.distance} ({s.walkTime})</span>
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + s.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0f766e] text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-[#0d9488] transition-colors text-[9.5px]"
                      >
                        <span>Navigate</span>
                        <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {s.amenities.map((a, i) => (
                        <span key={i} className="text-[8px] bg-[#FFFDF8] text-[#6B6F6B] border border-[#DDD5C7] px-1.5 py-0.5 rounded">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notification Delivery Preferences Modal Launcher */}
            <div className="pt-1">
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="w-full bg-[#FAF8F2] border border-[#DDD5C7] hover:border-[#0f766e] p-2.5 rounded-2xl flex items-center justify-between font-mono text-xs text-[#263238] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#0f766e]" />
                  <span>Notification Preferences & Delivery Log</span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-[#6B6F6B]" />
              </button>
            </div>

          </main>
        )}

        {/* ========================================================================= */}
        {/* PAGE 4: OFFICER / RESPONDER TRIAGE DESK (WHEN TOGGLED)                    */}
        {/* ========================================================================= */}
        {activeTab === 'OFFICER' && (
          <main className="p-3.5 space-y-3.5 flex-1 overflow-y-auto font-mono text-xs">
            
            {/* Officer Header Card */}
            <div className="bg-[#991B1B] text-white rounded-2xl p-3.5 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-300" />
                  <span>RESPONDER INCIDENT COMMAND DESK</span>
                </span>
                <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded font-bold">LIVE QUEUE</span>
              </div>
              <p className="text-[11px] text-red-100 font-sans">
                Review citizen distress calls transmitted via mobile handsets, examine family triage requirements, and dispatch units.
              </p>
            </div>

            {/* Incoming Distress Queue */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#263238]">
                <span>ACTIVE CITIZEN INCIDENTS ({allRecentPings.filter(p => p.type !== 'SAFE').length})</span>
                <button onClick={pollSync} className="text-[#0f766e] flex items-center gap-1 cursor-pointer">
                  <RotateCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              {allRecentPings.filter(p => p.type !== 'SAFE').length === 0 ? (
                <div className="p-6 text-center bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl text-[#6B6F6B]">
                  No pending citizen SOS incidents in the queue.
                </div>
              ) : (
                allRecentPings.filter(p => p.type !== 'SAFE').map((ping) => (
                  <div 
                    key={ping.id}
                    className={`p-3 rounded-2xl border space-y-2 ${
                      ping.status === 'PENDING'
                        ? 'bg-[#FFF1F2] border-[#dc2626]'
                        : 'bg-[#FAF8F2] border-[#DDD5C7]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-[#263238] text-xs">{ping.categoryName}</div>
                        <div className="text-[10px] text-[#6B6F6B]">{ping.address} &bull; {ping.timeFormatted}</div>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        ping.status === 'PENDING' ? 'bg-[#dc2626] text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {ping.status}
                      </span>
                    </div>

                    <p className="text-[11px] font-sans text-[#263238] bg-white/60 p-2 rounded-xl border border-black/5">
                      “{ping.notes}”
                    </p>

                    {ping.status === 'PENDING' ? (
                      <button
                        onClick={() => handleOfficerDispatch(ping.id)}
                        className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white py-2 rounded-xl font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Siren className="w-3.5 h-3.5" />
                        <span>Dispatch Rapid Rescue Unit #04</span>
                      </button>
                    ) : (
                      <div className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Dispatched: {ping.assignedUnit} (ETA {ping.etaMinutes}m)</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

          </main>
        )}

        {/* Footer */}
        <footer className="p-3 text-center border-t border-[#DDD5C7] bg-[#FAF8F2] font-mono text-[9px] text-[#6B6F6B] space-y-0.5">
          <div>CIVICPULSE CITIZEN LIFELINE &bull; MUNICIPAL RESILIENCE PLATFORM</div>
          <div>Direct 2-Way Sync with NOAA NWS &bull; FEMA IPAWS WEA &bull; City EOC</div>
        </footer>

      </div>

      {/* ========================================================================= */}
      {/* 🧠 POPUP MODAL: EXPLAINABLE AI (XAI) MODEL DIAGNOSTICS                    */}
      {/* ========================================================================= */}
      {isXaiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FFFDF8] border-2 border-indigo-600 rounded-3xl max-w-md w-full p-4 sm:p-5 space-y-3.5 shadow-2xl font-mono text-[#263238] max-h-[90vh] overflow-y-auto scrollbar-thin">
            
            <div className="flex items-center justify-between border-b border-[#DDD5C7] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow">
                  🧠
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#263238]">Explainable AI (XAI) Model Diagnostics</h3>
                  <p className="text-[9px] text-[#6B6F6B]">Spatiotemporal Transformer (MTL) &bull; 2–6h Nowcast</p>
                </div>
              </div>
              <button 
                onClick={() => setIsXaiModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#FAF8F2] border border-[#DDD5C7] text-[#263238] font-bold text-sm flex items-center justify-center hover:bg-[#EEE8DC]"
              >
                &times;
              </button>
            </div>

            {/* NWP Latency Bypass Banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 space-y-1 text-xs text-indigo-950 font-sans">
              <div className="flex items-center justify-between font-bold font-mono text-[10.5px]">
                <span className="flex items-center gap-1.5 text-indigo-800">
                  <Zap className="w-4 h-4" />
                  <span>NWP Latency Bypass Engine</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900 text-[9px]">38ms Inference</span>
              </div>
              <p className="text-[11px] leading-relaxed text-indigo-900">
                Traditional physics-based NWP models require 6–12 hour simulation runs. CivicPulse deep learning transformers extract multivariate precursors in <b>38 milliseconds</b>, delivering actionable <b>2 to 6-hour lead time</b>.
              </p>
            </div>

            {/* 4 Atmospheric Core Pillars */}
            <div className="space-y-1.5">
              <h4 className="text-[9.5px] font-bold uppercase tracking-wider text-[#6B6F6B]">4 Atmospheric Predictive Pillars</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-[#FAF8F2] rounded-xl border border-[#DDD5C7]">
                  <span className="text-[8.5px] font-bold text-[#6B6F6B] uppercase block">💧 Fuel: IWV Moisture</span>
                  <span className="text-xs font-bold text-[#0f766e]">54.2 kg/m²</span>
                  <span className="text-[8px] text-emerald-700 block font-bold mt-0.5">+8.4 kg/m² / 2h</span>
                </div>
                <div className="p-2.5 bg-[#FAF8F2] rounded-xl border border-[#DDD5C7]">
                  <span className="text-[8.5px] font-bold text-[#6B6F6B] uppercase block">⚡ Energy: CAPE / CIN</span>
                  <span className="text-xs font-bold text-amber-700">2,450 J/kg</span>
                  <span className="text-[8px] text-[#6B6F6B] block mt-0.5">CIN Cap: 15 J/kg</span>
                </div>
                <div className="p-2.5 bg-[#FAF8F2] rounded-xl border border-[#DDD5C7]">
                  <span className="text-[8.5px] font-bold text-[#6B6F6B] uppercase block">🌪️ Lift: CTT Drop Rate</span>
                  <span className="text-xs font-bold text-purple-700">-14.2°C / 15m</span>
                  <span className="text-[8px] text-[#6B6F6B] block mt-0.5">Conv: 14.2 × 10⁻⁵</span>
                </div>
                <div className="p-2.5 bg-[#FAF8F2] rounded-xl border border-[#DDD5C7]">
                  <span className="text-[8.5px] font-bold text-[#6B6F6B] uppercase block">⛰️ Topography: CartoDEM</span>
                  <span className="text-xs font-bold text-emerald-800">28.4° Funnel</span>
                  <span className="text-[8px] text-[#6B6F6B] block mt-0.5">Soil Saturation: 86%</span>
                </div>
              </div>
            </div>

            {/* Multi-Task Learning Simultaneous Heads */}
            <div className="space-y-1.5">
              <h4 className="text-[9.5px] font-bold uppercase tracking-wider text-[#6B6F6B]">Simultaneous Multi-Task (MTL) Output Heads</h4>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-[8px] font-bold text-amber-800 uppercase block">⚡ Lightning</span>
                  <span className="text-sm font-bold text-amber-950">88%</span>
                </div>
                <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-[8px] font-bold text-rose-800 uppercase block">🌡️ Heat Surge</span>
                  <span className="text-sm font-bold text-rose-950">92%</span>
                </div>
                <div className="p-2 bg-blue-50 rounded-xl border border-blue-200">
                  <span className="text-[8px] font-bold text-blue-800 uppercase block">🌊 Flood Surge</span>
                  <span className="text-sm font-bold text-blue-950">79%</span>
                </div>
              </div>
            </div>

            {/* XAI Attribution Weights */}
            <div className="space-y-2 pt-1 font-sans">
              <h4 className="text-[9.5px] font-bold font-mono uppercase tracking-wider text-[#6B6F6B]">XAI Attribution Feature Weights</h4>
              {[
                { name: 'Integrated Water Vapor (IWV) Surge', weight: 36, trigger: 'Rapid moisture pool accumulation (+8.4 kg/m²)' },
                { name: 'Cloud Top Temp (CTT) Cooling Rate', weight: 26, trigger: 'Explosive vertical updraft (-14.2°C / 15min)' },
                { name: 'Atmospheric Instability (CAPE / CIN)', weight: 20, trigger: 'High convective buoyancy (2,450 J/kg)' },
                { name: 'CartoDEM Topographic Drainage Routing', weight: 18, trigger: 'Topographic funnel channeling runoff into lowlands' }
              ].map((x, i) => (
                <div key={i} className="p-2 bg-[#FAF8F2] border border-[#DDD5C7] rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-[11px] font-mono">
                    <span>{x.name}</span>
                    <span className="text-[#0f766e]">{x.weight}% Contribution</span>
                  </div>
                  <div className="w-full bg-[#EEE8DC] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-700 to-[#0f766e] h-full" style={{ width: `${x.weight * 2}%` }} />
                  </div>
                  <p className="text-[10px] text-[#6B6F6B] italic">“{x.trigger}”</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsXaiModalOpen(false)}
              className="w-full bg-indigo-700 hover:bg-indigo-800 text-white py-2.5 rounded-xl font-bold text-xs shadow cursor-pointer"
            >
              Close Model Diagnostics
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🛰️ POPUP MODAL: SATELLITE-DIRECT EWMS & ZERO-TELECOM GATEWAY              */}
      {/* ========================================================================= */}
      {isSatelliteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FFFDF8] border-2 border-sky-600 rounded-3xl max-w-md w-full p-4 sm:p-5 space-y-3.5 shadow-2xl font-mono text-[#263238] max-h-[90vh] overflow-y-auto scrollbar-thin">
            
            <div className="flex items-center justify-between border-b border-[#DDD5C7] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-700 text-white flex items-center justify-center font-bold text-sm shadow">
                  🛰️
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#263238]">Satellite-Direct EWMS Telemetry</h3>
                  <p className="text-[9px] text-[#6B6F6B]">Zero-Telecom Direct Satellite Downlink Gateway</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSatelliteModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#FAF8F2] border border-[#DDD5C7] text-[#263238] font-bold text-sm flex items-center justify-center hover:bg-[#EEE8DC]"
              >
                &times;
              </button>
            </div>

            {/* Constellation Health Status */}
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 space-y-2 text-xs font-sans text-sky-950">
              <div className="flex items-center justify-between font-bold font-mono text-[10.5px]">
                <span className="flex items-center gap-1.5 text-sky-800">
                  <Satellite className="w-4 h-4" />
                  <span>S-Band / L5 Constellation Health</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9px]">7/7 LOCKED</span>
              </div>
              <p className="text-[11px] leading-relaxed text-sky-900">
                Receives broadcast early warnings directly via satellite S-Band frequency (2492.028 MHz), bypassing cellular cell tower outages.
              </p>
            </div>

            {/* Satellite Constellation Locked Nodes */}
            <div className="space-y-1.5">
              <h4 className="text-[9.5px] font-bold uppercase tracking-wider text-[#6B6F6B]">Active Locked Downlinks</h4>
              <div className="space-y-1.5 text-xs font-mono">
                {[
                  { name: 'GEO-SAT-02', orbit: 'GEO 55.0°E', elev: '68°', snr: '45.2 dB', role: 'Primary EWMS Broadcast' },
                  { name: 'GEO-SAT-03', orbit: 'GEO 83.0°E', elev: '76°', snr: '47.8 dB', role: 'Telemetry Downlink' },
                  { name: 'GSO-SAT-06', orbit: 'GSO 32.5°E', elev: '48°', snr: '42.1 dB', role: 'Timing & Navigation' },
                  { name: 'GSO-SAT-09', orbit: 'GSO 55.0°E', elev: '58°', snr: '44.0 dB', role: 'Return Link Beacon' },
                ].map((sat, i) => (
                  <div key={i} className="p-2 bg-[#FAF8F2] border border-[#DDD5C7] rounded-xl flex items-center justify-between text-[10px]">
                    <div>
                      <div className="font-bold text-[#263238]">{sat.name} ({sat.orbit})</div>
                      <div className="text-[8.5px] text-[#6B6F6B]">{sat.role}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-700 font-bold">{sat.snr}</span>
                      <span className="text-[8.5px] text-[#6B6F6B] block">Elev: {sat.elev}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw Hex Packet Downlink Stream */}
            <div className="p-2.5 bg-slate-900 text-emerald-400 rounded-xl space-y-1 text-[10px] font-mono">
              <div className="text-slate-400 text-[8.5px] flex justify-between">
                <span>LAST EWMS PACKET DOWNLINK:</span>
                <span className="text-emerald-300">CRC-16 OK (0x9B4F)</span>
              </div>
              <div className="tracking-widest">
                55 AA 04 1E 08 4E 1A 9B 4F 82 11 F0 38 29
              </div>
              <div className="text-[9px] text-slate-300">
                Payload: Flash Flood Surge Alert &bull; Target Grid: {userCoords.lat.toFixed(2)}°N, {userCoords.lng.toFixed(2)}°W
              </div>
            </div>

            <button
              onClick={() => setIsSatelliteModalOpen(false)}
              className="w-full bg-sky-700 hover:bg-sky-800 text-white py-2.5 rounded-xl font-bold text-xs shadow cursor-pointer"
            >
              Close Satellite Telemetry
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔔 POPUP MODAL: NOTIFICATION PREFERENCES & DELIVERY LOG                   */}
      {/* ========================================================================= */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FFFDF8] border-2 border-[#0f766e] rounded-3xl max-w-md w-full p-4 sm:p-5 space-y-3.5 shadow-2xl font-mono text-[#263238] max-h-[90vh] overflow-y-auto scrollbar-thin">
            
            <div className="flex items-center justify-between border-b border-[#DDD5C7] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0f766e] text-white flex items-center justify-center font-bold text-sm shadow">
                  🔔
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#263238]">Notification Channels</h3>
                  <p className="text-[9px] text-[#6B6F6B]">Multi-Channel Emergency Delivery</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#FAF8F2] border border-[#DDD5C7] text-[#263238] font-bold text-sm flex items-center justify-center hover:bg-[#EEE8DC]"
              >
                &times;
              </button>
            </div>

            {/* Channel Toggles */}
            <div className="space-y-2 text-xs">
              {[
                { key: 'inApp', title: 'In-App Siren & Flashing Banners', desc: 'Active while using application' },
                { key: 'push', title: 'System Push Notifications (FCM)', desc: 'Background lockscreen alerts' },
                { key: 'sms', title: 'Emergency SMS Broadcast (MSG91/Twilio)', desc: 'Works on low bandwidth 2G/3G' },
                { key: 'callIvr', title: 'Automated Voice Call (IVR)', desc: 'Critical life-safety calls' }
              ].map((c) => (
                <div key={c.key} className="p-2.5 bg-[#FAF8F2] border border-[#DDD5C7] rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#263238]">{c.title}</div>
                    <div className="text-[9px] text-[#6B6F6B]">{c.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings[c.key as keyof NotificationSetting] as boolean}
                    onChange={(e) => setNotifSettings(prev => ({ ...prev, [c.key]: e.target.checked }))}
                    className="w-4 h-4 text-[#0f766e] rounded accent-[#0f766e] cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {/* Critical Bypass Toggle */}
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-rose-900">Critical Siren Bypass Quiet Hours</div>
                <div className="text-[9px] text-rose-700">Overrides silent mode for evacuation orders</div>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.criticalBypass}
                onChange={(e) => setNotifSettings(prev => ({ ...prev, criticalBypass: e.target.checked }))}
                className="w-4 h-4 text-[#dc2626] rounded accent-[#dc2626] cursor-pointer"
              />
            </div>

            {/* Recent Delivery Log */}
            <div className="space-y-1.5 pt-1">
              <h4 className="text-[9.5px] font-bold uppercase tracking-wider text-[#6B6F6B]">Recent Delivery Log</h4>
              <div className="p-2.5 bg-[#FAF8F2] border border-[#DDD5C7] rounded-xl text-[10px] space-y-1">
                <div className="flex justify-between font-bold text-[#263238]">
                  <span>CODE RED WEA ALERT #402</span>
                  <span className="text-emerald-700">DELIVERED</span>
                </div>
                <div className="text-[#6B6F6B] text-[9px]">
                  Channels: Push (FCM OK), SMS (SENT), Voice IVR (STANDBY)
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="w-full bg-[#0f766e] hover:bg-[#0d9488] text-white py-2.5 rounded-xl font-bold text-xs shadow cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🎟️ POPUP MODAL: FREE EMERGENCY TRANSIT BOARDING PASS                       */}
      {/* ========================================================================= */}
      {isTransitPassOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FFFDF8] border-2 border-[#0f766e] rounded-3xl max-w-sm w-full p-4 sm:p-5 space-y-3.5 shadow-2xl font-mono text-[#263238] relative">
            <div className="flex justify-between items-start border-b border-[#DDD5C7] pb-2.5">
              <div>
                <span className="text-[9px] font-bold text-[#0f766e] uppercase tracking-wider block">
                  VALLEY METRO &bull; MUNICIPAL RELIEF
                </span>
                <h3 className="text-sm font-bold text-[#263238]">
                  Emergency Free Transit Pass
                </h3>
              </div>
              <span className="text-[9px] bg-[#E8F5EF] text-[#0f766e] border border-[#A7F3D0] px-2 py-0.5 rounded-full font-bold">
                VALID TODAY
              </span>
            </div>

            <div className="bg-[#FAF8F2] border border-[#DDD5C7] p-3.5 rounded-2xl text-center space-y-2.5">
              <div className="w-36 h-36 mx-auto bg-white p-2 rounded-xl border border-[#DDD5C7] shadow-inner flex flex-col items-center justify-center">
                <div className="grid grid-cols-6 gap-1 p-1.5">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-3.5 h-3.5 rounded-xs ${i % 2 === 0 || i % 5 === 0 ? 'bg-[#263238]' : 'bg-transparent'}`} 
                    />
                  ))}
                </div>
                <span className="text-[8.5px] text-[#6B6F6B] font-mono mt-0.5">#CP-PHX-2026-CODE-RED</span>
              </div>

              <div className="text-[11px] font-sans text-[#263238]">
                <strong>Show this pass to any bus driver or transit officer</strong> for immediate, zero-fare transportation to all registered City of Phoenix Cooling Centers.
              </div>
            </div>

            <button
              onClick={() => setIsTransitPassOpen(false)}
              className="w-full bg-[#0f766e] hover:bg-[#0d9488] text-white py-2 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Done / Close Pass
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
