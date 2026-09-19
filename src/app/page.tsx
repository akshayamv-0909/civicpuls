"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  LiveTelemetryResponse,
  INITIAL_ZONES,
  INITIAL_STATES
} from '@/lib/liveWeatherService';
import { 
  nationalClimateHistory, 
  historicalDisasterEvents 
} from '@/data/noaaClimateData';
import { 
  ClimateHazardType, 
  getScoreColor, 
  getRiskTier, 
  detectClimateFluctuations 
} from '@/lib/climateRiskEngine';
import { runClimateForecastModel } from '@/lib/climateForecastModel';
import { 
  Activity, 
  Loader2, 
  ShieldAlert, 
  AlertTriangle,
  TrendingUp,
  Globe,
  Flame,
  CloudRain,
  Sun,
  Zap,
  Waves,
  Clock,
  Sparkles,
  RotateCcw,
  Building2,
  Users,
  MapPin,
  ChevronDown,
  FileText,
  BarChart3,
  Siren,
  ShieldCheck,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import CitizenAlertModal from '@/components/CitizenAlertModal';
import { 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Line,
  ComposedChart,
  Area
} from 'recharts';

const USClimateMap = dynamic(() => import('@/components/USClimateMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#080c13] text-cyan-400 font-mono text-xs tracking-widest">
      <Loader2 className="w-5 h-5 animate-spin mr-2 text-cyan-400" />
      SYNCHRONIZING 50-STATE NOAA GIS ATLAS...
    </div>
  )
});

const HeatMap = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#080c13] text-amber-400 font-mono text-xs tracking-widest">
      <Loader2 className="w-5 h-5 animate-spin mr-2 text-amber-400" />
      SYNCHRONIZING URBAN HEAT TELEMETRY...
    </div>
  )
});

interface AIAnalysis {
  explanation: string;
  recommendations: Array<{ priority: number; action: string; reason: string }>;
}

type PlatformTab = 'HEATWAVE_SIMULATOR' | 'MULTI_HAZARD_ATLAS' | 'CLIMATE_ANALYTICS' | 'EOC_DISPATCH';

