'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Radio
} from 'lucide-react';
import { SOSCategory, CitizenPing } from '@/app/api/citizen-sync/route';

type CitizenTab = 'WEATHER' | 'SOS' | 'EVACUATION';

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

const SHELTERS: Shelter[] = [
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

const HOURLY_FORECAST = [
  { time: '10 AM', temp: 88, condition: 'Sunny', heatRisk: 'Moderate', icon: Sun },
  { time: '12 PM', temp: 96, condition: 'High Solar', heatRisk: 'High', icon: Sun },
  { time: '2 PM', temp: 104, condition: 'Peak Surge', heatRisk: 'Extreme', icon: Flame },
  { time: '4 PM', temp: 102, condition: 'Severe Heat', heatRisk: 'Extreme', icon: Flame },
  { time: '6 PM', temp: 97, condition: 'Warm Breeze', heatRisk: 'High', icon: Sun },
  { time: '8 PM', temp: 90, condition: 'Night Cooling', heatRisk: 'Moderate', icon: Sun },
];

const FIVE_DAY_OUTLOOK = [
  { day: 'Today', high: 104, low: 78, status: 'Code Red Heat', color: 'text-rose-600' },
  { day: 'Tue', high: 106, low: 80, status: 'Extreme Warning', color: 'text-rose-600' },
  { day: 'Wed', high: 101, low: 77, status: 'Severe Heat', color: 'text-orange-600' },
  { day: 'Thu', high: 97, low: 74, status: 'Elevated Heat', color: 'text-amber-600' },
  { day: 'Fri', high: 94, low: 72, status: 'Moderate', color: 'text-emerald-600' },
];

export default function CitizenLifelinePage() {
  // Navigation
  const [activeTab, setActiveTab] = useState<CitizenTab>('WEATHER');
  const [countdownSeconds, setCountdownSeconds] = useState(9900); // ~2h 45m
  const [isTransitPassOpen, setIsTransitPassOpen] = useState(false);
  const [language, setLanguage] = useState<'EN' | 'ES'>('EN');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Live Telemetry from /api/live-data
  const [liveTemp, setLiveTemp] = useState<number>(84.4);
  const [liveHumidity, setLiveHumidity] = useState<number>(25);
  const [liveAqi, setLiveAqi] = useState<number>(68);

  // SOS Emergency State
  const [selectedSOSCategory, setSelectedSOSCategory] = useState<SOSCategory>('HEAT_STROKE');
  const [sosNotes, setSosNotes] = useState<string>('');
  const [isSendingSOS, setIsSendingSOS] = useState<boolean>(false);
  const [activeSOSBeacon, setActiveSOSBeacon] = useState<CitizenPing | null>(null);
  const [verifiedSafeCount, setVerifiedSafeCount] = useState<number>(1423);
  const [isSafeCheckedIn, setIsSafeCheckedIn] = useState<boolean>(false);

  // Geolocation
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: 33.4484, lng: -112.0740 });
  const [gpsStatus, setGpsStatus] = useState<string>('Phoenix Downtown Core (Ward 4)');

  // Poll for Live SOS Status Updates & Weather Telemetry
  const pollSync = useCallback(async () => {
    try {
      // 1. Citizen Sync
      const res = await fetch('/api/citizen-sync', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          setVerifiedSafeCount(data.stats.totalVerifiedSafe || 1423);
        }
        if (activeSOSBeacon && data.recentPings) {
          const matching = data.recentPings.find((p: CitizenPing) => p.id === activeSOSBeacon.id);
          if (matching && matching.status !== activeSOSBeacon.status) {
            setActiveSOSBeacon(matching);
          }
        }
      }

      // 2. Real Weather Telemetry
      const weatherRes = await fetch('/api/live-data', { cache: 'no-store' });
      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        if (wData.zones && wData.zones.length > 0) {
          const phx = wData.zones[0];
          if (phx.temperatureF !== null) setLiveTemp(phx.temperatureF);
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
          setGpsStatus(`GPS Locked (Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)})`);
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

  // Send SOS Distress Beacon
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
            metro: 'Phoenix, AZ',
            lat: userCoords.lat,
            lng: userCoords.lng,
            address: '1221 N Central Ave (Downtown Phoenix)',
            notes: sosNotes || (
              selectedSOSCategory === 'HEAT_STROKE' 
                ? 'Severe heat exhaustion, dizziness & dehydration reported.' 
                : selectedSOSCategory === 'POWER_FAILURE'
                ? 'AC grid failure. Indoor temp high, oxygen concentrator at risk.'
                : 'Emergency distress ping triggered from mobile handset.'
            )
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

  // Safe Check-in
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
            metro: 'Phoenix, AZ',
            lat: userCoords.lat,
            lng: userCoords.lng,
            notes: 'Citizen confirmed safe at residence via mobile portal'
          }
        })
      });
      if (res.ok) {
        setIsSafeCheckedIn(true);
        setVerifiedSafeCount((c) => c + 1);
      }
    } catch (e) {
      console.error('Safe check in error:', e);
      setIsSafeCheckedIn(true);
    }
  };

  // Audio voice alert player (Web Speech API)
  const toggleAudioAlert = () => {
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
    } else {
      const text = language === 'EN' 
        ? `Emergency Weather Broadcast. High heat and grid stress warning in effect for Phoenix Downtown Core. Live temperature is ${liveTemp} degrees. Please pre-cool your home, stay hydrated, and locate cooling hubs at Burton Barr Library. Free transit passes are active.`
        : `Transmisión de Emergencia Climática. Advertencia de calor extremo y sobrecarga eléctrica para el centro de Phoenix. La temperatura actual es de ${((liveTemp - 32) * 5 / 9).toFixed(1)} grados. Por favor use los centros de enfriamiento en la biblioteca Burton Barr. El transporte es gratuito.`;
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'EN' ? 'en-US' : 'es-MX';
      utterance.rate = 0.95;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis?.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#263238] font-sans antialiased selection:bg-[#0f766e] selection:text-white flex justify-center pb-16">
      
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md bg-[#FFFDF8] border-x border-[#DDD5C7] min-h-screen shadow-2xl flex flex-col">
        
        {/* Top Header & EOC Navigation */}
        <header className="sticky top-0 z-40 bg-[#E5CDC6] border-b border-[#C3988E] px-4 py-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Link 
              href="/"
              className="w-8 h-8 rounded-full bg-[#FFFDF8] border border-[#C3988E] flex items-center justify-center text-[#263238] hover:bg-[#FAF8F2] transition-colors shadow-xs"
              title="Return to City EOC Commander Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-[#0f766e]" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#be123c] font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#dc2626] inline-block animate-ping" />
                <span>CITIZEN LIFELINE &bull; LIVE</span>
              </div>
              <h1 className="text-xs font-bold text-[#263238] font-mono leading-tight">
                CivicPulse Companion App
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage(l => l === 'EN' ? 'ES' : 'EN')}
              className="text-[9.5px] font-mono font-bold bg-[#FFFDF8] border border-[#C3988E] px-2 py-1 rounded-lg text-[#0f766e] hover:bg-[#FAF8F2] cursor-pointer shadow-xs"
            >
              {language === 'EN' ? '🇺🇸 EN' : '🇲🇽 ES'}
            </button>
            <Link
              href="/"
              className="text-[9.5px] font-mono font-bold bg-[#0f766e] hover:bg-[#0d9488] text-white px-2.5 py-1 rounded-lg shadow-sm"
            >
              EOC View ➔
            </Link>
          </div>
        </header>

        {/* 3-Page Top Navigation Bar */}
        <nav className="bg-[#D8B6AD] border-b border-[#C3988E] px-2 py-1.5 flex items-center justify-around text-xs font-mono font-bold shadow-xs">
          <button
            onClick={() => setActiveTab('WEATHER')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'SOS'
                ? 'bg-[#DC2626] text-white border border-[#991B1B] shadow-sm font-extrabold'
                : 'text-[#881337] hover:text-[#be123c]'
            }`}
          >
            <Siren className="w-3.5 h-3.5 text-current animate-pulse" />
            <span>2. SOS Distress</span>
            {activeSOSBeacon && activeSOSBeacon.status !== 'RESOLVED' && (
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('EVACUATION')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'EVACUATION'
                ? 'bg-[#FFFDF8] text-[#0369a1] border border-[#C3988E] shadow-sm font-extrabold'
                : 'text-[#4A3E3B] hover:text-[#263238]'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>3. Evacuation</span>
          </button>
        </nav>

        {/* ========================================================================= */}
        {/* PAGE 1: DAILY WEATHER & HAZARD DETAILS                                    */}
        {/* ========================================================================= */}
        {activeTab === 'WEATHER' && (
          <main className="p-4 space-y-4 flex-1 overflow-y-auto">
            
            {/* Live Atmospheric Conditions Card */}
            <div className="bg-gradient-to-br from-[#FFFDF8] to-[#FAF8F2] border border-[#DDD5C7] rounded-3xl p-4 shadow-md space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-[#0f766e] font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Phoenix, Arizona (85004)</span>
                  </div>
                  <div className="text-3xl font-extrabold text-[#263238] font-mono tracking-tight mt-1">
                    {liveTemp.toFixed(1)}°F
                    <span className="text-sm font-normal text-[#6B6F6B] ml-2">
                      ({((liveTemp - 32) * 5 / 9).toFixed(1)}°C)
                    </span>
                  </div>
                  <div className="text-xs text-[#dc2626] font-bold font-mono mt-0.5">
                    Feels Like: {(liveTemp + 3.2).toFixed(1)}°F &bull; Severe Heat Warning
                  </div>
                </div>

                <div className="text-right">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 shadow-sm ml-auto">
                    <Sun className="w-7 h-7 animate-spin-slow" />
                  </div>
                  <span className="text-[10px] font-mono text-[#6B6F6B] block mt-1">Sunny / Clear</span>
                </div>
              </div>

              {/* 4 Environmental Vitals */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#EEE8DC] font-mono text-center">
                <div className="bg-[#FFFDF8] p-2 rounded-xl border border-[#EEE8DC]">
                  <div className="text-[8.5px] text-[#6B6F6B] uppercase font-bold">Humidity</div>
                  <div className="text-xs font-bold text-[#0f766e] flex items-center justify-center gap-0.5 mt-0.5">
                    <Droplets className="w-3 h-3 text-[#0d9488]" />
                    <span>{liveHumidity}%</span>
                  </div>
                </div>

                <div className="bg-[#FFFDF8] p-2 rounded-xl border border-[#EEE8DC]">
                  <div className="text-[8.5px] text-[#6B6F6B] uppercase font-bold">Air Quality</div>
                  <div className="text-xs font-bold text-amber-600 flex items-center justify-center gap-0.5 mt-0.5">
                    <Wind className="w-3 h-3 text-amber-500" />
                    <span>{liveAqi} AQI</span>
                  </div>
                </div>

                <div className="bg-[#FFFDF8] p-2 rounded-xl border border-[#EEE8DC]">
                  <div className="text-[8.5px] text-[#6B6F6B] uppercase font-bold">UV Index</div>
                  <div className="text-xs font-bold text-[#dc2626] flex items-center justify-center gap-0.5 mt-0.5">
                    <Sun className="w-3 h-3 text-[#dc2626]" />
                    <span>11+ Extr</span>
                  </div>
                </div>

                <div className="bg-[#FFFDF8] p-2 rounded-xl border border-[#EEE8DC]">
                  <div className="text-[8.5px] text-[#6B6F6B] uppercase font-bold">Wind</div>
                  <div className="text-xs font-bold text-[#263238] flex items-center justify-center gap-0.5 mt-0.5">
                    <span>6.8 mph</span>
                  </div>
                </div>
              </div>
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
                      {language === 'EN' ? 'OFFICIAL NWS EMERGENCY ALERT' : 'ALERTA OFICIAL DE EMERGENCIA'}
                    </span>
                    <h2 className="text-sm font-bold text-[#263238] leading-tight font-mono">
                      {language === 'EN' ? 'Extreme Heat & Power Grid Stress' : 'Ola de Calor Extremo y Sobrecarga'}
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
                  ? 'NOAA HRRR models project peak heat index of 106°F at 2:30 PM with high grid load. Free transit passes to cooling hubs are active.' 
                  : 'Modelos de NOAA proyectan índice de calor de 41°C a las 2:30 PM con alta demanda eléctrica. El transporte a centros de enfriamiento es gratuito.'}
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

            {/* 12-Hour Hourly Forecast Timeline */}
            <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-2xl p-3.5 shadow-sm space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs font-bold text-[#0f766e]">
                <span>12-HOUR HOURLY TEMPERATURE PROFILE</span>
                <span className="text-[9px] text-[#6B6F6B]">Peak at 2:30 PM</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 text-center scrollbar-thin">
                {HOURLY_FORECAST.map((h, i) => (
                  <div key={i} className="min-w-[64px] bg-[#FAF8F2] border border-[#EEE8DC] p-2 rounded-xl flex flex-col items-center">
                    <span className="text-[9px] text-[#6B6F6B] font-bold">{h.time}</span>
                    <h.icon className={`w-4 h-4 my-1 ${h.temp >= 100 ? 'text-[#dc2626]' : 'text-amber-500'}`} />
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

            {/* 5-Day Hazard Outlook */}
            <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-2xl p-3.5 shadow-sm space-y-2 font-mono">
              <span className="text-xs font-bold text-[#263238] block">5-DAY METROPOLITAN OUTLOOK</span>
              <div className="space-y-1.5">
                {FIVE_DAY_OUTLOOK.map((d, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#FAF8F2] p-2 rounded-xl text-xs">
                    <span className="font-bold text-[#263238] w-12">{d.day}</span>
                    <span className={`text-[10px] font-bold ${d.color}`}>{d.status}</span>
                    <div className="font-bold text-[#263238]">
                      <span>{d.high}°</span>
                      <span className="text-[#6B6F6B] text-[10px] ml-1.5 font-normal">/ {d.low}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Municipal Prep Tasks */}
            <div className="bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl p-3.5 shadow-sm space-y-2 font-mono text-xs">
              <span className="font-bold text-[#0f766e] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#0d9488]" />
                <span>3 MORNING ACTIONS BEFORE 1:00 PM</span>
              </span>
              <div className="space-y-1.5 text-[11px] font-sans text-[#263238]">
                <div className="p-2 bg-[#FFFDF8] rounded-xl border border-[#EEE8DC]">
                  &bull; <strong>Pre-cool living spaces:</strong> Set thermostat to 70°F before 1 PM peak grid strain.
                </div>
                <div className="p-2 bg-[#FFFDF8] rounded-xl border border-[#EEE8DC]">
                  &bull; <strong>Refrigerate medications:</strong> Store insulin and emergency supplies in cooler bags.
                </div>
                <div className="p-2 bg-[#FFFDF8] rounded-xl border border-[#EEE8DC]">
                  &bull; <strong>Confirm cooling center route:</strong> Free transit passes are active to Burton Barr Library.
                </div>
              </div>
            </div>

          </main>
        )}

        {/* ========================================================================= */}
        {/* PAGE 2: SOS DISTRESS BUTTON & LIVE RESCUE DISPATCH                        */}
        {/* ========================================================================= */}
        {activeTab === 'SOS' && (
          <main className="p-4 space-y-4 flex-1 overflow-y-auto">
            
            {/* Active SOS Rescue Status Banner (If Triggered) */}
            {activeSOSBeacon && activeSOSBeacon.status !== 'RESOLVED' ? (
              <div className="bg-[#FFF1F2] border-2 border-[#dc2626] rounded-3xl p-5 shadow-xl space-y-4 font-mono">
                <div className="flex items-center justify-between border-b border-[#FECDD3] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#dc2626] text-white flex items-center justify-center animate-ping">
                      <Siren className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#dc2626] font-extrabold uppercase">EMERGENCY BEACON ACTIVE</span>
                      <h3 className="text-sm font-bold text-[#263238]">{activeSOSBeacon.categoryName}</h3>
                    </div>
                  </div>
                  <span className="text-[9px] bg-[#dc2626] text-white px-2 py-0.5 rounded-full font-bold">
                    {activeSOSBeacon.status === 'DISPATCHED' ? 'RESCUE EN ROUTE' : 'PENDING TRIAGE'}
                  </span>
                </div>

                {/* 3-Stage Interactive Progress Bar */}
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
                      <div>3. Rescue Team Dispatched!</div>
                      {activeSOSBeacon.assignedUnit && (
                        <div className="text-[10px] text-emerald-700 font-normal">
                          Assigned: <strong>{activeSOSBeacon.assignedUnit}</strong> (ETA ~{activeSOSBeacon.etaMinutes || 5} min)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* GPS Pin */}
                <div className="bg-[#FFFDF8] p-2.5 rounded-xl border border-[#FECDD3] text-[10px] space-y-0.5">
                  <div className="text-[#6B6F6B]">Incident Location:</div>
                  <div className="font-bold text-[#263238] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#dc2626]" />
                    <span>{activeSOSBeacon.address || 'Phoenix Downtown Sector 4'}</span>
                  </div>
                  <div className="text-[#6B6F6B]">Coordinates: Lat {activeSOSBeacon.lat.toFixed(4)}, Lng {activeSOSBeacon.lng.toFixed(4)}</div>
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
              <div className="space-y-4">
                
                {/* Main SOS Trigger Card */}
                <div className="bg-gradient-to-b from-[#FFF1F2] to-[#FFFDF8] border-2 border-[#dc2626] rounded-3xl p-6 text-center space-y-4 shadow-xl relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#be123c] block">
                      CITY OF PHOENIX EMERGENCY DISASTER NETWORK
                    </span>
                    <h2 className="text-xl font-extrabold text-[#263238] font-mono">
                      SOS Distress Beacon
                    </h2>
                    <p className="text-xs text-[#6B6F6B] font-sans">
                      Tap below to transmit an immediate high-priority distress signal and GPS location to the City EOC Rescue Command.
                    </p>
                  </div>

                  {/* Huge Pitch-Red SOS Button */}
                  <div className="py-2 flex justify-center">
                    <button
                      onClick={handleTriggerSOS}
                      disabled={isSendingSOS}
                      className="w-40 h-40 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] active:scale-95 text-white font-mono font-black text-2xl tracking-widest flex flex-col items-center justify-center shadow-2xl transition-all cursor-pointer border-4 border-[#991B1B] hover:border-white"
                      title="Tap to trigger immediate EOC Rescue Dispatch"
                    >
                      <Siren className="w-10 h-10 mb-1 animate-bounce" />
                      <span>SOS</span>
                      <span className="text-[9px] font-normal tracking-normal opacity-90">SEND RESCUE</span>
                    </button>
                  </div>

                  {/* Geolocation Status */}
                  <div className="bg-[#FFFDF8] p-2.5 rounded-xl border border-[#FECDD3] font-mono text-[10px] text-[#263238] flex items-center justify-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#dc2626] shrink-0" />
                    <span className="font-bold">{gpsStatus}</span>
                  </div>
                </div>

                {/* 4 Emergency Categories Selector */}
                <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-2xl p-4 shadow-sm space-y-3 font-mono">
                  <div className="flex items-center justify-between text-xs font-bold text-[#263238]">
                    <span>SELECT DISTRESS REASON:</span>
                    <span className="text-[9px] text-[#0f766e]">Prioritizes Dispatch</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => setSelectedSOSCategory('HEAT_STROKE')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        selectedSOSCategory === 'HEAT_STROKE'
                          ? 'bg-[#FEE2E2] border-[#dc2626] text-[#991B1B] font-bold shadow-sm'
                          : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#6B6F6B]'
                      }`}
                    >
                      <span className="text-lg">🌡️</span>
                      <span className="font-bold text-[11px]">Heat Stroke / Collapse</span>
                      <span className="text-[8.5px] opacity-80">Dehydration / Dizziness</span>
                    </button>

                    <button
                      onClick={() => setSelectedSOSCategory('POWER_FAILURE')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        selectedSOSCategory === 'POWER_FAILURE'
                          ? 'bg-[#FEF3C7] border-[#d97706] text-[#b45309] font-bold shadow-sm'
                          : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#6B6F6B]'
                      }`}
                    >
                      <span className="text-lg">⚡</span>
                      <span className="font-bold text-[11px]">Power / AC Outage</span>
                      <span className="text-[8.5px] opacity-80">Oxygen / Meds at Risk</span>
                    </button>

                    <button
                      onClick={() => setSelectedSOSCategory('FLOOD_TRAP')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        selectedSOSCategory === 'FLOOD_TRAP'
                          ? 'bg-[#E0F2FE] border-[#0284c7] text-[#0369a1] font-bold shadow-sm'
                          : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#6B6F6B]'
                      }`}
                    >
                      <span className="text-lg">🌊</span>
                      <span className="font-bold text-[11px]">Flash Flood / Trap</span>
                      <span className="text-[8.5px] opacity-80">Road or Home Blocked</span>
                    </button>

                    <button
                      onClick={() => setSelectedSOSCategory('MEDICAL_SOS')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        selectedSOSCategory === 'MEDICAL_SOS'
                          ? 'bg-[#F3E8FF] border-[#9333ea] text-[#7e22ce] font-bold shadow-sm'
                          : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#6B6F6B]'
                      }`}
                    >
                      <span className="text-lg">🚑</span>
                      <span className="font-bold text-[11px]">Senior Medical Emergency</span>
                      <span className="text-[8.5px] opacity-80">Paramedic Immediate</span>
                    </button>
                  </div>

                  {/* Optional Notes */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#6B6F6B] font-bold block">Optional Details (e.g. Apartment #, Medical Conditions):</label>
                    <input
                      type="text"
                      value={sosNotes}
                      onChange={(e) => setSosNotes(e.target.value)}
                      placeholder="e.g. Apt 3B, senior with respiratory distress..."
                      className="w-full bg-[#FAF8F2] border border-[#DDD5C7] rounded-xl px-3 py-2 text-xs font-sans outline-none focus:border-[#0f766e]"
                    />
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

                {/* Welfare Check-in Safe Button */}
                <div className="bg-[#FAF8F2] border border-[#DDD5C7] p-3 rounded-2xl flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-[#0d9488]" />
                    <div>
                      <div className="font-bold text-[#263238]">Not in danger?</div>
                      <div className="text-[10px] text-[#6B6F6B]">{verifiedSafeCount.toLocaleString()} Citizens Safe</div>
                    </div>
                  </div>
                  <button
                    onClick={handleCheckInSafe}
                    disabled={isSafeCheckedIn}
                    className="bg-[#0f766e] hover:bg-[#0d9488] text-white px-3 py-1.5 rounded-xl font-bold text-[11px] shadow-sm transition-colors cursor-pointer"
                  >
                    {isSafeCheckedIn ? '✓ Verified Safe' : 'Confirm Safe'}
                  </button>
                </div>

              </div>
            )}

          </main>
        )}

        {/* ========================================================================= */}
        {/* PAGE 3: EVACUATION ROUTES & SAFE REFUGE CENTERS                           */}
        {/* ========================================================================= */}
        {activeTab === 'EVACUATION' && (
          <main className="p-4 space-y-4 flex-1 overflow-y-auto">
            
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
              <div className="space-y-2 text-xs">
                <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl flex items-start gap-2 text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">PRIMARY SAFE ROUTE: North Central Transit Corridor</div>
                    <div className="text-[10.5px] text-emerald-800 font-sans leading-tight mt-0.5">
                      Proceed North via 3rd Ave towards Burton Barr Library (0.4 mi). Fully shaded sidewalks, misting poles, and active cooling shuttles.
                    </div>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-300 p-2.5 rounded-xl flex items-start gap-2 text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">HAZARD SECTOR TO AVOID: East Washington Street</div>
                    <div className="text-[10.5px] text-rose-800 font-sans leading-tight mt-0.5">
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

            {/* List of Verified Municipal Cooling Hubs */}
            <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-2xl p-4 shadow-sm space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-[#EEE8DC] pb-2">
                <span className="text-xs font-bold text-[#0f766e] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#0d9488]" />
                  <span>VERIFIED SAFE HAVENS & COOLING CENTERS</span>
                </span>
                <span className="text-[9px] text-[#6B6F6B]">3 Centers Open</span>
              </div>

              <div className="space-y-3">
                {SHELTERS.map((s) => (
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

          </main>
        )}

        {/* Footer */}
        <footer className="p-3 text-center border-t border-[#DDD5C7] bg-[#FAF8F2] font-mono text-[9px] text-[#6B6F6B] space-y-0.5">
          <div>CIVICPULSE CITIZEN LIFELINE &bull; PHOENIX EMERGENCY DISASTER NETWORK</div>
          <div>Direct 2-Way Sync with NOAA NWS &bull; FEMA IPAWS WEA &bull; City EOC</div>
        </footer>

      </div>

      {/* ========================================================================= */}
      {/* 🎟️ POPUP MODAL: FREE EMERGENCY TRANSIT BOARDING PASS                       */}
      {/* ========================================================================= */}
      {isTransitPassOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFDF8] border-2 border-[#0f766e] rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl font-mono text-[#263238] relative">
            <div className="flex justify-between items-start border-b border-[#DDD5C7] pb-3">
              <div>
                <span className="text-[9px] font-bold text-[#0f766e] uppercase tracking-wider block">
                  VALLEY METRO &bull; MUNICIPAL RELIEF
                </span>
                <h3 className="text-base font-bold text-[#263238]">
                  Emergency Free Transit Pass
                </h3>
              </div>
              <span className="text-[9px] bg-[#E8F5EF] text-[#0f766e] border border-[#A7F3D0] px-2 py-0.5 rounded-full font-bold">
                VALID TODAY
              </span>
            </div>

            <div className="bg-[#FAF8F2] border border-[#DDD5C7] p-4 rounded-2xl text-center space-y-3">
              <div className="w-40 h-40 mx-auto bg-white p-2 rounded-xl border border-[#DDD5C7] shadow-inner flex flex-col items-center justify-center">
                <div className="grid grid-cols-6 gap-1 p-2">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-4 h-4 rounded-sm ${i % 2 === 0 || i % 5 === 0 ? 'bg-[#263238]' : 'bg-transparent'}`} 
                    />
                  ))}
                </div>
                <span className="text-[9px] text-[#6B6F6B] font-mono mt-1">#CP-PHX-2026-CODE-RED</span>
              </div>

              <div className="text-xs font-sans text-[#263238]">
                <strong>Show this pass to any bus driver or transit officer</strong> for immediate, zero-fare transportation to all registered City of Phoenix Cooling Centers.
              </div>
            </div>

            <div className="text-[10px] text-[#6B6F6B] space-y-1">
              <div>&bull; Authorized under Phoenix Municipal Heat Emergency Ordinance #402</div>
              <div>&bull; Valid across all Valley Metro Bus & Light Rail routes</div>
            </div>

            <button
              onClick={() => setIsTransitPassOpen(false)}
              className="w-full bg-[#0f766e] hover:bg-[#0d9488] text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              Done / Close Pass
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
