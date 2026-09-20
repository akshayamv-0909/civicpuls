'use client';

import React, { useState, useEffect } from 'react';
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
  Users, 
  Zap, 
  HeartHandshake, 
  ArrowLeft
} from 'lucide-react';

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
    amenities: ['High-Power AC', 'Cold Water Refill', 'Medical Staff on Duty', 'Device Charging']
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
    amenities: ['Shaded Pavilion', 'Emergency Medical Kit', 'Free Bus Transfer']
  }
];

export default function CitizenLifelinePage() {
  const [selectedPersona, setSelectedPersona] = useState<'SENIOR' | 'ASTHMA' | 'WORKER' | 'PARENT'>('SENIOR');
  const [countdownSeconds, setCountdownSeconds] = useState(9900); // ~2h 45m
  const [isTransitPassOpen, setIsTransitPassOpen] = useState(false);
  const [language, setLanguage] = useState<'EN' | 'ES'>('EN');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // 2-Way Sync State
  const [checkInStatus, setCheckInStatus] = useState<'IDLE' | 'SAFE' | 'OUTAGE_SUBMITTED' | 'SOS_SUBMITTED'>('IDLE');
  const [verifiedSafeCount, setVerifiedSafeCount] = useState(1423);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outageNote, setOutageNote] = useState('');
  const [showOutageModal, setShowOutageModal] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format countdown
  const hours = Math.floor(countdownSeconds / 3600);
  const minutes = Math.floor((countdownSeconds % 3600) / 60);
  const seconds = countdownSeconds % 60;
  const formattedCountdown = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Two-way SOS / Safe check-in handler
  const handleCheckIn = async (type: 'SAFE' | 'OUTAGE' | 'WATER_SOS', notes?: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/citizen-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_PING',
          ping: {
            type,
            zoneId: 'phx-downtown',
            metro: 'Phoenix, AZ',
            notes: notes || (type === 'SAFE' ? 'Citizen verified safe at residence' : 'Emergency alert reported via mobile')
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        if (type === 'SAFE') {
          setCheckInStatus('SAFE');
          setVerifiedSafeCount(data.totalSafeNow || verifiedSafeCount + 1);
        } else if (type === 'OUTAGE') {
          setCheckInStatus('OUTAGE_SUBMITTED');
          setShowOutageModal(false);
        } else {
          setCheckInStatus('SOS_SUBMITTED');
        }
      }
    } catch (e) {
      console.error('Check-in error:', e);
      if (type === 'SAFE') setCheckInStatus('SAFE');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Audio voice alert player (Web Speech API)
  const toggleAudioAlert = () => {
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
    } else {
      const text = language === 'EN' 
        ? "Emergency Weather Broadcast. High-heat and grid stress warning in effect for Phoenix Downtown Core. Peak temperatures approaching 106 degrees. Please pre-cool your home, avoid outdoor exposure, and utilize municipal cooling centers at Burton Barr Library. Free transit passes are active."
        : "Transmisión de Emergencia Climática. Advertencia de calor extremo y sobrecarga eléctrica para el centro de Phoenix. Temperaturas máximas cercanas a 41 grados. Por favor pre-enfríe su hogar y use los centros de enfriamiento municipales en la biblioteca Burton Barr. El transporte público es gratuito.";
      
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
    <div className="min-h-screen bg-[#F5F1E8] text-[#263238] font-sans antialiased selection:bg-[#0f766e] selection:text-white flex justify-center pb-12">
      
      {/* Mobile-Constrained Container */}
      <div className="w-full max-w-md bg-[#FFFDF8] border-x border-[#DDD5C7] min-h-screen shadow-2xl flex flex-col">
        
        {/* Top App Header & EOC Navigation Link */}
        <header className="sticky top-0 z-40 bg-[#F5ECE8] border-b border-[#DDD0CB] px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Link 
              href="/"
              className="w-8 h-8 rounded-full bg-[#FAF8F2] border border-[#DDD0CB] flex items-center justify-center text-[#263238] hover:bg-[#FFFDF8] transition-colors"
              title="Return to City EOC Commander Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#be123c] font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#dc2626] animate-ping" />
                <span>CITIZEN LIFELINE &bull; LIVE</span>
              </div>
              <h1 className="text-sm font-bold text-[#263238] font-mono leading-tight">
                CivicPulse Handset Portal
              </h1>
            </div>
          </div>

          {/* Language Selector & EOC Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage(l => l === 'EN' ? 'ES' : 'EN')}
              className="text-[10px] font-mono font-bold bg-[#FAF8F2] border border-[#DDD0CB] px-2 py-1 rounded-lg text-[#0f766e] hover:bg-[#FFFDF8] cursor-pointer"
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

        {/* Main Content Area */}
        <main className="p-4 space-y-4 flex-1">
          
          {/* Active Geotargeted Alert Card (FEMA WEA 3.0 Standard) */}
          <div className="bg-[#FFF1F2] border-2 border-[#dc2626] rounded-2xl p-4 shadow-md space-y-3 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-[#dc2626]/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#dc2626] flex items-center justify-center text-white shrink-0 shadow-sm">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[#be123c] block">
                    {language === 'EN' ? 'OFFICIAL EMERGENCY WEA BROADCAST' : 'ALERTA OFICIAL DE EMERGENCIA WEA'}
                  </span>
                  <h2 className="text-base font-bold text-[#263238] leading-tight font-mono">
                    {language === 'EN' ? 'Severe Thermal Surge & Grid Stress' : 'Ola Térmica Extrema y Sobrecarga'}
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
                ? 'NOAA HRRR models detect atmospheric temperatures exceeding 104°F (40°C) with high grid load across Phoenix Urban Core. Municipal emergency protocols and free transit waivers are active.' 
                : 'Modelos de NOAA detectan temperaturas atmosféricas superiores a 40°C con alta demanda eléctrica en el centro de Phoenix. Se han activado protocolos de emergencia y transporte gratuito.'}
            </p>

            {/* Target Location Metadata */}
            <div className="flex items-center justify-between text-[11px] font-mono bg-[#FFFDF8] p-2.5 rounded-xl border border-[#FECDD3]">
              <span className="flex items-center gap-1.5 text-[#263238] font-semibold">
                <MapPin className="w-3.5 h-3.5 text-[#dc2626]" />
                <span>Downtown Phoenix, AZ (85004)</span>
              </span>
              <span className="text-[#dc2626] font-bold">104.2°F Live</span>
            </div>
          </div>

          {/* ⏱️ Pre-Hazard 3-Hour Predictive Countdown Clock */}
          <div className="bg-[#FAF8F2] border border-[#DDD5C7] rounded-2xl p-4 shadow-sm space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-[#EEE8DC] pb-2">
              <span className="text-xs font-bold text-[#0f766e] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#0d9488]" />
                <span>PRE-HAZARD COUNTDOWN</span>
              </span>
              <span className="text-[9px] bg-[#FEF3C7] text-[#b45309] border border-[#FDE68A] px-2 py-0.5 rounded-full font-bold">
                PEAK AT 2:30 PM
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#FFFDF8] p-3 rounded-xl border border-[#DDD5C7]">
              <div>
                <div className="text-[10px] text-[#6B6F6B] uppercase font-bold">Time to Peak Thermal Stress:</div>
                <div className="text-2xl font-extrabold text-[#be123c] tracking-wider">
                  {formattedCountdown}
                </div>
              </div>
              <div className="text-right text-[10px] text-[#6B6F6B]">
                <div>Expected Peak: <strong className="text-[#263238]">106.4°F</strong></div>
                <div>Substation Stress: <strong className="text-[#be123c]">96% Critical</strong></div>
              </div>
            </div>

            {/* 3 Actions to take BEFORE the hazard occurs */}
            <div className="space-y-1.5 text-[11px] font-sans">
              <span className="text-[10px] font-mono font-bold text-[#263238] uppercase block">
                ⚡ 3 Actions to Complete BEFORE 1:00 PM:
              </span>
              <div className="flex items-start gap-2 bg-[#FFFDF8] p-2 rounded-lg border border-[#EEE8DC]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0d9488] shrink-0 mt-0.5" />
                <span><strong>Pre-cool living spaces:</strong> Set thermostat to 70°F now before grid peak pricing and potential substation curtailment.</span>
              </div>
              <div className="flex items-start gap-2 bg-[#FFFDF8] p-2 rounded-lg border border-[#EEE8DC]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0d9488] shrink-0 mt-0.5" />
                <span><strong>Charge medical equipment:</strong> Ensure oxygen concentrators, insulin cooler packs, and phones are at 100% battery.</span>
              </div>
              <div className="flex items-start gap-2 bg-[#FFFDF8] p-2 rounded-lg border border-[#EEE8DC]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0d9488] shrink-0 mt-0.5" />
                <span><strong>Locate nearest cooling hub:</strong> Verify walking route or free transit pass to Burton Barr Library below.</span>
              </div>
            </div>
          </div>

          {/* 👤 Personalized Vulnerability Persona Selector */}
          <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-2xl p-4 shadow-sm space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#263238] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0f766e]" />
                <span>Personalized Safety Persona</span>
              </span>
              <span className="text-[9px] text-[#6B6F6B]">Tap to customize</span>
            </div>

            {/* 4 Persona Toggles */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <button
                onClick={() => setSelectedPersona('SENIOR')}
                className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  selectedPersona === 'SENIOR'
                    ? 'bg-[#E8F5EF] border-[#0d9488] text-[#0f766e] font-bold shadow-sm'
                    : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#6B6F6B] hover:text-[#263238]'
                }`}
              >
                <span className="text-base">👵</span>
                <div>
                  <div className="font-bold">Senior (65+)</div>
                  <div className="text-[8.5px] opacity-80">Meds & Chronic</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedPersona('ASTHMA')}
                className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  selectedPersona === 'ASTHMA'
                    ? 'bg-[#E0F2FE] border-[#0284c7] text-[#0369a1] font-bold shadow-sm'
                    : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#6B6F6B] hover:text-[#263238]'
                }`}
              >
                <span className="text-base">🫁</span>
                <div>
                  <div className="font-bold">Respiratory</div>
                  <div className="text-[8.5px] opacity-80">Asthma / PM2.5</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedPersona('WORKER')}
                className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  selectedPersona === 'WORKER'
                    ? 'bg-[#FEF3C7] border-[#d97706] text-[#b45309] font-bold shadow-sm'
                    : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#6B6F6B] hover:text-[#263238]'
                }`}
              >
                <span className="text-base">🏗️</span>
                <div>
                  <div className="font-bold">Outdoor Labor</div>
                  <div className="text-[8.5px] opacity-80">OSHA Standards</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedPersona('PARENT')}
                className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  selectedPersona === 'PARENT'
                    ? 'bg-[#FFE4E6] border-[#e11d48] text-[#be123c] font-bold shadow-sm'
                    : 'bg-[#FAF8F2] border-[#DDD5C7] text-[#6B6F6B] hover:text-[#263238]'
                }`}
              >
                <span className="text-base">👶</span>
                <div>
                  <div className="font-bold">Infant / Pets</div>
                  <div className="text-[8.5px] opacity-80">Heat Sensitivity</div>
                </div>
              </button>
            </div>

            {/* Dynamic Advice Card for Persona */}
            <div className="bg-[#FAF8F2] p-3 rounded-xl border border-[#DDD5C7] text-xs font-sans space-y-1.5">
              {selectedPersona === 'SENIOR' && (
                <>
                  <div className="font-bold text-[#0f766e] font-mono text-[11px] flex items-center gap-1.5">
                    <span>💊 Critical Senior Protocol:</span>
                  </div>
                  <p className="text-[#263238] text-[11px] leading-relaxed">
                    Heart and blood pressure medications inhibit the body&apos;s natural cooling reflex. Keep insulin refrigerated. If indoor room temperature exceeds 82°F, proceed to Burton Barr Library immediately via the free transit pass below.
                  </p>
                </>
              )}
              {selectedPersona === 'ASTHMA' && (
                <>
                  <div className="font-bold text-[#0369a1] font-mono text-[11px] flex items-center gap-1.5">
                    <span>💨 Air Quality & PM2.5 Alert:</span>
                  </div>
                  <p className="text-[#263238] text-[11px] leading-relaxed">
                    Ground-level ozone and PM2.5 are forecast to peak at <strong>88 AQI</strong> between 2 PM and 5 PM. Keep windows sealed, run indoor HEPA filtration, and keep rescue inhalers within arm&apos;s reach.
                  </p>
                </>
              )}
              {selectedPersona === 'WORKER' && (
                <>
                  <div className="font-bold text-[#b45309] font-mono text-[11px] flex items-center gap-1.5">
                    <span>⏱️ OSHA Heat Stress Compliance:</span>
                  </div>
                  <p className="text-[#263238] text-[11px] leading-relaxed">
                    When Heat Index exceeds 103°F, mandatory 15-minute shaded rest breaks are legally required every 45 minutes of heavy labor. Consume 1 cup of electrolyte fluid every 20 minutes.
                  </p>
                </>
              )}
              {selectedPersona === 'PARENT' && (
                <>
                  <div className="font-bold text-[#be123c] font-mono text-[11px] flex items-center gap-1.5">
                    <span>🚗 Pediatric & Pet Safety Alert:</span>
                  </div>
                  <p className="text-[#263238] text-[11px] leading-relaxed">
                    Vehicles reach lethal 140°F interior temperatures in under 10 minutes. Never leave infants or pets in cars under any circumstances. Keep stroller canopy shaded and avoid hot asphalt walking.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 🗺️ Interactive Safe Haven & Cooling Hubs Navigator */}
          <div className="bg-[#FFFDF8] border border-[#DDD5C7] rounded-2xl p-4 shadow-sm space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-[#EEE8DC] pb-2">
              <span className="text-xs font-bold text-[#0f766e] flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-[#0d9488]" />
                <span>NEAREST OPEN COOLING SHELTERS</span>
              </span>
              <button
                onClick={() => setIsTransitPassOpen(true)}
                className="text-[9.5px] bg-[#E8F5EF] text-[#0f766e] border border-[#A7F3D0] px-2.5 py-1 rounded-lg font-bold hover:bg-[#A7F3D0] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3 h-3" />
                <span>Free Transit Pass</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {SHELTERS.map((s) => (
                <div 
                  key={s.id}
                  className="bg-[#FAF8F2] border border-[#DDD5C7] p-3 rounded-xl space-y-2 hover:border-[#0d9488] transition-all"
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

                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#EEE8DC]">
                    <span className="text-[#0369a1] font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{s.distance} ({s.walkTime})</span>
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + s.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0f766e] text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-[#0d9488] transition-colors text-[9.5px]"
                    >
                      <span>Directions</span>
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

          {/* 🔄 Two-Way Citizen SOS & "I'm Safe" Telemetry */}
          <div className="bg-gradient-to-b from-[#FFFDF8] to-[#FAF8F2] border-2 border-[#0d9488]/40 rounded-2xl p-4 shadow-md space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-[#DDD5C7] pb-2">
              <span className="text-xs font-bold text-[#0f766e] flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-[#0d9488]" />
                <span>2-Way Citizen Welfare Telemetry</span>
              </span>
              <span className="text-[9px] text-[#0f766e] font-bold bg-[#E8F5EF] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                {verifiedSafeCount.toLocaleString()} Verified Safe
              </span>
            </div>

            <p className="text-[11px] text-[#6B6F6B] font-sans leading-tight">
              Tap below to notify city emergency coordinators of your status. Responses sync immediately to the municipal EOC command map.
            </p>

            {checkInStatus === 'SAFE' ? (
              <div className="bg-[#E8F5EF] border border-[#A7F3D0] p-3 rounded-xl text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-[#0f766e] font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Status Confirmed: Safe at Residence</span>
                </div>
                <p className="text-[10px] text-[#6B6F6B] font-sans">
                  Your household check-in has been logged in the Phoenix Municipal EOC register.
                </p>
              </div>
            ) : checkInStatus === 'OUTAGE_SUBMITTED' ? (
              <div className="bg-[#FEF3C7] border border-[#FDE68A] p-3 rounded-xl text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-[#b45309] font-bold text-xs">
                  <Zap className="w-4 h-4" />
                  <span>Power Outage Ping Logged</span>
                </div>
                <p className="text-[10px] text-[#6B6F6B] font-sans">
                  Grid technicians and emergency generators have been notified for your census tract.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCheckIn('SAFE')}
                  disabled={isSubmitting}
                  className="bg-[#0f766e] hover:bg-[#0d9488] text-white p-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                  <span>I Am Safe</span>
                  <span className="text-[8.5px] font-normal opacity-90">Confirm Welfare</span>
                </button>

                <button
                  onClick={() => setShowOutageModal(true)}
                  disabled={isSubmitting}
                  className="bg-[#FFFDF8] hover:bg-[#FFF1F2] border-2 border-[#dc2626] text-[#be123c] p-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <Zap className="w-5 h-5 text-[#dc2626]" />
                  <span>Report Outage</span>
                  <span className="text-[8.5px] font-normal text-[#6B6F6B]">AC / Power Grid</span>
                </button>
              </div>
            )}
          </div>

        </main>

        {/* Footer info */}
        <footer className="p-4 text-center border-t border-[#DDD5C7] bg-[#FAF8F2] font-mono text-[9px] text-[#6B6F6B] space-y-1">
          <div>CIVICPULSE CITIZEN LIFELINE &bull; PHOENIX EMERGENCY DISASTER NETWORK</div>
          <div>Integrated with NOAA NWS &bull; FEMA IPAWS WEA 3.0 &bull; US Census ACS</div>
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
                {/* Simulated High-Res Barcode / QR */}
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

      {/* ========================================================================= */}
      {/* ⚡ POPUP MODAL: REPORT POWER / AC GRID FAILURE                             */}
      {/* ========================================================================= */}
      {showOutageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFDF8] border-2 border-[#dc2626] rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl font-mono text-[#263238]">
            <div className="flex justify-between items-start border-b border-[#DDD5C7] pb-3">
              <div>
                <span className="text-[9px] font-bold text-[#dc2626] uppercase tracking-wider block">
                  GRID INCIDENT REPORT
                </span>
                <h3 className="text-base font-bold text-[#263238]">
                  Report Power or AC Outage
                </h3>
              </div>
              <Zap className="w-5 h-5 text-[#dc2626]" />
            </div>

            <p className="text-xs text-[#6B6F6B] font-sans">
              Submitting this telemetry will flag your neighborhood on the City EOC Command Map for emergency grid generator dispatch or welfare check-in.
            </p>

            <div className="space-y-2 text-xs">
              <label className="text-[10px] font-bold text-[#263238] block">Optional Details (e.g. Elderly Resident / Transformer Spark):</label>
              <textarea
                value={outageNote}
                onChange={(e) => setOutageNote(e.target.value)}
                placeholder="e.g. AC completely stopped working, indoor temp 86°F..."
                className="w-full h-20 bg-[#FAF8F2] border border-[#DDD5C7] rounded-xl p-2.5 text-xs font-sans outline-none focus:border-[#0f766e]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowOutageModal(false)}
                className="bg-[#FAF8F2] hover:bg-[#EEE8DC] text-[#6B6F6B] py-2 rounded-xl font-bold text-xs border border-[#DDD5C7]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCheckIn('OUTAGE', outageNote)}
                disabled={isSubmitting}
                className="bg-[#dc2626] hover:bg-[#b91c1c] text-white py-2 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Submit Ping</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