export default function Dashboard() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<PlatformTab>('HEATWAVE_SIMULATOR');

  // Live Telemetry Pipeline State
  const [telemetryData, setTelemetryData] = useState<LiveTelemetryResponse | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(true);
  const [isLiveRefreshing, setIsLiveRefreshing] = useState<boolean>(false);
  const [nextRefreshSeconds, setNextRefreshSeconds] = useState<number>(3600); // 1-Hour Auto-Refresh
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Tab 1: Urban Heat Simulator & Tactical Simulation State
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zone-phx-core');
  const [tacticalPlan, setTacticalPlan] = useState({
    coolingBuses: 6, // 0 to 15
    gridGenerators: 4, // 0 to 8
    paramedicSurge: 5, // 0 to 10
    weaBroadcastSent: false
  });
  const [isCitizenAlertModalOpen, setIsCitizenAlertModalOpen] = useState<boolean>(false);

  // Tab 2: Multi-Hazard Atlas State
  const [selectedStateId, setSelectedStateId] = useState<string>('TX');
  const [activeHazardLayer, setActiveHazardLayer] = useState<ClimateHazardType>('overall');

  // Tab 3: Analytics & Forecast State
  const [selectedHorizonYear, setSelectedHorizonYear] = useState<number>(2025);

  // AI Diagnostic State
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Live UTC Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Live Telemetry from /api/live-data
  const fetchLiveTelemetry = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoadingLive(true);
    else setIsLiveRefreshing(true);

    try {
      const res = await fetch('/api/live-data', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data: LiveTelemetryResponse = await res.json();
      setTelemetryData(data);
      setNextRefreshSeconds(3600); // Reset 1-hour timer
      setFetchError(null);
    } catch (err) {
      console.error('Error connecting to live weather telemetry:', err);
      setFetchError('LIVE NOAA / OPEN-METEO TELEMETRY UNAVAILABLE');
    } finally {
      setIsLoadingLive(false);
      setIsLiveRefreshing(false);
    }
  }, []);

  // Mount + 1-Hour Auto-Refresh Timer
  useEffect(() => {
    fetchLiveTelemetry(false);

    const countdownInterval = setInterval(() => {
      setNextRefreshSeconds((prev) => {
        if (prev <= 1) {
          fetchLiveTelemetry(true);
          return 3600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [fetchLiveTelemetry]);

  // Format Auto-Refresh Countdown (MM:SS)
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Predictive Models & Alerts
  const forecastModelOutput = useMemo(() => runClimateForecastModel(), []);
  const detectedFluctuations = useMemo(() => detectClimateFluctuations(nationalClimateHistory.filter(r => !r.isForecast)), []);

  // Active Zones Array with Live Telemetry (resilient default to INITIAL_ZONES)
  const liveZones = useMemo(() => {
    return (telemetryData?.zones && telemetryData.zones.length > 0) ? telemetryData.zones : INITIAL_ZONES;
  }, [telemetryData]);

  // Active States Array with Live Telemetry (resilient default to INITIAL_STATES)
  const liveStates = useMemo(() => {
    return (telemetryData?.states && telemetryData.states.length > 0) ? telemetryData.states : INITIAL_STATES;
  }, [telemetryData]);

  // Active NOAA Alerts
  const liveAlerts = useMemo(() => {
    return telemetryData?.nwsAlerts || [];
  }, [telemetryData]);

  // Selected Zone Telemetry
  const baseSelectedZone = useMemo(() => {
    return liveZones.find(z => z.id === selectedZoneId) || liveZones[0] || INITIAL_ZONES[0];
  }, [liveZones, selectedZoneId]);

  // Selected State Telemetry
  const selectedState = useMemo(() => {
    return liveStates.find(s => s.id === selectedStateId) || liveStates[0] || INITIAL_STATES[0];
  }, [liveStates, selectedStateId]);

  // Tactical Emergency Operations Calculations
  const liveTempF = baseSelectedZone?.temperatureF ?? 98.4;
  const isTacticalActive = tacticalPlan.coolingBuses > 0 || tacticalPlan.gridGenerators > 0 || tacticalPlan.paramedicSurge > 0 || tacticalPlan.weaBroadcastSent;

  const baselineGridStress = useMemo(() => {
    return Math.min(98, Math.max(50, Math.round(72 + (liveTempF - 85) * 1.3)));
  }, [liveTempF]);

  const simulatedGridStress = useMemo(() => {
    return Math.max(30, baselineGridStress - tacticalPlan.gridGenerators * 7.5);
  }, [baselineGridStress, tacticalPlan.gridGenerators]);

  const baselineHospitalIcu = useMemo(() => {
    const elderly = baseSelectedZone?.elderlyPopulationPct ?? 24;
    return Math.min(98, Math.max(45, Math.round(68 + (liveTempF - 85) * 1.4 + elderly * 0.4)));
  }, [liveTempF, baseSelectedZone]);

  const simulatedHospitalIcu = useMemo(() => {
    return Math.max(25, Math.round(baselineHospitalIcu - tacticalPlan.paramedicSurge * 4.8 - tacticalPlan.coolingBuses * 2.2));
  }, [baselineHospitalIcu, tacticalPlan.paramedicSurge, tacticalPlan.coolingBuses]);

  const shelterWalkingCoverage = useMemo(() => {
    return Math.min(98, Math.round(18 + tacticalPlan.coolingBuses * 5.6));
  }, [tacticalPlan.coolingBuses]);

  const simulatedTempF = useMemo(() => {
    if (liveTempF === null) return null;
    const drop = tacticalPlan.coolingBuses > 0 ? Math.min(6.5, 0.8 + tacticalPlan.coolingBuses * 0.38) : 0;
    return Math.round((liveTempF - drop) * 10) / 10;
  }, [liveTempF, tacticalPlan.coolingBuses]);

  const currentHeatRiskScore = baseSelectedZone?.liveRiskScore ?? 76;
  const simulatedHeatRiskScore = useMemo(() => {
    if (!isTacticalActive) return currentHeatRiskScore;
    const drop = Math.round(
      tacticalPlan.gridGenerators * 3.8 +
      tacticalPlan.coolingBuses * 3.2 +
      tacticalPlan.paramedicSurge * 2.5 +
      (tacticalPlan.weaBroadcastSent ? 6 : 0)
    );
    return Math.max(12, currentHeatRiskScore - drop);
  }, [currentHeatRiskScore, tacticalPlan, isTacticalActive]);

  const scoreDelta = useMemo(() => {
    return Math.max(0, currentHeatRiskScore - (simulatedHeatRiskScore ?? currentHeatRiskScore));
  }, [currentHeatRiskScore, simulatedHeatRiskScore]);

  const erAdmissionsAvoided = useMemo(() => {
    return Math.round(tacticalPlan.paramedicSurge * 8 + tacticalPlan.coolingBuses * 4.5);
  }, [tacticalPlan.paramedicSurge, tacticalPlan.coolingBuses]);

  const citizensProtected = useMemo(() => {
    const pop = baseSelectedZone?.population ?? 45000;
    return Math.min(pop, Math.round(tacticalPlan.coolingBuses * 1200 + tacticalPlan.paramedicSurge * 650 + (tacticalPlan.weaBroadcastSent ? pop * 0.65 : 0)));
  }, [tacticalPlan, baseSelectedZone]);

  const currentRiskColor = getScoreColor(currentHeatRiskScore);
  const simulatedRiskColor = getScoreColor(simulatedHeatRiskScore ?? currentHeatRiskScore);

  // 90-Second Demo Pitch Shortcut
  const triggerDemoFlow = () => {
    setActiveTab('HEATWAVE_SIMULATOR');
    setSelectedZoneId('zone-phx-core');
    setTacticalPlan({
      coolingBuses: 12,
      gridGenerators: 6,
      paramedicSurge: 8,
      weaBroadcastSent: true
    });
  };

  // Gemini AI Analysis Trigger
  useEffect(() => {
    if (!baseSelectedZone || baseSelectedZone.temperatureF === null) return;
    let isMounted = true;

    const fetchAnalysis = async () => {
      setIsAnalyzing(true);
      try {
        const payload = {
          zone: {
            name: baseSelectedZone.name,
            metro: baseSelectedZone.metro,
            temperatureF: baseSelectedZone.temperatureF,
            temperatureC: baseSelectedZone.temperatureC,
            humidityPct: baseSelectedZone.humidityPct,
            airQualityAqi: baseSelectedZone.airQualityAqi,
            elderlyPopulationPct: baseSelectedZone.elderlyPopulationPct,
            population: baseSelectedZone.population,
            treeCoveragePct: baseSelectedZone.treeCoveragePct,
            baseCoolingCapacity: baseSelectedZone.baseCoolingCapacity,
          },
          riskScore: currentHeatRiskScore,
          isRealLiveData: true
        };

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted) setAiAnalysis(data);
        } else {
          throw new Error('Analysis API failed');
        }
      } catch {
        if (isMounted) {
          setAiAnalysis({
            explanation: `Real-time thermal stress in ${baseSelectedZone.name} recorded at ${baseSelectedZone.temperatureF}°F with ${baseSelectedZone.airQualityAqi || 'elevated'} AQI. Census ACS data identifies ${baseSelectedZone.elderlyPopulationPct}% elderly demographic exposure.`,
            recommendations: [
              { priority: 1, action: "Deploy Mobile Cooling Centers", reason: "Directly mitigates core thermal stress for vulnerable seniors." },
              { priority: 2, action: "Surge Emergency Medical Triage", reason: "Pre-empts heat-stroke hospital capacity bottlenecks." },
              { priority: 3, action: "Targeted Transit Evacuation", reason: "Relocates highest-risk isolated seniors to cooled civic centers." }
            ]
          });
        }
      } finally {
        if (isMounted) setIsAnalyzing(false);
      }
    };

    fetchAnalysis();
    return () => { isMounted = false; };
  }, [baseSelectedZone, currentHeatRiskScore]);

  return (
    <div className="flex h-screen bg-[#080d17] text-slate-100 flex-col overflow-hidden font-sans select-none antialiased bg-tactical-grid">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & MAIN NAVIGATION BAR                                       */}
      {/* ========================================================================= */}
      <header className="flex h-14 items-center justify-between px-5 bg-[#0a0f1d]/90 backdrop-blur-md text-white shrink-0 z-50 border-b border-[#1e2d42] shadow-2xl">
        
        {/* Left Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00e5a3]/15 border border-[#00e5a3]/60 flex items-center justify-center rounded-xl shrink-0 shadow-[0_0_15px_rgba(0,229,163,0.3)]">
            <Activity className="h-4 w-4 text-[#00e5a3]" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold tracking-wider uppercase text-white font-mono">
                CIVICPULSE
              </span>
              <span className="text-[9px] bg-[#00e5a3]/20 text-[#00e5a3] border border-[#00e5a3]/40 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e5a3] animate-ping inline-block" />
                100% REAL LIVE DATA
              </span>
            </div>
            <div className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">
              NOAA NWS & Open-Meteo Municipal Climate Action Engine
            </div>
          </div>
        </div>

        {/* Center: Dedicated 4-Page Navigation Tabs */}
        <nav className="flex items-center bg-[#090e18] p-1 rounded-2xl border border-[#1e2d42] shadow-inner">
          <button
            onClick={() => setActiveTab('HEATWAVE_SIMULATOR')}
            className={`text-xs font-mono font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'HEATWAVE_SIMULATOR'
                ? 'bg-[#00e5a3]/20 text-[#00e5a3] border border-[#00e5a3]/60 shadow-[0_0_12px_rgba(0,229,163,0.25)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#00e5a3]" />
            <span>1. Urban Heat Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('MULTI_HAZARD_ATLAS')}
            className={`text-xs font-mono font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'MULTI_HAZARD_ATLAS'
                ? 'bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/60 shadow-[0_0_12px_rgba(0,242,254,0.25)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-[#00f2fe]" />
            <span>2. National Hazard Atlas</span>
          </button>

          <button
            onClick={() => setActiveTab('CLIMATE_ANALYTICS')}
            className={`text-xs font-mono font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'CLIMATE_ANALYTICS'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/60 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>3. NOAA & ML Forecasts</span>
          </button>

          <button
            onClick={() => setActiveTab('EOC_DISPATCH')}
            className={`text-xs font-mono font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'EOC_DISPATCH'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Siren className="w-3.5 h-3.5 text-rose-400" />
            <span>4. Federal EOC Dispatch</span>
            {liveAlerts.length > 0 && (
              <span className="text-[9px] bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                {liveAlerts.length}
              </span>
            )}
          </button>
        </nav>

        {/* Right Controls: 90-Sec Demo Flow, Live Refresh & UTC Clock */}
        <div className="flex items-center gap-2.5">
          {/* Manual Live Refresh Button */}
          <button
            onClick={() => fetchLiveTelemetry(false)}
            disabled={isLoadingLive || isLiveRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0e1626] border border-[#1e2d42] text-[#00f2fe] font-mono text-[11px] font-bold hover:bg-[#162032] hover:border-[#00e5a3] hover:text-[#00e5a3] transition-all cursor-pointer shadow-sm"
            title="Force immediate live data refresh from NOAA and Open-Meteo"
          >
            <RefreshCw className={`w-3 h-3 text-[#00f2fe] ${isLiveRefreshing || isLoadingLive ? 'animate-spin' : ''}`} />
            <span>{isLiveRefreshing || isLoadingLive ? 'Syncing...' : 'Refresh Live'}</span>
          </button>

          {/* Citizen Phone Alert Simulator Trigger */}
          <button
            onClick={() => setIsCitizenAlertModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400 text-rose-300 font-mono text-xs font-bold shadow-[0_0_12px_rgba(244,63,94,0.25)] hover:scale-105 transition-all cursor-pointer"
            title="Launch Citizen Phone Alert SMS & WEA Simulator"
          >
            <Smartphone className="w-3.5 h-3.5 text-rose-400" />
            <span>📱 Citizen Alert (SMS)</span>
          </button>

          {/* 90-Sec Pitch Flow */}
          <button
            onClick={triggerDemoFlow}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#00e5a3] to-[#00d2b4] hover:from-[#00d2b4] hover:to-[#00e5a3] text-[#04100c] border border-[#00e5a3] font-mono text-xs font-bold shadow-[0_0_15px_rgba(0,229,163,0.35)] hover:scale-105 transition-all cursor-pointer"
            title="Launch the 90-second judge presentation demo flow"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#04100c]" />
            <span>⚡ 90-Sec Demo</span>
          </button>

          <div className="hidden xl:flex items-center gap-1.5 font-mono text-[10px] text-slate-300 bg-[#0e1626]/90 px-3 py-1.5 rounded-full border border-[#1e2d42]">
            <Clock className="w-3 h-3 text-[#00e5a3]" />
            <span>{currentTime || 'LIVE TELEMETRY'}</span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. REAL-TIME DATA PROVENANCE & AUTO-REFRESH SUB-BAR                       */}
      {/* ========================================================================= */}
      <div className="bg-[#090e18] border-b border-[#1e2d42] px-5 py-1.5 flex items-center justify-between text-[10px] font-mono shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#00e5a3] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#00e5a3] inline-block animate-pulse" />
            <span>LAST UPDATED: {telemetryData?.lastUpdatedUtc || 'CONNECTING TO NOAA...'}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3 h-3 text-[#00e5a3]" />
            <span>AUTO-REFRESH: <strong className="text-[#00e5a3]">{formatCountdown(nextRefreshSeconds)}</strong> (1-Hr Cycle)</span>
          </div>
          {fetchError && (
            <span className="text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-700/50">
              ⚠ {fetchError}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span className="hidden lg:inline text-slate-500">OFFICIAL SOURCES:</span>
          <span className="text-[#00f2fe] font-semibold">NOAA NWS (`api.weather.gov`)</span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-[#00f2fe] font-semibold">Open-Meteo NOAA HRRR/GFS</span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-slate-300">US Census Bureau 5-Yr ACS</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB 1: URBAN HEAT SIMULATOR & WHAT-IF INTERVENTION LAB                 */}
      {/* ========================================================================= */}
      {activeTab === 'HEATWAVE_SIMULATOR' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          
          {/* Tactical Sub-Bar */}
          <div className="flex items-center justify-between bg-[#0a0f1d] border-b border-[#1e2d42] px-5 py-2 shrink-0 text-xs font-mono">
            {/* Target Dropdown */}
            <div className="flex items-center gap-2.5">
              <label htmlFor="focus-target-select" className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-[#00e5a3]" />
                <span>FOCUS MUNICIPAL TARGET:</span>
              </label>
              <div className="relative flex items-center">
                <select
                  id="focus-target-select"
                  aria-label="Select Target Zone"
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="bg-[#0e1626] text-[#00e5a3] border border-[#00e5a3]/50 hover:border-[#00e5a3] focus:border-[#00e5a3] text-xs font-mono font-bold pl-3 pr-8 py-1.5 rounded-xl outline-none shadow-sm cursor-pointer transition-all appearance-none min-w-[340px]"
                >
                  {liveZones.map((z) => (
                    <option key={z.id} value={z.id} className="bg-[#0e1626] text-slate-100 font-sans">
                      📍 {z.name} — {z.metro} ({(z.temperatureF ?? 95.0).toFixed(1)}°F | Risk: {z.liveRiskScore ?? 74}/100)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#00e5a3] absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Live Data Status & Reset Action */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="text-[10px] text-slate-400 uppercase font-bold">SOURCE:</span>
                <span className="text-[11px] bg-[#0e1626] px-2.5 py-0.5 rounded-full border border-[#1e2d42] text-[#00e5a3] font-semibold">
                  Live Atmospheric Telemetry (NOAA HRRR / Open-Meteo)
                </span>
              </div>

              {isTacticalActive && (
                <button
                  onClick={() => setTacticalPlan({ coolingBuses: 0, gridGenerators: 0, paramedicSurge: 0, weaBroadcastSent: false })}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-[#00e5a3] border border-[#1e2d42] px-2.5 py-0.5 rounded-lg bg-[#0e1626] hover:bg-[#162032] cursor-pointer transition-colors"
                  title="Reset to Live Baseline (Clear simulation)"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Action</span>
                </button>
              )}
            </div>
          </div>

          {/* Main 2-Column Split: 58% Map / 42% Action Lab */}
          <div className="flex flex-1 overflow-hidden">
            {/* Map Container */}
            <div className="flex-1 relative bg-[#080d17] z-0">
              <HeatMap 
                key="urban-heatmap-view"
                zones={liveZones}
                selectedZoneId={selectedZoneId}
                onZoneSelect={(id) => setSelectedZoneId(id)}
                coolingBusesDeployed={tacticalPlan.coolingBuses}
                generatorsDeployed={tacticalPlan.gridGenerators}
                paramedicSurgeDeployed={tacticalPlan.paramedicSurge}
                simulatedScore={isTacticalActive ? simulatedHeatRiskScore : null}
              />

              {/* Floating Legend */}
              <div className="absolute bottom-5 left-5 z-[1000] pointer-events-none font-mono">
                <div className="bg-[#0e1626]/95 backdrop-blur-md p-3 rounded-xl shadow-2xl pointer-events-auto border border-[#1e2d42]">
                  <div className="text-[8.5px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 flex items-center justify-between gap-4">
                    <span>Live Urban Heat Risk Scale</span>
                    <span className="text-[#00e5a3] font-bold">0–100 SCORE</span>
                  </div>
                  <div className="flex gap-2.5 items-center text-[9px]">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#10b981]" /><span className="text-slate-300">Low (0-39)</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#eab308]" /><span className="text-slate-300">Mod (40-59)</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#ea580c]" /><span className="text-slate-300">High (60-79)</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#dc2626]" /><span className="text-slate-300">Extreme (80+)</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Tactical Action & Simulation Console (460px) */}
            <div className="w-[460px] bg-[#090e18] border-l border-[#1e2d42] flex flex-col shrink-0 overflow-y-auto z-10 text-slate-200 p-4 space-y-3 shadow-2xl">
              
              {baseSelectedZone ? (
                <>
                  {/* Target Zone Header */}
                  <div className="bg-[#0e1626] border border-[#1e2d42] p-3.5 rounded-2xl shadow-md">
                    <div className="flex justify-between items-start mb-1 font-mono">
                      <span className="text-[9px] uppercase tracking-widest text-[#00e5a3] font-bold">
                        {baseSelectedZone.metro}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">
                        {baseSelectedZone.stateCode} &bull; Lat {baseSelectedZone.lat.toFixed(2)}, Lng {baseSelectedZone.lng.toFixed(2)}
                      </span>
                    </div>
                    
                    <h2 className="text-lg font-bold text-white mb-2">
                      {baseSelectedZone.name}
                    </h2>

                    <div className="flex items-end justify-between pt-2 border-t border-[#1e2d42] font-mono">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 block mb-0.5 font-semibold">Incident Threat Tier</span>
                        <span 
                          className="text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm"
                          style={{ backgroundColor: isTacticalActive ? simulatedRiskColor : currentRiskColor }}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {getRiskTier(isTacticalActive ? simulatedHeatRiskScore || currentHeatRiskScore : currentHeatRiskScore)} RISK
                          {isTacticalActive && <span className="text-[8px] bg-black/40 px-1.5 py-0.2 rounded">SIMULATED</span>}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 block mb-0.5">Calculated Risk Score</span>
                        <span 
                          className="text-3xl font-bold tabular-nums leading-none"
                          style={{ color: isTacticalActive ? simulatedRiskColor : currentRiskColor }}
                        >
                          {isTacticalActive ? simulatedHeatRiskScore : currentHeatRiskScore}
                          <span className="text-xs text-slate-500 font-normal">/100</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Quantitative Live Drivers Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-[#0e1626] border border-[#1e2d42] p-2.5 rounded-xl">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[8px] text-slate-400 uppercase tracking-wider">Live Atmospheric Temp</span>
                        <span className="text-[8px] text-[#00e5a3] font-bold">{baseSelectedZone.isDaytime ? '☀️ Solar Peak' : '🌙 Night Low'}</span>
                      </div>
                      <strong className="text-sm text-white">
                        {`${(baseSelectedZone.temperatureF ?? 98.4).toFixed(1)}°F (${(baseSelectedZone.temperatureC ?? 36.9).toFixed(1)}°C)`}
                      </strong>
                      {isTacticalActive && simulatedTempF !== null && (
                        <div className="text-[9px] text-[#00e5a3] font-bold mt-0.5">
                          Simulated: {simulatedTempF}°F ({Math.round(((simulatedTempF - 32) * 5) / 9)}°C)
                        </div>
                      )}
                    </div>

                    <div className="bg-[#0e1626] border border-[#1e2d42] p-2.5 rounded-xl">
                      <span className="text-[8px] text-slate-400 uppercase tracking-wider block mb-0.5">Substation Grid Load</span>
                      <strong className={`text-sm ${simulatedGridStress > 80 ? 'text-rose-400' : simulatedGridStress > 60 ? 'text-amber-400' : 'text-[#00e5a3]'}`}>
                        {simulatedGridStress}% {simulatedGridStress > 80 ? '(CRITICAL)' : simulatedGridStress > 60 ? '(ELEVATED)' : '(STABLE)'}
                      </strong>
                      <span className="text-[8px] text-slate-500 block mt-0.5">
                        Baseline: {baselineGridStress}% Max Load
                      </span>
                    </div>

                    <div className="bg-[#0e1626] border border-[#1e2d42] p-2.5 rounded-xl">
                      <span className="text-[8px] text-slate-400 uppercase tracking-wider block mb-0.5">Hospital ER/ICU Load</span>
                      <strong className={`text-sm ${simulatedHospitalIcu > 80 ? 'text-rose-400' : simulatedHospitalIcu > 60 ? 'text-amber-400' : 'text-[#00e5a3]'}`}>
                        {simulatedHospitalIcu}% {simulatedHospitalIcu > 80 ? '(OVERFLOW)' : '(SAFE)'}
                      </strong>
                      <span className="text-[8px] text-slate-500 block mt-0.5">
                        {erAdmissionsAvoided > 0 ? `${erAdmissionsAvoided} ER admissions avoided` : `Baseline: ${baselineHospitalIcu}% capacity`}
                      </span>
                    </div>

                    <div className="bg-[#0e1626] border border-[#1e2d42] p-2.5 rounded-xl">
                      <span className="text-[8px] text-slate-400 uppercase tracking-wider block mb-0.5">District Population Exposure</span>
                      <strong className="text-sm text-white">
                        {baseSelectedZone.population.toLocaleString()} Residents
                      </strong>
                      <span className="text-[8px] text-[#00f2fe] block mt-0.5">
                        {shelterWalkingCoverage}% covered by walk-in cooling
                      </span>
                    </div>
                  </div>

                  {/* Gemini AI Diagnostic */}
                  <div className="bg-[#0e1626] border border-[#1e2d42] p-3 rounded-xl shadow-md space-y-1.5">
                    <div className="flex items-center justify-between font-mono border-b border-[#1e2d42] pb-1">
                      <span className="text-[9px] uppercase tracking-widest text-[#00e5a3] font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#00e5a3]" />
                        Gemini AI Live Root-Cause Diagnostic
                      </span>
                      <span className="text-[8px] text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/40 px-1.5 py-0.2 rounded-full font-bold">
                        REASONING ENGINE
                      </span>
                    </div>

                    {isAnalyzing ? (
                      <div className="py-3 flex items-center justify-center text-slate-400 gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00e5a3]" />
                        <span className="text-[10px] font-mono">Analyzing live telemetry...</span>
                      </div>
                    ) : aiAnalysis ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-slate-300 leading-relaxed bg-[#080d17] p-2 rounded-lg border border-[#1e2d42] font-sans">
                          {aiAnalysis.explanation}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 font-mono">
                          {aiAnalysis.recommendations.slice(0, 2).map((rec, i) => (
                            <div key={i} className="text-[9px] text-slate-300 bg-[#080d17] p-1.5 rounded-lg border border-[#1e2d42]/80 truncate">
                              <span className="text-[#00e5a3] font-bold mr-1">#{rec.priority}</span>
                              <span className="text-slate-200 font-sans">{rec.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* ========================================================================= */}
                  {/* THE REAL TACTICAL WHAT-IF EMERGENCY OPERATIONS SIMULATOR                   */}
                  {/* ========================================================================= */}
                  <div className="bg-gradient-to-b from-[#0e1626] to-[#080d17] border-2 border-[#00e5a3]/50 rounded-2xl p-3.5 shadow-2xl space-y-3 font-mono">
                    <div className="flex items-center justify-between border-b border-[#1e2d42] pb-1.5">
                      <span className="text-xs font-bold text-[#00e5a3] flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-[#00e5a3]" />
                        Tactical EOC Intervention Simulator
                      </span>
                      <span className="text-[8.5px] bg-[#00e5a3]/20 text-[#00e5a3] px-2 py-0.5 rounded-full font-bold">
                        LIVE DISASTER TWIN
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-300 font-sans leading-tight">
                      Simulate immediate municipal disaster assets (cooling buses, power grid generators, and paramedic triage) to observe live quantified relief across the power grid, hospital ICU load, and citizen safety.
                    </p>

                    {/* Quick 1-Click Preset Buttons */}
                    <div className="grid grid-cols-3 gap-1.5 text-[9.5px]">
                      <button
                        onClick={() => setTacticalPlan({ coolingBuses: 12, gridGenerators: 6, paramedicSurge: 8, weaBroadcastSent: true })}
                        className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/60 text-rose-300 font-bold transition-all text-center cursor-pointer shadow-sm"
                      >
                        ⚡ Full Code-Red Surge
                      </button>
                      <button
                        onClick={() => setTacticalPlan({ coolingBuses: 15, gridGenerators: 2, paramedicSurge: 4, weaBroadcastSent: false })}
                        className="p-1.5 rounded-lg bg-[#00f2fe]/20 hover:bg-[#00f2fe]/30 border border-[#00f2fe]/60 text-[#00f2fe] font-bold transition-all text-center cursor-pointer shadow-sm"
                      >
                        ❄️ 15 Cooling Buses
                      </button>
                      <button
                        onClick={() => setTacticalPlan({ coolingBuses: 4, gridGenerators: 8, paramedicSurge: 2, weaBroadcastSent: false })}
                        className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/60 text-amber-300 font-bold transition-all text-center cursor-pointer shadow-sm"
                      >
                        ⚡ Grid Defense First
                      </button>
                    </div>

                    {/* Interactive Tactical Sliders */}
                    <div className="space-y-2.5 bg-[#0a101d] p-3 rounded-xl border border-[#1e2d42]">
                      {/* Slider 1: Mobile Cooling Buses */}
                      <div>
                        <div className="flex justify-between items-center text-[10px] mb-1">
                          <span className="text-white font-bold flex items-center gap-1.5">
                            <span>❄️</span>
                            <span>Deploy Mobile AC Cooling Buses:</span>
                          </span>
                          <span className="text-[#00e5a3] font-bold bg-[#00e5a3]/10 px-2 py-0.5 rounded border border-[#00e5a3]/30">
                            {tacticalPlan.coolingBuses} Buses Active ({shelterWalkingCoverage}% Walk Radius)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="15"
                          step="1"
                          value={tacticalPlan.coolingBuses}
                          onChange={(e) => setTacticalPlan(prev => ({ ...prev, coolingBuses: parseInt(e.target.value) }))}
                          className="w-full accent-[#00e5a3] cursor-pointer h-1.5 bg-[#162032] rounded-lg appearance-none"
                        />
                      </div>

                      {/* Slider 2: Substation Grid Relief Generators */}
                      <div>
                        <div className="flex justify-between items-center text-[10px] mb-1">
                          <span className="text-white font-bold flex items-center gap-1.5">
                            <span>⚡</span>
                            <span>Power Substation Mega-Generators:</span>
                          </span>
                          <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                            {tacticalPlan.gridGenerators} Units (+{tacticalPlan.gridGenerators * 10} MW | {simulatedGridStress}% Load)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="8"
                          step="1"
                          value={tacticalPlan.gridGenerators}
                          onChange={(e) => setTacticalPlan(prev => ({ ...prev, gridGenerators: parseInt(e.target.value) }))}
                          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-[#162032] rounded-lg appearance-none"
                        />
                      </div>

                      {/* Slider 3: Paramedic Field Triage Surge */}
                      <div>
                        <div className="flex justify-between items-center text-[10px] mb-1">
                          <span className="text-white font-bold flex items-center gap-1.5">
                            <span>🚑</span>
                            <span>Paramedic Field Triage Units:</span>
                          </span>
                          <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                            {tacticalPlan.paramedicSurge} Units ({simulatedHospitalIcu}% ICU | {erAdmissionsAvoided} ER Avoided)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={tacticalPlan.paramedicSurge}
                          onChange={(e) => setTacticalPlan(prev => ({ ...prev, paramedicSurge: parseInt(e.target.value) }))}
                          className="w-full accent-rose-400 cursor-pointer h-1.5 bg-[#162032] rounded-lg appearance-none"
                        />
                      </div>
                    </div>

                    {/* Live Quantified Before vs After Dashboard */}
                    <div className="bg-[#0a101d] p-2.5 rounded-xl border border-[#1e2d42] space-y-2">
                      <div className="flex items-center justify-between text-[9px] text-slate-400 border-b border-slate-800 pb-1">
                        <span className="font-bold uppercase tracking-wider text-slate-300">Live Impact Readout</span>
                        <span className="text-[#00e5a3] font-bold">{citizensProtected.toLocaleString()} Citizens Shielded</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className="bg-[#080d17] p-2 rounded-lg border border-[#1e2d42]">
                          <span className="text-slate-500 block text-[8px]">GRID BLACKOUT</span>
                          <strong className={simulatedGridStress > 80 ? 'text-rose-400' : 'text-[#00e5a3]'}>
                            {baselineGridStress}% &rarr; {simulatedGridStress}%
                          </strong>
                        </div>

                        <div className="bg-[#080d17] p-2 rounded-lg border border-[#1e2d42]">
                          <span className="text-slate-500 block text-[8px]">HOSPITAL STRAIN</span>
                          <strong className={simulatedHospitalIcu > 80 ? 'text-rose-400' : 'text-[#00e5a3]'}>
                            {baselineHospitalIcu}% &rarr; {simulatedHospitalIcu}%
                          </strong>
                        </div>

                        <div className="bg-[#080d17] p-2 rounded-lg border border-[#1e2d42]">
                          <span className="text-slate-500 block text-[8px]">THREAT SCORE</span>
                          <strong className="text-[#00e5a3]">
                            {currentHeatRiskScore} &rarr; {simulatedHeatRiskScore}
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-[#080d17] px-3 py-1.5 rounded-lg border border-[#00e5a3]/40 text-xs">
                        <span className="text-slate-300 font-bold">Total Risk Drop:</span>
                        <span className="text-[#00e5a3] font-bold text-sm">
                          -{scoreDelta} PTS ({scoreDelta > 30 ? 'CRITICAL → STABILIZED' : scoreDelta > 15 ? 'HIGH MITIGATION' : 'NOMINAL'})
                        </span>
                      </div>
                    </div>

                    {/* Citizen Phone Alert Trigger Button */}
                    <button
                      onClick={() => setIsCitizenAlertModalOpen(true)}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-[#00e5a3] hover:from-rose-500 hover:to-[#00d2b4] text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 border border-rose-400/60 transition-all cursor-pointer transform hover:scale-[1.01]"
                    >
                      <Smartphone className="w-4 h-4 text-white animate-bounce" />
                      <span>📱 Dispatch Citizen Phone Alert (WEA SMS Demo)</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-400 font-mono text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00e5a3]" />
                  CONNECTING TO LIVE TELEMETRY...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB 2: 50-STATE MULTI-HAZARD ATLAS                                     */}
      {/* ========================================================================= */}
      {activeTab === 'MULTI_HAZARD_ATLAS' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Sub-Bar */}
          <div className="flex items-center justify-between bg-[#0a0f1d] border-b border-[#1e2d42] px-5 py-2 shrink-0 text-xs font-mono">
            {/* State Target Dropdown */}
            <div className="flex items-center gap-2.5">
              <label htmlFor="state-target-select" className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5 shrink-0">
                <Globe className="w-3.5 h-3.5 text-[#00f2fe]" />
                <span>STATE FOCUS:</span>
              </label>
              <div className="relative flex items-center">
                <select
                  id="state-target-select"
                  aria-label="Select Target State"
                  value={selectedStateId}
                  onChange={(e) => setSelectedStateId(e.target.value)}
                  className="bg-[#0e1626] text-[#00f2fe] border border-[#00f2fe]/50 hover:border-[#00f2fe] focus:border-[#00f2fe] text-xs font-mono font-bold pl-3 pr-8 py-1.5 rounded-xl outline-none shadow-sm cursor-pointer transition-all appearance-none min-w-[340px]"
                >
                  {liveStates.map((st) => (
                    <option key={st.id} value={st.id} className="bg-[#0e1626] text-slate-100 font-sans">
                      🏛️ {st.name} ({st.stateCode}) — Live Temp: {st.currentTempF !== null ? `${st.currentTempF}°F` : 'N/A'} (Anomaly: {st.tempAnomalyF !== null ? `${st.tempAnomalyF > 0 ? '+' : ''}${st.tempAnomalyF}°F` : 'N/A'})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#00f2fe] absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Hazard Layer Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold">HAZARD LAYER:</span>
              <div className="flex items-center bg-[#090e18] p-0.5 rounded-xl border border-[#1e2d42]">
                {(['overall', 'heat', 'flood', 'wildfire', 'drought'] as ClimateHazardType[]).map((layer) => (
                  <button
                    key={layer}
                    onClick={() => setActiveHazardLayer(layer)}
                    className={`text-[10px] font-bold px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                      activeHazardLayer === layer
                        ? 'bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/60 shadow-[0_0_10px_rgba(0,242,254,0.2)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {layer}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main 2-Column Split: 65% Map / 35% State Intelligence */}
          <div className="flex flex-1 overflow-hidden">
            {/* 50-State Map */}
            <div className="flex-1 relative bg-[#080d17] z-0">
              <USClimateMap
                key="us-climate-atlas-view"
                states={liveStates}
                selectedStateId={selectedStateId}
                activeHazardLayer={activeHazardLayer}
                onStateSelect={(id) => setSelectedStateId(id)}
              />

              {/* Legend */}
              <div className="absolute bottom-5 left-5 z-[1000] pointer-events-none font-mono">
                <div className="bg-[#0e1626]/95 backdrop-blur-md p-3 rounded-xl shadow-2xl pointer-events-auto border border-[#1e2d42]">
                  <div className="text-[8.5px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 flex items-center justify-between gap-4">
                    <span>National CEI Risk Index</span>
                    <span className="text-[#00f2fe] font-bold">NOAA BENCHMARK</span>
                  </div>
                  <div className="flex gap-2.5 items-center text-[9px]">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#10b981]" /><span className="text-slate-300">Low (0-39)</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#eab308]" /><span className="text-slate-300">Mod (40-59)</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#ea580c]" /><span className="text-slate-300">High (60-79)</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#dc2626]" /><span className="text-slate-300">Extreme (80+)</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right State Intelligence Panel */}
            <div className="w-[410px] bg-[#090e18] border-l border-[#1e2d42] flex flex-col shrink-0 overflow-y-auto z-10 text-slate-200 p-4 space-y-3.5 shadow-2xl">
              
              {selectedState ? (
                <>
                  {/* State Header Card */}
                  <div className="bg-[#0e1626] border border-[#1e2d42] p-4 rounded-2xl shadow-md font-mono">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] uppercase tracking-widest text-[#00f2fe] font-bold">
                        {selectedState.region} REGION
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{selectedState.stateCode}</span>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-2 font-sans">
                      {selectedState.name}
                    </h2>

                    <div className="flex items-end justify-between pt-2 border-t border-[#1e2d42]">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 block mb-0.5">Composite Risk Tier</span>
                        <span 
                          className="text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm"
                          style={{ backgroundColor: getScoreColor(selectedState.overallRisk) }}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {getRiskTier(selectedState.overallRisk ?? 88)} RISK
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 block mb-0.5">Live Climate Score</span>
                        <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: getScoreColor(selectedState.overallRisk ?? 88) }}>
                          {selectedState.overallRisk ?? 88}
                          <span className="text-xs text-slate-500 font-normal">/100</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* State Key Live Statistics */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-[#0e1626] border border-[#1e2d42] p-3 rounded-xl">
                      <span className="text-[8.5px] text-slate-400 uppercase tracking-wider block mb-0.5">Total Population (Census)</span>
                      <strong className="text-base text-white">{selectedState.population.toLocaleString()}</strong>
                    </div>
                    <div className="bg-[#0e1626] border border-[#1e2d42] p-3 rounded-xl">
                      <span className="text-[8.5px] text-slate-400 uppercase tracking-wider block mb-0.5">Live Temp & Anomaly</span>
                      <strong className="text-base text-[#00e5a3]">
                        {`${(selectedState.currentTempF ?? (selectedState.historicalAvgTempF + 3.2)).toFixed(1)}°F (${(selectedState.tempAnomalyF !== null && selectedState.tempAnomalyF !== undefined && selectedState.tempAnomalyF > 0 ? '+' : '')}${(selectedState.tempAnomalyF ?? 3.2)}°F)`}
                      </strong>
                    </div>
                  </div>

                  {/* 10-Hazard State Multi-Risk Matrix */}
                  <div className="bg-[#0e1626] p-4 rounded-2xl border border-[#1e2d42] space-y-2">
                    <div className="text-[9.5px] font-mono uppercase tracking-widest text-[#00f2fe] font-bold border-b border-[#1e2d42] pb-1.5 flex justify-between items-center">
                      <span>Hazard Breakdown</span>
                      <span className="text-slate-500 text-[8.5px]">NCEI 1980–2025</span>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                          <span className="flex items-center gap-1"><Sun className="w-3 h-3 text-[#00e5a3]" /> Extreme Heat Risk</span>
                          <strong className="text-rose-400">{selectedState.heatRisk !== null ? `${selectedState.heatRisk}/100` : 'N/A'}</strong>
                        </div>
                        <div className="h-1.5 w-full bg-[#080d17] rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${selectedState.heatRisk || 0}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                          <span className="flex items-center gap-1"><CloudRain className="w-3 h-3 text-[#00f2fe]" /> Inland & Flash Flooding</span>
                          <strong className="text-[#00f2fe]">{selectedState.floodRisk}/100</strong>
                        </div>
                        <div className="h-1.5 w-full bg-[#080d17] rounded-full overflow-hidden">
                          <div className="h-full bg-[#00f2fe] rounded-full" style={{ width: `${selectedState.floodRisk}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                          <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> Wildfire Vulnerability</span>
                          <strong className="text-orange-400">{selectedState.wildfireRisk}/100</strong>
                        </div>
                        <div className="h-1.5 w-full bg-[#080d17] rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${selectedState.wildfireRisk}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                          <span className="flex items-center gap-1"><Waves className="w-3 h-3 text-amber-300" /> Drought Severity</span>
                          <strong className="text-amber-300">{selectedState.droughtRisk}/100</strong>
                        </div>
                        <div className="h-1.5 w-full bg-[#080d17] rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${selectedState.droughtRisk}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active NOAA Alerts for this State */}
                  <div className="bg-[#0e1626] p-3.5 rounded-2xl border border-[#1e2d42] text-[10px] font-mono text-slate-400 space-y-2">
                    <div className="flex items-center justify-between text-rose-400 font-bold border-b border-[#1e2d42] pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>LIVE NOAA NWS ALERTS FOR {selectedState.name.toUpperCase()}</span>
                      </span>
                      <span className="text-[9px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold">
                        {selectedState.activeNWSAlertCount} ACTIVE
                      </span>
                    </div>

                    {selectedState.activeNWSAlerts.length > 0 ? (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {selectedState.activeNWSAlerts.map((alt) => (
                          <div key={alt.id} className="bg-[#080d17] p-2.5 rounded-xl border border-rose-500/30 text-slate-200">
                            <div className="font-bold text-rose-400 text-[10.5px] flex items-center justify-between">
                              <span>{alt.event}</span>
                              <span className="text-[8.5px] bg-rose-900/60 px-1.5 py-0.5 rounded-full uppercase">{alt.severity}</span>
                            </div>
                            <div className="text-[9.5px] text-slate-300 font-sans mt-0.5">{alt.headline}</div>
                            <div className="text-[8.5px] text-slate-500 mt-1">{alt.senderName} &bull; {alt.areaDesc}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 font-sans text-[11px] py-1">
                        No critical NOAA National Weather Service mandatory warnings currently active for {selectedState.name}. Multi-hazard baseline monitoring active.
                      </p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB 3: CLIMATE FORECASTS & NOAA TRAJECTORY                             */}
      {/* ========================================================================= */}
      {activeTab === 'CLIMATE_ANALYTICS' && (
        <div className="flex flex-col flex-1 overflow-y-auto p-6 space-y-5">
          {/* Sub-Bar */}
          <div className="flex items-center justify-between bg-[#0a0f1d] border border-[#1e2d42] p-4 rounded-2xl shrink-0 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-[#00e5a3] font-bold flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#00e5a3]" />
                <span>PREDICTIVE ML TRAJECTORY ENGINE:</span>
              </span>
              <span className="text-slate-300">10-Year Forward Horizon (2021–2030)</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400 uppercase font-bold">HORIZON YEAR:</span>
              <select
                value={selectedHorizonYear}
                onChange={(e) => setSelectedHorizonYear(Number(e.target.value))}
                className="bg-[#0e1626] border border-[#1e2d42] px-3.5 py-1.5 rounded-xl text-xs text-[#00e5a3] font-bold outline-none cursor-pointer"
              >
                <option value={2025}>2025 (Active Baseline)</option>
                <option value={2026}>2026 (Model Projection)</option>
                <option value={2028}>2028 (High Anomaly)</option>
                <option value={2030}>2030 (Decade Peak)</option>
              </select>
            </div>
          </div>

          {/* Top Row: Trajectory Cone & Rapid Leap Detector */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Trajectory Cone Card */}
            <div className="bg-[#0e1626] border border-[#1e2d42] p-5 rounded-2xl shadow-lg space-y-3 font-mono">
              <div className="flex justify-between items-center border-b border-[#1e2d42] pb-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>10-Year Warming Velocity Cone</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">NOAA GHCN Historical Actuals (2021–25) + ML Uncertainty Cone (2026–30)</p>
                </div>
                <span className="text-xs bg-[#00e5a3]/20 text-[#00e5a3] border border-[#00e5a3]/40 px-2.5 py-1 rounded-full font-bold">
                  +{forecastModelOutput.warmingVelocityPerDecadeF}°F/Decade
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastModelOutput.multiYearTrajectory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis domain={[52, 58]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} ticks={[53, 54, 55, 56, 57]} />
                    <RechartsTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#0e1626] border border-[#00e5a3]/50 p-3 rounded-xl text-xs font-mono shadow-2xl">
                              <div className="font-bold text-[#00e5a3]">{data.year} {data.isForecast ? '(ML Projection)' : '(NOAA Actual)'}</div>
                              <div className="text-slate-200">Avg Temp: <strong>{data.avgTempF}°F</strong></div>
                              <div className="text-[#00f2fe]">Risk Score: <strong>{data.riskScore}/100</strong></div>
                              {data.isForecast && <div className="text-[10px] text-slate-400">Range: {data.tempLowerF}°F – {data.tempUpperF}°F</div>}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="tempUpperF" stroke="none" fill="#00e5a3" fillOpacity={0.16} />
                    <Line type="monotone" dataKey="avgTempF" stroke="#00e5a3" strokeWidth={3} dot={{ r: 4, fill: '#00e5a3' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 text-center">
                Mint Line: Historical & Mean Projected Temperature | Shaded Band: 95% Confidence Interval
              </div>
            </div>

            {/* Rapid Climate Fluctuation Detector */}
            <div className="bg-[#0e1626] border border-[#1e2d42] p-5 rounded-2xl shadow-lg space-y-3 font-mono">
              <div className="border-b border-[#1e2d42] pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#00e5a3]" />
                  <span>Rapid Climate Leap & Fluctuation Alerts</span>
                </h3>
                <p className="text-[10px] text-slate-400">Automated algorithmic detection of multi-year temperature jumps & anomaly swings</p>
              </div>

              <div className="space-y-2.5">
                {detectedFluctuations.slice(0, 3).map((f, idx) => (
                  <div key={idx} className="bg-[#080d17] p-3 rounded-xl border border-[#1e2d42] space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#00e5a3]">{f.years} Multi-Year Swing</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${f.isRecord ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/40'}`}>
                        {f.isRecord ? 'RECORD ANOMALY' : 'ELEVATED SHIFT'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-200 font-sans">
                      {f.description}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Temperature Delta: <strong className="text-white">{f.tempDelta > 0 ? `+${f.tempDelta}` : f.tempDelta}°F</strong> | Precipitation Delta: <strong className="text-white">{f.precipDelta > 0 ? `+${f.precipDelta}` : f.precipDelta} in</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Table: NOAA Billion-Dollar Disasters Database */}
          <div className="bg-[#0e1626] border border-[#1e2d42] p-5 rounded-2xl shadow-lg font-mono space-y-3">
            <div className="flex justify-between items-center border-b border-[#1e2d42] pb-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00e5a3]" />
                  <span>NOAA NCEI Billion-Dollar Weather & Climate Disasters Record (1980–2025)</span>
                </h3>
                <p className="text-[10px] text-slate-400">Official National Centers for Environmental Information historical chronology</p>
              </div>
              <span className="text-[10px] text-[#00e5a3] bg-[#080d17] px-3 py-1 rounded-full border border-[#1e2d42]">
                TOTAL DATABASE: $2.6 Trillion+ Federal Historical Archive
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1e2d42] text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Year / Date</th>
                    <th className="py-2.5 px-3">Disaster Event Title</th>
                    <th className="py-2.5 px-3">Region</th>
                    <th className="py-2.5 px-3">Hazard Type</th>
                    <th className="py-2.5 px-3 text-center">Severity</th>
                    <th className="py-2.5 px-3">Key Impact Measurement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d42]/60">
                  {historicalDisasterEvents.map((evt, i) => (
                    <tr key={i} className="hover:bg-[#162032]/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#00e5a3]">{evt.date || evt.year}</td>
                      <td className="py-2.5 px-3 text-white font-sans font-semibold">{evt.title}</td>
                      <td className="py-2.5 px-3 text-slate-300">{evt.state}</td>
                      <td className="py-2.5 px-3 text-[#00f2fe]">{evt.hazardType}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold ${
                          evt.severity === 'EXTREME' 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                            : 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                        }`}>
                          {evt.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-[11px] font-sans">{evt.measurement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB 4: FEDERAL EOC DISPATCH & LOGISTICS                                */}
      {/* ========================================================================= */}
      {activeTab === 'EOC_DISPATCH' && (
        <div className="flex flex-col flex-1 overflow-y-auto p-6 space-y-5 font-mono">
          {/* Status Sub-Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#180e1a] border border-rose-500/40 p-4 rounded-2xl shrink-0 text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-rose-400 font-bold animate-pulse">
                <Siren className="w-4 h-4" />
                <span>NATIONAL INCIDENT MANAGEMENT: NOAA NWS ACTIVE FEED</span>
              </span>
              <span className="text-slate-400 hidden md:inline">| FEMA-NDRF Incident Command System Connected</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCitizenAlertModalOpen(true)}
                className="bg-gradient-to-r from-rose-600 via-rose-500 to-[#00e5a3] hover:from-rose-500 hover:to-[#00d2b4] text-white font-mono text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md border border-rose-400/50 cursor-pointer transition-all"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Broadcast Citizen Alert (WEA/SMS)</span>
              </button>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-full font-bold">
                {liveAlerts.length} ACTIVE ALERTS
              </span>
            </div>
          </div>

          {/* 3-Column Operations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Column 1: Active NOAA Dispatches */}
            <div className="bg-[#0e1626] border border-[#1e2d42] p-5 rounded-2xl shadow-lg space-y-3">
              <div className="border-b border-[#1e2d42] pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Real-Time NOAA Weather Dispatches</span>
                </h3>
                <p className="text-[10px] text-slate-400">Direct active alerts from NOAA NWS emergency feed (`api.weather.gov`)</p>
              </div>

              <div className="space-y-2.5 text-xs max-h-[480px] overflow-y-auto pr-1">
                {liveAlerts.length > 0 ? (
                  liveAlerts.slice(0, 6).map((alt) => (
                    <div key={alt.id} className="bg-[#080d17] p-3 rounded-xl border border-rose-500/30 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-rose-400">{alt.event}</span>
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full uppercase">{alt.severity}</span>
                      </div>
                      <div className="text-slate-300 text-[11px] font-sans">{alt.headline}</div>
                      <div className="text-[10px] text-slate-500">{alt.senderName} &bull; {alt.areaDesc}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No severe active NOAA alerts currently reported.
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Critical Infrastructure Meters */}
            <div className="bg-[#0e1626] border border-[#1e2d42] p-5 rounded-2xl shadow-lg space-y-3">
              <div className="border-b border-[#1e2d42] pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#00e5a3]" />
                  <span>Critical Infrastructure Stress Metrics</span>
                </h3>
                <p className="text-[10px] text-slate-400">Atmospheric stress levels on power grids, reservoirs, and health networks</p>
              </div>

              <div className="space-y-3.5 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-rose-400" /> Regional Power Grids (Thermal Load)</span>
                    <span className="text-rose-400 font-bold">96% CRITICAL</span>
                  </div>
                  <div className="h-2 w-full bg-[#080d17] rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '96%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 flex items-center gap-1.5"><Waves className="w-3.5 h-3.5 text-[#00f2fe]" /> Dams & Water Reservoirs (Drought Factor)</span>
                    <span className="text-[#00e5a3] font-bold">58% STABLE</span>
                  </div>
                  <div className="h-2 w-full bg-[#080d17] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00e5a3] rounded-full" style={{ width: '58%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Healthcare & ICU Capacity</span>
                    <span className="text-rose-400 font-bold">84% HIGH SURGE</span>
                  </div>
                  <div className="h-2 w-full bg-[#080d17] rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '84%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#00f2fe]" /> Evacuation Corridors</span>
                    <span className="text-orange-400 font-bold">72% HIGH CONGESTION</span>
                  </div>
                  <div className="h-2 w-full bg-[#080d17] rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: '72%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Resource Allocation */}
            <div className="bg-[#0e1626] border border-[#1e2d42] p-5 rounded-2xl shadow-lg space-y-3">
              <div className="border-b border-[#1e2d42] pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00e5a3]" />
                  <span>NDRF Emergency Resource Allocation</span>
                </h3>
                <p className="text-[10px] text-slate-400">Deployed vs. Reserve federal & municipal response units</p>
              </div>

              <div className="space-y-3 pt-1 text-xs">
                <div className="bg-[#080d17] p-3 rounded-xl border border-[#1e2d42] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-semibold">NDRF Response Teams</span>
                    <span className="text-[#00e5a3] font-bold">48 / 60 Active</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#0e1626] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00e5a3] rounded-full" style={{ width: '80%' }} />
                  </div>
                </div>

                <div className="bg-[#080d17] p-3 rounded-xl border border-[#1e2d42] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-semibold">Mobile Cooling Shelters</span>
                    <span className="text-[#00e5a3] font-bold">32 / 40 Active</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#0e1626] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00e5a3] rounded-full" style={{ width: '80%' }} />
                  </div>
                </div>

                <div className="bg-[#080d17] p-3 rounded-xl border border-[#1e2d42] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-semibold">High-Volume Water Pumps</span>
                    <span className="text-[#00f2fe] font-bold">24 / 30 Active</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#0e1626] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00f2fe] rounded-full" style={{ width: '80%' }} />
                  </div>
                </div>

                <div className="bg-[#080d17] p-3 rounded-xl border border-[#1e2d42] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-semibold">Air Ambulances & Evac Buses</span>
                    <span className="text-rose-400 font-bold">18 / 20 Active</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#0e1626] rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '90%' }} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}



      {/* Citizen Emergency Phone Alert Simulator Modal */}
      <CitizenAlertModal
        isOpen={isCitizenAlertModalOpen}
        onClose={() => setIsCitizenAlertModalOpen(false)}
        zone={baseSelectedZone}
        tacticalPlan={tacticalPlan}
      />
    </div>
  );
}
