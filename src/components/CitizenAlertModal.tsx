"use client";

import { useState } from 'react';
import { LiveZoneTelemetry } from '@/lib/liveWeatherService';
import { 
  Radio, 
  X, 
  Copy, 
  Check, 
  ShieldAlert, 
  MapPin, 
  PhoneCall, 
  Send
} from 'lucide-react';

interface CitizenAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: LiveZoneTelemetry | null;
  intervention?: 'none' | 'cooling_center' | 'medical_deploy' | 'evacuation';
  tacticalPlan?: {
    coolingBuses: number;
    gridGenerators: number;
    paramedicSurge: number;
  };
}

export default function CitizenAlertModal({
  isOpen,
  onClose,
  zone,
  tacticalPlan = { coolingBuses: 8, gridGenerators: 4, paramedicSurge: 6 }
}: CitizenAlertModalProps) {
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [copied, setCopied] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

  if (!isOpen || !zone) return null;

  const tempF = zone.temperatureF !== null ? `${zone.temperatureF}°F` : '95°F';
  const tempC = zone.temperatureC !== null ? `${zone.temperatureC}°C` : '35°C';
  const elderlyCount = Math.round(zone.population * (zone.elderlyPopulationPct / 100)).toLocaleString();

  // Dynamic tactical action text
  const buses = tacticalPlan.coolingBuses;
  const medics = tacticalPlan.paramedicSurge;
  const generators = tacticalPlan.gridGenerators;

  const actionEnglish = `${buses > 0 ? `❄️ ${buses} Mobile AC Cooling Buses deployed at transit hubs & parks. ` : ''}${medics > 0 ? `🚑 ${medics} Paramedic Street Triage teams active with free cold hydration & ice baths. ` : ''}${generators > 0 ? `⚡ ${generators} Backup Generators active to prevent neighborhood blackouts.` : ''}`;
  const actionSpanish = `${buses > 0 ? `❄️ ${buses} Autobuses con aire acondicionado desplegados en paradas y parques. ` : ''}${medics > 0 ? `🚑 ${medics} Equipos paramédicos activos con hidratación y baños fríos gratuitos. ` : ''}${generators > 0 ? `⚡ ${generators} Generadores de respaldo activos para proteger la red eléctrica.` : ''}`;

  const alertEnglish = `🚨 CIVICPULSE EMERGENCY CITIZEN ALERT
Location: ${zone.name}, ${zone.metro}
Hazard: Extreme Urban Heatwave (${tempF} / ${tempC})
Status: Thermal Stress Level CRITICAL

${actionEnglish}

Stay indoors, drink plenty of water, and check on elderly neighbors.
• Nearest Shelter: Central Civic Hub & Public Library
• Free City Assistance: Call 311 or 911 in medical emergency.
Broadcast Protocol: FEMA IPAWS / Wireless Emergency Alerts (WEA)`;

  const alertSpanish = `🚨 ALERTA DE EMERGENCIA CIVICPULSE
Ubicación: ${zone.name}, ${zone.metro}
Peligro: Ola de Calor Extremo (${tempF} / ${tempC})
Estado: Nivel de Estrés Térmico CRÍTICO

${actionSpanish}

Permanezca en interiores, beba agua y revise a sus familiares mayores.
• Refugio más cercano: Centro Cívico Central y Biblioteca
• Asistencia gratuita de la ciudad: Llame al 311 o al 911 en emergencias.
Protocolo: FEMA IPAWS / Alertas Móviles de Emergencia`;

  const currentAlertText = language === 'en' ? alertEnglish : alertSpanish;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentAlertText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerBroadcast = () => {
    setIsBroadcasting(true);
    setTimeout(() => {
      setIsBroadcasting(false);
      setBroadcastSent(true);
      setTimeout(() => setBroadcastSent(false), 4000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b101c] border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col font-sans">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#0e1626] border-b border-[#1e2d42] flex items-center justify-between font-mono">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white uppercase tracking-wide">
                  Citizen Emergency Mobile Broadcast Simulator
                </span>
                <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded-full font-bold">
                  FEMA WEA 3.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Direct wireless push & SMS notification sent to every resident in {zone.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#162032] transition-colors cursor-pointer"
            title="Close Alert Simulator"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2-Column (Phone Mockup + Broadcast Controls) */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
          
          {/* Left: Realistic Smartphone Push Notification Screen */}
          <div className="flex justify-center">
            <div className="w-[280px] bg-slate-950 border-4 border-slate-800 rounded-[36px] p-3 shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden font-sans">
              
              {/* Phone Speaker Notch */}
              <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-slate-900 mr-2" />
                <div className="w-10 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* Status Bar */}
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 px-2 mb-3">
                <span>12:15 PM</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <span className="w-3 h-2 bg-slate-400 rounded-sm inline-block" />
                </div>
              </div>

              {/* Emergency Lockscreen Notification Card */}
              <div className="bg-[#180a0e]/95 border-2 border-rose-500/80 rounded-2xl p-3 shadow-xl space-y-2 relative overflow-hidden animate-pulse">
                
                {/* Emergency Header */}
                <div className="flex items-center justify-between border-b border-rose-900/60 pb-1.5">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[10px] font-mono">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>EMERGENCY ALERT</span>
                  </div>
                  <span className="text-[8.5px] text-slate-400 font-mono">NOW</span>
                </div>

                {/* Body Text */}
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold text-white leading-tight">
                    {language === 'en' ? 'EXTREME HEAT WARNING' : 'ADVERTENCIA DE CALOR EXTREMO'}
                  </h4>
                  <p className="text-[9.5px] text-slate-200 leading-relaxed font-sans">
                    {language === 'en' ? (
                      <>
                        <strong>{tempF} ({tempC})</strong> in {zone.name}. {actionEnglish} Call <strong>311</strong> for free transit to cooled centers.
                      </>
                    ) : (
                      <>
                        <strong>{tempF} ({tempC})</strong> en {zone.name}. {actionSpanish} Llame al <strong>311</strong> para transporte gratuito.
                      </>
                    )}
                  </p>
                </div>

                {/* Quick Action Buttons inside Notification */}
                <div className="pt-1.5 border-t border-rose-900/40 grid grid-cols-2 gap-1 text-[9px] font-mono">
                  <button className="bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 py-1 rounded text-center font-semibold flex items-center justify-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-rose-400" />
                    <span>{language === 'en' ? 'Cooling Map' : 'Ver Mapa'}</span>
                  </button>
                  <button className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 py-1 rounded text-center font-semibold flex items-center justify-center gap-1">
                    <PhoneCall className="w-2.5 h-2.5 text-[#00e5a3]" />
                    <span>{language === 'en' ? 'Call 311' : 'Llamar 311'}</span>
                  </button>
                </div>
              </div>

              {/* Home Bar */}
              <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-6" />
            </div>
          </div>

          {/* Right: Broadcast Control Console & Target Analytics */}
          <div className="space-y-4 font-mono text-xs">
            
            {/* Language Selector */}
            <div className="bg-[#0e1626] p-3 rounded-2xl border border-[#1e2d42] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Broadcast Language:
                </span>
                <div className="flex items-center bg-[#080d17] p-0.5 rounded-xl border border-[#1e2d42]">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      language === 'en' ? 'bg-[#00e5a3]/20 text-[#00e5a3] border border-[#00e5a3]/50' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🇺🇸 English
                  </button>
                  <button
                    onClick={() => setLanguage('es')}
                    className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      language === 'es' ? 'bg-[#00e5a3]/20 text-[#00e5a3] border border-[#00e5a3]/50' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🇪🇸 Español
                  </button>
                </div>
              </div>

              <div className="text-[10.5px] text-slate-300 font-sans leading-relaxed bg-[#080d17] p-2.5 rounded-xl border border-[#1e2d42]">
                Multi-lingual Wireless Emergency Alerts automatically route to all mobile carriers (Verizon, AT&T, T-Mobile) based on handset preferred language.
              </div>
            </div>

            {/* Target Audience Reach Stats */}
            <div className="bg-[#0e1626] p-3 rounded-2xl border border-[#1e2d42] space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Target Zone Wireless Delivery Reach:
              </span>
              
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-[#080d17] p-2.5 rounded-xl border border-[#1e2d42]">
                  <span className="text-slate-500 block text-[8.5px]">TOTAL RESIDENT REACH</span>
                  <strong className="text-white text-sm">{zone.population.toLocaleString()}</strong>
                  <span className="text-[8px] text-[#00e5a3] block mt-0.5">● 4 Cell Towers Locked</span>
                </div>

                <div className="bg-[#080d17] p-2.5 rounded-xl border border-[#1e2d42]">
                  <span className="text-slate-500 block text-[8.5px]">SENIORS PRIORITIZED (ACS)</span>
                  <strong className="text-[#00e5a3] text-sm">{elderlyCount}</strong>
                  <span className="text-[8px] text-[#00f2fe] block mt-0.5">({zone.elderlyPopulationPct}% of Pop)</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleTriggerBroadcast}
                disabled={isBroadcasting}
                className={`w-full py-2.5 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                  broadcastSent
                    ? 'bg-emerald-600 text-white border border-emerald-400'
                    : 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-500 text-white border border-rose-400 shadow-rose-900/30'
                }`}
              >
                {isBroadcasting ? (
                  <>
                    <Radio className="w-4 h-4 animate-spin text-white" />
                    <span>Broadcasting to Cell Towers...</span>
                  </>
                ) : broadcastSent ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>✓ Broadcast Sent to {zone.population.toLocaleString()} Citizens!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    <span>📢 Dispatch Neighborhood Wireless Alert</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCopy}
                className="w-full py-1.5 rounded-xl bg-[#080d17] hover:bg-[#162032] border border-[#1e2d42] text-slate-300 font-mono text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-[#00e5a3]" /> : <Copy className="w-3 h-3 text-slate-400" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Alert Text for Press Release'}</span>
              </button>
            </div>

          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-[#080d17] border-t border-[#1e2d42] flex items-center justify-between text-[9px] font-mono text-slate-400">
          <span>FEDERAL PROTOCOL: FCC & FEMA Integrated Public Alert and Warning System (IPAWS)</span>
          <span className="text-[#00e5a3] font-bold">ACTIVE WIRELESS CELL BROADCAST READY</span>
        </div>

      </div>
    </div>
  );
}
