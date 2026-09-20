"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
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
  Smartphone,
  QrCode,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X
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

const DEMO_STEPS = [
  {
    id: 0,
    badge: 'STEP 1 OF 5',
    title: '🚨 Real-Time Threat Detection',
    desc: 'Locking onto Phoenix Core (104°F) — NOAA Telemetry & Gemini AI senior demographic vulnerability analysis.',
    duration: 12,
  },
  {
    id: 1,
    badge: 'STEP 2 OF 5',
    title: '🛠️ EOC What-If Intervention Simulation',
    desc: 'Deploying mobile cooling buses, emergency microgrids & medics — dynamically reducing heat threat from 76 to 38.',
    duration: 16,
  },
  {
    id: 2,
    badge: 'STEP 3 OF 5',
    title: '🗺️ 50-State Multi-Hazard Atlas',
    desc: 'Switching nationwide Doppler radar, Wildfire vulnerability, and live NOAA NWS emergency warnings across states.',
    duration: 14,
  },
  {
    id: 3,
    badge: 'STEP 4 OF 5',
    title: '📈 10-Year ML Climate Forecasts',
    desc: 'Projecting 2021–2030 temperature velocity cones and accessing the $2.6T NOAA historical disaster archives.',
    duration: 14,
  },
  {
    id: 4,
    badge: 'STEP 5 OF 5',
    title: '📱 Citizen WEA Phone Alert Broadcast',
    desc: 'Simulating bilingual FEMA WEA / SMS emergency push broadcast to 142,000 residents across the municipal zone.',
    duration: 16,
  },
];

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

  // =========================================================================
  // 90-SECOND INTERACTIVE AUTOPILOT TOUR CONTROLLER
  // =========================================================================
  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(0);
  const [demoTick, setDemoTick] = useState<number>(0);
  const [isDemoPaused, setIsDemoPaused] = useState<boolean>(false);

  const applyDemoStep = useCallback((stepIdx: number) => {
    setDemoStep(stepIdx);
    setDemoTick(0);

    if (stepIdx === 0) {
      setActiveTab('HEATWAVE_SIMULATOR');
      setSelectedZoneId('zone-phx-core');
      setTacticalPlan({ coolingBuses: 0, gridGenerators: 0, paramedicSurge: 0, weaBroadcastSent: false });
      setIsCitizenAlertModalOpen(false);
    } else if (stepIdx === 1) {
      setActiveTab('HEATWAVE_SIMULATOR');
      setSelectedZoneId('zone-phx-core');
      setIsCitizenAlertModalOpen(false);
      setTacticalPlan({ coolingBuses: 4, gridGenerators: 2, paramedicSurge: 3, weaBroadcastSent: false });
    } else if (stepIdx === 2) {
      setIsCitizenAlertModalOpen(false);
      setActiveTab('MULTI_HAZARD_ATLAS');
      setSelectedStateId('CA');
      setActiveHazardLayer('wildfire');
    } else if (stepIdx === 3) {
      setIsCitizenAlertModalOpen(false);
      setActiveTab('CLIMATE_ANALYTICS');
      setSelectedHorizonYear(2028);
    } else if (stepIdx === 4) {
      setActiveTab('EOC_DISPATCH');
      setIsCitizenAlertModalOpen(true);
    }
  }, []);

  const startDemoTour = useCallback(() => {
    setIsDemoRunning(true);
    setIsDemoPaused(false);
    applyDemoStep(0);
  }, [applyDemoStep]);

  const stopDemoTour = useCallback(() => {
    setIsDemoRunning(false);
    setIsDemoPaused(false);
    setDemoStep(0);
    setDemoTick(0);
  }, []);

  const nextDemoStep = useCallback(() => {
    if (demoStep < DEMO_STEPS.length - 1) {
      applyDemoStep(demoStep + 1);
    } else {
      stopDemoTour();
    }
  }, [demoStep, applyDemoStep, stopDemoTour]);

  const prevDemoStep = useCallback(() => {
    if (demoStep > 0) {
      applyDemoStep(demoStep - 1);
    }
  }, [demoStep, applyDemoStep]);

  // Demo Timer Effect
  useEffect(() => {
    if (!isDemoRunning || isDemoPaused) return;

    const interval = setInterval(() => {
      setDemoTick((prevTick) => {
        const nextTick = prevTick + 1;
        const currentDuration = DEMO_STEPS[demoStep]?.duration ?? 15;

        // Sub-step dynamic animations during Step 1 (Interventions)
        if (demoStep === 1) {
          if (nextTick === 3) {
            setTacticalPlan({ coolingBuses: 8, gridGenerators: 4, paramedicSurge: 5, weaBroadcastSent: false });
          } else if (nextTick === 7) {
            setTacticalPlan({ coolingBuses: 12, gridGenerators: 6, paramedicSurge: 8, weaBroadcastSent: true });
          }
        }

        // Sub-step dynamic animations during Step 2 (Atlas)
        if (demoStep === 2) {
          if (nextTick === 5) {
            setSelectedStateId('FL');
            setActiveHazardLayer('flood');
          } else if (nextTick === 10) {
            setSelectedStateId('TX');
            setActiveHazardLayer('heat');
          }
        }

        if (nextTick >= currentDuration) {
          if (demoStep < DEMO_STEPS.length - 1) {
            applyDemoStep(demoStep + 1);
          } else {
            setIsDemoRunning(false);
          }
          return 0;
        }

        return nextTick;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isDemoRunning, isDemoPaused, demoStep, applyDemoStep]);

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
    <div className="flex h-screen bg-[#F5F1E8] text-[#263238] flex-col overflow-hidden font-sans select-none antialiased bg-tactical-grid">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & MAIN NAVIGATION BAR (Darker Cream-Reddish Aesthetic)       */}
      {/* ========================================================================= */}
      <header 
        style={{ backgroundColor: '#E5CDC6', borderColor: '#CCA298' }}
        className="flex h-14 items-center justify-between px-4 text-[#263238] shrink-0 z-50 border-b shadow-sm w-full gap-2 overflow-x-auto"
      >
        
        {/* Left Brand Identity */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div 
            style={{ backgroundColor: '#FFFDF8', borderColor: '#CCA298' }}
            className="w-8 h-8 border flex items-center justify-center rounded-xl shrink-0 shadow-sm"
          >
            <Activity className="h-4 w-4 text-[#0f766e]" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-extrabold tracking-wider uppercase text-[#263238] font-mono">
                CIVICPULSE
              </span>
            </div>
            <div className="text-[8.5px] text-[#6B6F6B] uppercase font-mono tracking-wider">
              AI-Powered Urban Risk Intelligence & Response Simulator
            </div>
          </div>
        </div>

        {/* Center: Dedicated 4-Page Navigation Tabs (Compact Single-Row - No Overlap) */}
        <nav 
          style={{ backgroundColor: '#D8B6AD', borderColor: '#C3988E' }}
          className="flex items-center p-0.5 rounded-xl border shadow-inner shrink-0"
        >
          <button
            onClick={() => setActiveTab('HEATWAVE_SIMULATOR')}
            className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'HEATWAVE_SIMULATOR'
                ? 'bg-[#FFFDF8] text-[#0f766e] border border-[#C3988E] shadow-sm'
                : 'text-[#5A4D49] hover:text-[#263238]'
            }`}
          >
            <Flame className="w-3 h-3 text-[#0d9488]" />
            <span>1. Urban Heat Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('MULTI_HAZARD_ATLAS')}
            className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'MULTI_HAZARD_ATLAS'
                ? 'bg-[#FFFDF8] text-[#0369a1] border border-[#C3988E] shadow-sm'
                : 'text-[#5A4D49] hover:text-[#263238]'
            }`}
          >
            <Globe className="w-3 h-3 text-[#0284c7]" />
            <span>2. National Hazard Atlas</span>
          </button>

          <button
            onClick={() => setActiveTab('CLIMATE_ANALYTICS')}
            className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'CLIMATE_ANALYTICS'
                ? 'bg-[#FFFDF8] text-[#4338ca] border border-[#C3988E] shadow-sm'
                : 'text-[#5A4D49] hover:text-[#263238]'
            }`}
          >
            <BarChart3 className="w-3 h-3 text-[#4f46e5]" />
            <span>3. NOAA & ML Forecasts</span>
          </button>

          <button
            onClick={() => setActiveTab('EOC_DISPATCH')}
            className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'EOC_DISPATCH'
                ? 'bg-[#FFFDF8] text-[#be123c] border border-[#C3988E] shadow-sm'
                : 'text-[#5A4D49] hover:text-[#263238]'
            }`}
          >
            <Siren className="w-3 h-3 text-[#e11d48]" />
            <span>4. Federal EOC Dispatch</span>
            {liveAlerts.length > 0 && (
              <span 
                style={{ backgroundColor: '#DC2626' }}
                className="text-[8.5px] text-white font-bold px-1.5 py-0.2 rounded-full"
              >
                {liveAlerts.length}
              </span>
            )}
          </button>
        </nav>

        {/* Right Controls: Citizen Mobile App, Live Refresh & 90-Sec Autopilot */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Manual Live Refresh Button */}
          <button
            onClick={() => fetchLiveTelemetry(false)}
            disabled={isLoadingLive || isLiveRefreshing}
            style={{ backgroundColor: '#FFFDF8', borderColor: '#CCA298' }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border text-[#0f766e] font-mono text-[10.5px] font-bold hover:border-[#0d9488] hover:text-[#0d9488] transition-all cursor-pointer shadow-sm whitespace-nowrap shrink-0"
            title="Force immediate live data refresh from NOAA and Open-Meteo"
          >
            <RefreshCw className={`w-3 h-3 text-[#0d9488] ${isLiveRefreshing || isLoadingLive ? 'animate-spin' : ''}`} />
            <span className="hidden xl:inline">{isLiveRefreshing || isLoadingLive ? 'Syncing...' : 'Refresh Live'}</span>
          </button>

          {/* Direct 1-Click Launch Citizen Companion App (New Tab) */}
          <Link
            href="/citizen"
            target="_blank"
            style={{ backgroundColor: '#FFFDF8', borderColor: '#CCA298' }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border text-[#0f766e] font-mono text-[11px] font-bold hover:bg-[#FAF8F2] hover:border-[#0d9488] transition-all cursor-pointer shadow-sm whitespace-nowrap shrink-0"
            title="Open Citizen Lifeline Web App in a new tab for demonstration"
          >
            <QrCode className="w-3 h-3 text-[#0d9488]" />
            <span>Citizen App ↗</span>
          </Link>

          {/* Citizen Phone Alert Trigger (Solid Pitch Red - Clean, No Glow) */}
          <button
            onClick={() => setIsCitizenAlertModalOpen(true)}
            style={{ backgroundColor: '#DC2626', borderColor: '#991B1B', color: '#FFFFFF' }}
            className="flex items-center gap-1 px-3 py-1 rounded-full border font-mono text-[11px] font-extrabold shadow-sm hover:brightness-110 transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Launch Citizen Phone Alert SMS, QR & WEA Simulator"
          >
            <Smartphone className="w-3 h-3 text-white" />
            <span>Citizen Alert</span>
          </button>

          {/* 90-Sec Interactive Autopilot Pitch Tour */}
          <button
            onClick={() => {
              if (isDemoRunning) {
                setIsDemoPaused(!isDemoPaused);
              } else {
                startDemoTour();
              }
            }}
            className={`flex items-center gap-1 px-3 py-1 rounded-full font-mono text-[11px] font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isDemoRunning
                ? 'bg-[#E8F5EF] text-[#0f766e] border-2 border-[#0d9488] ring-2 ring-[#0d9488]/30 animate-pulse'
                : 'bg-[#0d9488] hover:bg-[#0f766e] text-white border border-[#0d9488] hover:scale-105'
            }`}
            title="Launch the automated 90-second judge presentation demo flow"
          >
            <Sparkles className={`w-3 h-3 ${isDemoRunning ? 'text-[#0d9488] animate-spin' : 'text-white'}`} />
            <span>{isDemoRunning ? (isDemoPaused ? '▶️ Resume' : `⏸️ Step ${demoStep + 1}/5`) : '⚡ 90-Sec Demo'}</span>
          </button>

          <div 
            style={{ backgroundColor: '#FFFDF8', borderColor: '#CCA298' }}
            className="hidden 2xl:flex items-center gap-1 font-mono text-[9.5px] text-[#263238] px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0"
          >
            <Clock className="w-3 h-3 text-[#0d9488]" />
            <span>{currentTime || 'LIVE TELEMETRY'}</span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. REAL-TIME DATA PROVENANCE & AUTO-REFRESH SUB-BAR                       */}
      {/* ========================================================================= */}
      <div 
        style={{ backgroundColor: '#DEC2BA', borderColor: '#CCA298' }}
        className="border-b px-5 py-1.5 flex items-center justify-between text-[10px] font-mono shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#0f766e] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#0d9488] inline-block animate-pulse" />
            <span>LAST UPDATED: {telemetryData?.lastUpdatedUtc || 'CONNECTING TO NOAA...'}</span>
          </div>
          <span className="text-[#C3988E]">|</span>
          <div className="flex items-center gap-1.5 text-[#5A4D49]">
            <Clock className="w-3 h-3 text-[#0d9488]" />
            <span>AUTO-REFRESH: <strong className="text-[#0f766e]">{formatCountdown(nextRefreshSeconds)}</strong> (1-Hr Cycle)</span>
          </div>
          {fetchError && (
            <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              ⚠ {fetchError}
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB 1: URBAN HEAT SIMULATOR & WHAT-IF INTERVENTION LAB                 */}
      {/* ========================================================================= */}
      {activeTab === 'HEATWAVE_SIMULATOR' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          
          {/* Tactical Sub-Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#FAF8F2] border-b border-[#DDD5C7] px-4 py-1.5 shrink-0 text-xs font-mono">
            {/* Target Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="focus-target-select" className="text-[10px] text-[#6B6F6B] uppercase tracking-wider font-bold flex items-center gap-1 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-[#0d9488]" />
                <span className="hidden sm:inline">TARGET:</span>
              </label>
              <div className="relative flex items-center">
                <select
                  id="focus-target-select"
                  aria-label="Select Target Zone"
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="bg-[#FFFDF8] text-[#0f766e] border border-[#DDD5C7] hover:border-[#0d9488] focus:border-[#0d9488] text-xs font-mono font-bold pl-3 pr-7 py-1 rounded-xl outline-none shadow-sm cursor-pointer transition-all appearance-none max-w-[260px] sm:max-w-[320px] md:max-w-[380px] truncate"
                >
                  {liveZones.map((z) => (
                    <option key={z.id} value={z.id} className="bg-[#FFFDF8] text-[#263238] font-sans">
                      📍 {z.name} — {z.metro} ({(z.temperatureF ?? 95.0).toFixed(1)}°F | Risk: {z.liveRiskScore ?? 74}/100)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#0d9488] absolute right-2 pointer-events-none" />
              </div>
            </div>

            {/* Live Data Status & Reset Action */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10.5px] bg-[#FFFDF8] px-2.5 py-0.5 rounded-full border border-[#DDD5C7] text-[#0f766e] font-semibold shadow-sm whitespace-nowrap">
                NOAA HRRR Live Telemetry
              </span>

              {isTacticalActive && (
                <button
                  onClick={() => setTacticalPlan({ coolingBuses: 0, gridGenerators: 0, paramedicSurge: 0, weaBroadcastSent: false })}
                  className="flex items-center gap-1 text-[10px] text-[#6B6F6B] hover:text-[#0d9488] border border-[#DDD5C7] px-2.5 py-0.5 rounded-lg bg-[#FFFDF8] hover:bg-[#FAF8F2] cursor-pointer transition-colors shadow-sm"
                  title="Reset to Live Baseline (Clear simulation)"
                >
                  <RotateCcw className="w-3 h-3 text-[#0d9488]" />
                  <span>Reset</span>
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
            <div className="w-[460px] bg-[#FAF8F2] border-l border-[#DDD5C7] flex flex-col shrink-0 overflow-y-auto z-10 text-[#263238] p-4 space-y-3 shadow-md">
              
              {baseSelectedZone ? (
                <>
                  {/* Target Zone Header */}
                  <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-3.5 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-1 font-mono">
                      <span className="text-[9px] uppercase tracking-widest text-[#0f766e] font-bold">
                        {baseSelectedZone.metro}
                      </span>
                      <span className="text-[9px] text-[#6B6F6B] font-bold">
                        {baseSelectedZone.stateCode} &bull; Lat {baseSelectedZone.lat.toFixed(2)}, Lng {baseSelectedZone.lng.toFixed(2)}
                      </span>
                    </div>
                    
                    <h2 className="text-lg font-bold text-[#263238] mb-2">
                      {baseSelectedZone.name}
                    </h2>

                    <div className="flex items-end justify-between pt-2 border-t border-[#DDD5C7] font-mono">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest text-[#6B6F6B] block mb-0.5 font-semibold">Incident Threat Tier</span>
                        <span 
                          className="text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm"
                          style={{ backgroundColor: isTacticalActive ? simulatedRiskColor : currentRiskColor }}
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-white" />
                          {getRiskTier(isTacticalActive ? simulatedHeatRiskScore || currentHeatRiskScore : currentHeatRiskScore)} RISK
                          {isTacticalActive && <span className="text-[8px] bg-black/30 px-1.5 py-0.2 rounded">SIMULATED</span>}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-widest text-[#6B6F6B] block mb-0.5">Calculated Risk Score</span>
                        <span 
                          className="text-3xl font-bold tabular-nums leading-none"
                          style={{ color: isTacticalActive ? simulatedRiskColor : currentRiskColor }}
                        >
                          {isTacticalActive ? simulatedHeatRiskScore : currentHeatRiskScore}
                          <span className="text-xs text-[#6B6F6B] font-normal">/100</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Quantitative Live Drivers Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-2.5 rounded-xl shadow-sm">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[8px] text-[#6B6F6B] uppercase tracking-wider">Live Atmospheric Temp</span>
                        <span className="text-[8px] text-[#0f766e] font-bold">{baseSelectedZone.isDaytime ? '☀️ Solar Peak' : '🌙 Night Low'}</span>
                      </div>
                      <strong className="text-sm text-[#263238]">
                        {`${(baseSelectedZone.temperatureF ?? 98.4).toFixed(1)}°F (${(baseSelectedZone.temperatureC ?? 36.9).toFixed(1)}°C)`}
                      </strong>
                      {isTacticalActive && simulatedTempF !== null && (
                        <div className="text-[9px] text-[#0f766e] font-bold mt-0.5">
                          Simulated: {simulatedTempF}°F ({Math.round(((simulatedTempF - 32) * 5) / 9)}°C)
                        </div>
                      )}
                    </div>

                    <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-2.5 rounded-xl shadow-sm">
                      <span className="text-[8px] text-[#6B6F6B] uppercase tracking-wider block mb-0.5">Substation Grid Load</span>
                      <strong className={`text-sm ${simulatedGridStress > 80 ? 'text-rose-600' : simulatedGridStress > 60 ? 'text-amber-600' : 'text-[#0f766e]'}`}>
                        {simulatedGridStress}% {simulatedGridStress > 80 ? '(CRITICAL)' : simulatedGridStress > 60 ? '(ELEVATED)' : '(STABLE)'}
                      </strong>
                      <span className="text-[8px] text-[#6B6F6B] block mt-0.5">
                        Baseline: {baselineGridStress}% Max Load
                      </span>
                    </div>

                    <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-2.5 rounded-xl shadow-sm">
                      <span className="text-[8px] text-[#6B6F6B] uppercase tracking-wider block mb-0.5">Hospital ER/ICU Load</span>
                      <strong className={`text-sm ${simulatedHospitalIcu > 80 ? 'text-rose-600' : simulatedHospitalIcu > 60 ? 'text-amber-600' : 'text-[#0f766e]'}`}>
                        {simulatedHospitalIcu}% {simulatedHospitalIcu > 80 ? '(OVERFLOW)' : '(SAFE)'}
                      </strong>
                      <span className="text-[8px] text-[#6B6F6B] block mt-0.5">
                        {erAdmissionsAvoided > 0 ? `${erAdmissionsAvoided} ER avoided` : `Baseline: ${baselineHospitalIcu}% cap`}
                      </span>
                    </div>

                    <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-2.5 rounded-xl shadow-sm">
                      <span className="text-[8px] text-[#6B6F6B] uppercase tracking-wider block mb-0.5">District Population Exposure</span>
                      <strong className="text-sm text-[#263238]">
                        {baseSelectedZone.population.toLocaleString()} Residents
                      </strong>
                      <span className="text-[8px] text-[#0284c7] font-semibold block mt-0.5">
                        {shelterWalkingCoverage}% covered by walk-in cooling
                      </span>
                    </div>
                  </div>

                  {/* Gemini AI Diagnostic */}
                  <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-3 rounded-xl shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between font-mono border-b border-[#DDD5C7] pb-1">
                      <span className="text-[9px] uppercase tracking-widest text-[#0f766e] font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#0d9488]" />
                        Gemini AI Live Root-Cause Diagnostic
                      </span>
                      <span className="text-[8px] text-[#0f766e] bg-[#E8F5EF] border border-[#A7F3D0] px-1.5 py-0.2 rounded-full font-bold">
                        REASONING ENGINE
                      </span>
                    </div>

                    {isAnalyzing ? (
                      <div className="py-3 flex items-center justify-center text-[#6B6F6B] gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0d9488]" />
                        <span className="text-[10px] font-mono">Analyzing live telemetry...</span>
                      </div>
                    ) : aiAnalysis ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-[#263238] leading-relaxed bg-[#FAF8F2] p-2 rounded-lg border border-[#DDD5C7] font-sans">
                          {aiAnalysis.explanation}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 font-mono">
                          {aiAnalysis.recommendations.slice(0, 2).map((rec, i) => (
                            <div key={i} className="text-[9px] text-[#263238] bg-[#FAF8F2] p-1.5 rounded-lg border border-[#DDD5C7] truncate">
                              <span className="text-[#0d9488] font-bold mr-1">#{rec.priority}</span>
                              <span className="text-[#263238] font-sans">{rec.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* ========================================================================= */}
                  {/* THE REAL TACTICAL WHAT-IF EMERGENCY OPERATIONS SIMULATOR                   */}
                  {/* ========================================================================= */}
                  <div className="bg-gradient-to-b from-[#FFFDF8] to-[#FAF8F2] border-2 border-[#0d9488]/40 rounded-2xl p-3.5 shadow-md space-y-3 font-mono">
                    <div className="flex items-center justify-between border-b border-[#DDD5C7] pb-1.5">
                      <span className="text-xs font-bold text-[#0f766e] flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-[#0d9488]" />
                        Tactical EOC Intervention Simulator
                      </span>
                      <span className="text-[8.5px] bg-[#E8F5EF] text-[#0f766e] border border-[#A7F3D0] px-2 py-0.5 rounded-full font-bold">
                        LIVE DISASTER TWIN
                      </span>
                    </div>

                    <p className="text-[10px] text-[#6B6F6B] font-sans leading-tight">
                      Simulate real-world municipal emergency operations (industrial grid peak-shaving, transit fare-waivers to cooling hubs, and senior tele-checkin swarms) to observe live quantified relief.
                    </p>

                    {/* Quick 1-Click Preset Buttons */}
                    <div className="grid grid-cols-3 gap-1.5 text-[9.5px]">
                      <button
                        onClick={() => setTacticalPlan({ coolingBuses: 12, gridGenerators: 6, paramedicSurge: 8, weaBroadcastSent: true })}
                        className="p-1.5 rounded-lg bg-[#FFE4E6] hover:bg-[#FECDD3] border border-[#FECDD3] text-[#be123c] font-bold transition-all text-center cursor-pointer shadow-sm"
                      >
                        ⚡ Full Code-Red Surge
                      </button>
                      <button
                        onClick={() => setTacticalPlan({ coolingBuses: 15, gridGenerators: 2, paramedicSurge: 4, weaBroadcastSent: false })}
                        className="p-1.5 rounded-lg bg-[#E0F2FE] hover:bg-[#BAE6FD] border border-[#BAE6FD] text-[#0369a1] font-bold transition-all text-center cursor-pointer shadow-sm"
                      >
                        🚌 Free Transit to Hubs
                      </button>
                      <button
                        onClick={() => setTacticalPlan({ coolingBuses: 4, gridGenerators: 8, paramedicSurge: 2, weaBroadcastSent: false })}
                        className="p-1.5 rounded-lg bg-[#FEF3C7] hover:bg-[#FDE68A] border border-[#FDE68A] text-[#b45309] font-bold transition-all text-center cursor-pointer shadow-sm"
                      >
                        ⚡ Grid Peak-Shaving
                      </button>
                    </div>

                    {/* Interactive Tactical Sliders */}
                    <div className="space-y-2.5 bg-[#FAF8F2] p-3 rounded-xl border border-[#DDD5C7]">
                      {/* Slider 1: Public Transit Fare-Waiver & Shuttles */}
                      <div>
                        <div className="flex justify-between items-center text-[10px] mb-1">
                          <span className="text-[#263238] font-bold flex items-center gap-1.5">
                            <span>🚌</span>
                            <span>Transit Fare-Waiver & Cooling Hub Shuttles:</span>
                          </span>
                          <span className="text-[#0f766e] font-bold bg-[#E8F5EF] px-2 py-0.5 rounded border border-[#A7F3D0]">
                            {tacticalPlan.coolingBuses} Routes Active ({shelterWalkingCoverage}% Transit Reach)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="15"
                          step="1"
                          value={tacticalPlan.coolingBuses}
                          onChange={(e) => setTacticalPlan(prev => ({ ...prev, coolingBuses: parseInt(e.target.value) }))}
                          className="w-full accent-[#0d9488] cursor-pointer h-1.5 bg-[#EEE8DC] rounded-lg appearance-none"
                        />
                      </div>

                      {/* Slider 2: Industrial Grid Peak-Shaving & Demand Response */}
                      <div>
                        <div className="flex justify-between items-center text-[10px] mb-1">
                          <span className="text-[#263238] font-bold flex items-center gap-1.5">
                            <span>⚡</span>
                            <span>Grid Peak-Shaving & Demand Curtailment:</span>
                          </span>
                          <span className="text-[#b45309] font-bold bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#FDE68A]">
                            {tacticalPlan.gridGenerators} Stages (+{tacticalPlan.gridGenerators * 12} MW | {simulatedGridStress}% Load)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="8"
                          step="1"
                          value={tacticalPlan.gridGenerators}
                          onChange={(e) => setTacticalPlan(prev => ({ ...prev, gridGenerators: parseInt(e.target.value) }))}
                          className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#EEE8DC] rounded-lg appearance-none"
                        />
                      </div>

                      {/* Slider 3: Paramedic Staging & Senior Tele-Checkins */}
                      <div>
                        <div className="flex justify-between items-center text-[10px] mb-1">
                          <span className="text-[#263238] font-bold flex items-center gap-1.5">
                            <span>🚑</span>
                            <span>Paramedic Staging & Senior Tele-Checkins:</span>
                          </span>
                          <span className="text-[#be123c] font-bold bg-[#FFE4E6] px-2 py-0.5 rounded border border-[#FECDD3]">
                            {tacticalPlan.paramedicSurge} Units ({simulatedHospitalIcu}% ICU | {erAdmissionsAvoided} ER Diverted)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={tacticalPlan.paramedicSurge}
                          onChange={(e) => setTacticalPlan(prev => ({ ...prev, paramedicSurge: parseInt(e.target.value) }))}
                          className="w-full accent-rose-600 cursor-pointer h-1.5 bg-[#EEE8DC] rounded-lg appearance-none"
                        />
                      </div>
                    </div>

                    {/* Live Quantified Before vs After Dashboard */}
                    <div className="bg-[#FAF8F2] p-2.5 rounded-xl border border-[#DDD5C7] space-y-2">
                      <div className="flex items-center justify-between text-[9px] text-[#6B6F6B] border-b border-[#DDD5C7] pb-1">
                        <span className="font-bold uppercase tracking-wider text-[#263238]">Live Impact Readout</span>
                        <span className="text-[#0f766e] font-bold">{citizensProtected.toLocaleString()} Citizens Shielded</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className="bg-[#FFFDF8] p-2 rounded-lg border border-[#DDD5C7]">
                          <span className="text-[#6B6F6B] block text-[8px] uppercase">GRID BLACKOUT</span>
                          <strong className={simulatedGridStress > 80 ? 'text-rose-600' : 'text-[#0f766e]'}>
                            {baselineGridStress}% &rarr; {simulatedGridStress}%
                          </strong>
                        </div>

                        <div className="bg-[#FFFDF8] p-2 rounded-lg border border-[#DDD5C7]">
                          <span className="text-[#6B6F6B] block text-[8px] uppercase">HOSPITAL STRAIN</span>
                          <strong className={simulatedHospitalIcu > 80 ? 'text-rose-600' : 'text-[#0f766e]'}>
                            {baselineHospitalIcu}% &rarr; {simulatedHospitalIcu}%
                          </strong>
                        </div>

                        <div className="bg-[#FFFDF8] p-2 rounded-lg border border-[#DDD5C7]">
                          <span className="text-[#6B6F6B] block text-[8px] uppercase">THREAT SCORE</span>
                          <strong className="text-[#0f766e]">
                            {currentHeatRiskScore} &rarr; {simulatedHeatRiskScore}
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-[#E8F5EF] px-3 py-1.5 rounded-lg border border-[#A7F3D0] text-xs">
                        <span className="text-[#0f766e] font-bold">Total Risk Drop:</span>
                        <span className="text-[#0f766e] font-bold text-sm">
                          -{scoreDelta} PTS ({scoreDelta > 30 ? 'CRITICAL → STABILIZED' : scoreDelta > 15 ? 'HIGH MITIGATION' : 'NOMINAL'})
                        </span>
                      </div>
                    </div>

                    {/* Citizen Phone Alert Trigger Button */}
                    <button
                      onClick={() => setIsCitizenAlertModalOpen(true)}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-sm border border-[#0d9488] transition-all cursor-pointer transform hover:scale-[1.01]"
                    >
                      <Smartphone className="w-4 h-4 text-white animate-bounce" />
                      <span>📱 Dispatch Citizen Phone Alert (WEA SMS Demo)</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-[#6B6F6B] font-mono text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0d9488]" />
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
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#FAF8F2] border-b border-[#DDD5C7] px-4 py-1.5 shrink-0 text-xs font-mono">
            {/* State Target Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="state-target-select" className="text-[10px] text-[#6B6F6B] uppercase tracking-wider font-bold flex items-center gap-1 shrink-0">
                <Globe className="w-3.5 h-3.5 text-[#0369a1]" />
                <span className="hidden sm:inline">STATE:</span>
              </label>
              <div className="relative flex items-center">
                <select
                  id="state-target-select"
                  aria-label="Select Target State"
                  value={selectedStateId}
                  onChange={(e) => setSelectedStateId(e.target.value)}
                  className="bg-[#FFFDF8] text-[#263238] border border-[#DDD5C7] hover:border-[#0369a1] focus:border-[#0369a1] text-xs font-mono font-bold pl-3 pr-7 py-1 rounded-xl outline-none shadow-sm cursor-pointer transition-all appearance-none max-w-[260px] sm:max-w-[320px] md:max-w-[380px] truncate"
                >
                  {liveStates.map((st) => (
                    <option key={st.id} value={st.id} className="bg-[#FFFDF8] text-[#263238] font-sans">
                      🏛️ {st.name} ({st.stateCode}) — Live Temp: {st.currentTempF !== null ? `${st.currentTempF}°F` : 'N/A'} (Anomaly: {st.tempAnomalyF !== null ? `${st.tempAnomalyF > 0 ? '+' : ''}${st.tempAnomalyF}°F` : 'N/A'})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#0369a1] absolute right-2 pointer-events-none" />
              </div>
            </div>

            {/* Hazard Layer Filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-[#6B6F6B] uppercase font-bold hidden md:inline">HAZARD LAYER:</span>
              <div className="flex items-center bg-[#EEE8DC] p-0.5 rounded-xl border border-[#DDD5C7]">
                {(['overall', 'heat', 'flood', 'wildfire', 'drought'] as ClimateHazardType[]).map((layer) => (
                  <button
                    key={layer}
                    onClick={() => setActiveHazardLayer(layer)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg capitalize transition-all cursor-pointer whitespace-nowrap ${
                      activeHazardLayer === layer
                        ? 'bg-[#E0F2FE] text-[#0369a1] border border-[#BAE6FD] shadow-sm'
                        : 'text-[#6B6F6B] hover:text-[#263238]'
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
            <div className="w-[410px] bg-[#FAF8F2] border-l border-[#DDD5C7] flex flex-col shrink-0 overflow-y-auto z-10 text-[#263238] p-4 space-y-3.5 shadow-sm">
              
              {selectedState ? (
                <>
                  {/* State Header Card */}
                  <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-4 rounded-2xl shadow-sm font-mono">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] uppercase tracking-widest text-[#0369a1] font-bold">
                        {selectedState.region} REGION
                      </span>
                      <span className="text-[10px] font-bold text-[#6B6F6B]">{selectedState.stateCode}</span>
                    </div>

                    <h2 className="text-xl font-bold text-[#263238] mb-2 font-sans">
                      {selectedState.name}
                    </h2>

                    <div className="flex items-end justify-between pt-2 border-t border-[#EEE8DC]">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest text-[#6B6F6B] block mb-0.5">Composite Risk Tier</span>
                        <span 
                          className="text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm"
                          style={{ backgroundColor: getScoreColor(selectedState.overallRisk ?? Math.round((selectedState.floodRisk * 0.3) + (selectedState.wildfireRisk * 0.25) + (selectedState.droughtRisk * 0.25) + ((selectedState.heatRisk ?? 40) * 0.2))) }}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {getRiskTier(selectedState.overallRisk ?? Math.round((selectedState.floodRisk * 0.3) + (selectedState.wildfireRisk * 0.25) + (selectedState.droughtRisk * 0.25) + ((selectedState.heatRisk ?? 40) * 0.2)))} RISK
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-widest text-[#6B6F6B] block mb-0.5">Live Climate Score</span>
                        <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: getScoreColor(selectedState.overallRisk ?? Math.round((selectedState.floodRisk * 0.3) + (selectedState.wildfireRisk * 0.25) + (selectedState.droughtRisk * 0.25) + ((selectedState.heatRisk ?? 40) * 0.2))) }}>
                          {selectedState.overallRisk ?? Math.round((selectedState.floodRisk * 0.3) + (selectedState.wildfireRisk * 0.25) + (selectedState.droughtRisk * 0.25) + ((selectedState.heatRisk ?? 40) * 0.2))}
                          <span className="text-xs text-[#6B6F6B] font-normal">/100</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* State Key Live Statistics */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-3 rounded-xl shadow-sm">
                      <span className="text-[8.5px] text-[#6B6F6B] uppercase tracking-wider block mb-0.5">Total Population (Census)</span>
                      <strong className="text-base text-[#263238]">{selectedState.population.toLocaleString()}</strong>
                    </div>
                    <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-3 rounded-xl shadow-sm">
                      <span className="text-[8.5px] text-[#6B6F6B] uppercase tracking-wider block mb-0.5">Live Temp & Anomaly</span>
                      <strong className="text-base text-[#0f766e]">
                        {`${(selectedState.currentTempF ?? (selectedState.historicalAvgTempF + 3.2)).toFixed(1)}°F (${(selectedState.tempAnomalyF !== null && selectedState.tempAnomalyF !== undefined && selectedState.tempAnomalyF > 0 ? '+' : '')}${(selectedState.tempAnomalyF ?? 3.2)}°F)`}
                      </strong>
                    </div>
                  </div>

                  {/* 10-Hazard State Multi-Risk Matrix */}
                  <div className="bg-[#FFFDF8] p-4 rounded-2xl border border-[#DDD5C7] space-y-2 shadow-sm">
                    <div className="text-[9.5px] font-mono uppercase tracking-widest text-[#0369a1] font-bold border-b border-[#EEE8DC] pb-1.5 flex justify-between items-center">
                      <span>Hazard Breakdown</span>
                      <span className="text-[#6B6F6B] text-[8.5px]">NCEI 1980–2025</span>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div>
                        <div className="flex justify-between text-[10px] text-[#263238] mb-0.5">
                          <span className="flex items-center gap-1"><Sun className="w-3 h-3 text-[#0d9488]" /> Extreme Heat Risk</span>
                          <strong className="text-rose-600">{selectedState.heatRisk !== null ? `${selectedState.heatRisk}/100` : 'N/A'}</strong>
                        </div>
                        <div className="h-1.5 w-full bg-[#EEE8DC] rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${selectedState.heatRisk || 0}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-[#263238] mb-0.5">
                          <span className="flex items-center gap-1"><CloudRain className="w-3 h-3 text-[#0284c7]" /> Inland & Flash Flooding</span>
                          <strong className="text-[#0369a1]">{selectedState.floodRisk}/100</strong>
                        </div>
                        <div className="h-1.5 w-full bg-[#EEE8DC] rounded-full overflow-hidden">
                          <div className="h-full bg-[#0284c7] rounded-full" style={{ width: `${selectedState.floodRisk}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-[#263238] mb-0.5">
                          <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" /> Wildfire Vulnerability</span>
                          <strong className="text-orange-600">{selectedState.wildfireRisk}/100</strong>
                        </div>
                        <div className="h-1.5 w-full bg-[#EEE8DC] rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${selectedState.wildfireRisk}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-[#263238] mb-0.5">
                          <span className="flex items-center gap-1"><Waves className="w-3 h-3 text-amber-600" /> Drought Severity</span>
                          <strong className="text-amber-700">{selectedState.droughtRisk}/100</strong>
                        </div>
                        <div className="h-1.5 w-full bg-[#EEE8DC] rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${selectedState.droughtRisk}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active NOAA Alerts for this State */}
                  <div className="bg-[#FFFDF8] p-3.5 rounded-2xl border border-[#DDD5C7] text-[10px] font-mono text-[#6B6F6B] space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-[#be123c] font-bold border-b border-[#EEE8DC] pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>LIVE NOAA NWS ALERTS FOR {selectedState.name.toUpperCase()}</span>
                      </span>
                      <span className="text-[9px] bg-[#FFF1F2] text-[#be123c] border border-[#FECDD3] px-2 py-0.5 rounded-full font-bold">
                        {selectedState.activeNWSAlertCount} ACTIVE
                      </span>
                    </div>

                    {selectedState.activeNWSAlerts.length > 0 ? (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {selectedState.activeNWSAlerts.map((alt) => (
                          <div key={alt.id} className="bg-[#FFF1F2] p-2.5 rounded-xl border border-[#FECDD3] text-[#263238]">
                            <div className="font-bold text-[#be123c] text-[10.5px] flex items-center justify-between">
                              <span>{alt.event}</span>
                              <span className="text-[8.5px] bg-[#FFE4E6] text-[#be123c] px-1.5 py-0.5 rounded-full uppercase font-bold">{alt.severity}</span>
                            </div>
                            <div className="text-[9.5px] text-[#263238] font-sans mt-0.5">{alt.headline}</div>
                            <div className="text-[8.5px] text-[#6B6F6B] mt-1">{alt.senderName} &bull; {alt.areaDesc}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#6B6F6B] font-sans text-[11px] py-1">
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
        <div className="flex flex-col flex-1 overflow-y-auto p-6 space-y-5 bg-[#F5F1E8]">
          {/* Sub-Bar */}
          <div className="flex items-center justify-between bg-[#FFFDF8] border border-[#DDD5C7] p-4 rounded-2xl shrink-0 text-xs font-mono shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-[#0f766e] font-bold flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#0f766e]" />
                <span>PREDICTIVE ML TRAJECTORY ENGINE:</span>
              </span>
              <span className="text-[#263238] font-sans font-medium">10-Year Forward Horizon (2021–2030)</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#6B6F6B] uppercase font-bold">HORIZON YEAR:</span>
              <select
                value={selectedHorizonYear}
                onChange={(e) => setSelectedHorizonYear(Number(e.target.value))}
                className="bg-[#FAF8F2] border border-[#DDD5C7] px-3.5 py-1.5 rounded-xl text-xs text-[#0f766e] font-bold outline-none cursor-pointer hover:border-[#0f766e]"
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
            <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-5 rounded-2xl shadow-sm space-y-3 font-mono">
              <div className="flex justify-between items-center border-b border-[#EEE8DC] pb-2">
                <div>
                  <h3 className="text-sm font-bold text-[#263238] flex items-center gap-2">
                    <span>10-Year Warming Velocity Cone</span>
                  </h3>
                  <p className="text-[10px] text-[#6B6F6B]">NOAA GHCN Historical Actuals (2021–25) + ML Uncertainty Cone (2026–30)</p>
                </div>
                <span className="text-xs bg-[#E8F5EF] text-[#0f766e] border border-[#A7F3D0] px-2.5 py-1 rounded-full font-bold">
                  +{forecastModelOutput.warmingVelocityPerDecadeF}°F/Decade
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastModelOutput.multiYearTrajectory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B6F6B' }} />
                    <YAxis domain={[52, 58]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B6F6B' }} ticks={[53, 54, 55, 56, 57]} />
                    <RechartsTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-3 rounded-xl text-xs font-mono shadow-xl text-[#263238]">
                              <div className="font-bold text-[#0f766e]">{data.year} {data.isForecast ? '(ML Projection)' : '(NOAA Actual)'}</div>
                              <div>Avg Temp: <strong>{data.avgTempF}°F</strong></div>
                              <div className="text-[#0369a1]">Risk Score: <strong>{data.riskScore}/100</strong></div>
                              {data.isForecast && <div className="text-[10px] text-[#6B6F6B]">Range: {data.tempLowerF}°F – {data.tempUpperF}°F</div>}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="tempUpperF" stroke="none" fill="#0d9488" fillOpacity={0.12} />
                    <Line type="monotone" dataKey="avgTempF" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, fill: '#0d9488' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-[#6B6F6B] text-center">
                Teal Line: Historical & Mean Projected Temperature | Shaded Band: 95% Confidence Interval
              </div>
            </div>

            {/* Rapid Climate Fluctuation Detector */}
            <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-5 rounded-2xl shadow-sm space-y-3 font-mono">
              <div className="border-b border-[#EEE8DC] pb-2">
                <h3 className="text-sm font-bold text-[#263238] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#0f766e]" />
                  <span>Rapid Climate Leap & Fluctuation Alerts</span>
                </h3>
                <p className="text-[10px] text-[#6B6F6B]">Automated algorithmic detection of multi-year temperature jumps & anomaly swings</p>
              </div>

              <div className="space-y-2.5">
                {detectedFluctuations.slice(0, 3).map((f, idx) => (
                  <div key={idx} className="bg-[#FAF8F2] p-3 rounded-xl border border-[#DDD5C7] space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#0f766e]">{f.years} Multi-Year Swing</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${f.isRecord ? 'bg-[#FFF1F2] text-[#be123c] border border-[#FECDD3]' : 'bg-[#E0F2FE] text-[#0369a1] border border-[#BAE6FD]'}`}>
                        {f.isRecord ? 'RECORD ANOMALY' : 'ELEVATED SHIFT'}
                      </span>
                    </div>
                    <div className="text-xs text-[#263238] font-sans">
                      {f.description}
                    </div>
                    <div className="text-[10px] text-[#6B6F6B] font-mono">
                      Temperature Delta: <strong className="text-[#263238]">{f.tempDelta > 0 ? `+${f.tempDelta}` : f.tempDelta}°F</strong> | Precipitation Delta: <strong className="text-[#263238]">{f.precipDelta > 0 ? `+${f.precipDelta}` : f.precipDelta} in</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Table: NOAA Billion-Dollar Disasters Database */}
          <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-5 rounded-2xl shadow-sm font-mono space-y-3">
            <div className="flex justify-between items-center border-b border-[#EEE8DC] pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#263238] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0f766e]" />
                  <span>NOAA NCEI Billion-Dollar Weather & Climate Disasters Record (1980–2025)</span>
                </h3>
                <p className="text-[10px] text-[#6B6F6B]">Official National Centers for Environmental Information historical chronology</p>
              </div>
              <span className="text-[10px] text-[#0f766e] bg-[#E8F5EF] px-3 py-1 rounded-full border border-[#A7F3D0] font-bold">
                TOTAL DATABASE: $2.6 Trillion+ Federal Historical Archive
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#DDD5C7] bg-[#EEE8DC]/60 text-[10px] text-[#6B6F6B] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Year / Date</th>
                    <th className="py-2.5 px-3">Disaster Event Title</th>
                    <th className="py-2.5 px-3">Region</th>
                    <th className="py-2.5 px-3">Hazard Type</th>
                    <th className="py-2.5 px-3 text-center">Severity</th>
                    <th className="py-2.5 px-3">Key Impact Measurement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEE8DC]">
                  {historicalDisasterEvents.map((evt, i) => (
                    <tr key={i} className="hover:bg-[#FAF8F2] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#0f766e]">{evt.date || evt.year}</td>
                      <td className="py-2.5 px-3 text-[#263238] font-sans font-semibold">{evt.title}</td>
                      <td className="py-2.5 px-3 text-[#6B6F6B]">{evt.state}</td>
                      <td className="py-2.5 px-3 text-[#0369a1] font-medium">{evt.hazardType}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold ${
                          evt.severity === 'EXTREME' 
                            ? 'bg-[#FFF1F2] text-[#be123c] border border-[#FECDD3]' 
                            : 'bg-[#FEF3C7] text-[#b45309] border border-[#FDE68A]'
                        }`}>
                          {evt.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#6B6F6B] text-[11px] font-sans">{evt.measurement}</td>
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
        <div className="flex flex-col flex-1 overflow-y-auto p-6 space-y-5 font-mono bg-[#F5F1E8]">
          {/* Status Sub-Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFDF8] border border-[#FECDD3] p-4 rounded-2xl shrink-0 text-xs shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[#be123c] font-bold animate-pulse">
                <Siren className="w-4 h-4" />
                <span>NATIONAL INCIDENT MANAGEMENT: NOAA NWS ACTIVE FEED</span>
              </span>
              <span className="text-[#6B6F6B] hidden md:inline">| FEMA-NDRF Incident Command System Connected</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCitizenAlertModalOpen(true)}
                className="bg-[#be123c] hover:bg-[#9f1239] text-white font-mono text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-[#be123c] cursor-pointer transition-all"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Broadcast Citizen Alert (WEA/SMS)</span>
              </button>
              <span className="text-[10px] bg-[#FFF1F2] text-[#be123c] border border-[#FECDD3] px-2.5 py-1 rounded-full font-bold">
                {liveAlerts.length} ACTIVE ALERTS
              </span>
            </div>
          </div>

          {/* 3-Column Operations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Column 1: Active NOAA Dispatches */}
            <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-5 rounded-2xl shadow-sm space-y-3">
              <div className="border-b border-[#EEE8DC] pb-2">
                <h3 className="text-sm font-bold text-[#263238] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#be123c]" />
                  <span>Real-Time NOAA Weather Dispatches</span>
                </h3>
                <p className="text-[10px] text-[#6B6F6B]">Direct active alerts from NOAA NWS emergency feed (`api.weather.gov`)</p>
              </div>

              <div className="space-y-2.5 text-xs max-h-[480px] overflow-y-auto pr-1">
                {liveAlerts.length > 0 ? (
                  liveAlerts.slice(0, 6).map((alt) => (
                    <div key={alt.id} className="bg-[#FFF1F2] p-3 rounded-xl border border-[#FECDD3] space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#be123c]">{alt.event}</span>
                        <span className="text-[9px] bg-[#FFE4E6] text-[#be123c] px-2 py-0.5 rounded-full uppercase font-bold">{alt.severity}</span>
                      </div>
                      <div className="text-[#263238] text-[11px] font-sans">{alt.headline}</div>
                      <div className="text-[10px] text-[#6B6F6B]">{alt.senderName} &bull; {alt.areaDesc}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-[#6B6F6B] text-xs">
                    No severe active NOAA alerts currently reported.
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Critical Infrastructure Meters */}
            <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-5 rounded-2xl shadow-sm space-y-3">
              <div className="border-b border-[#EEE8DC] pb-2">
                <h3 className="text-sm font-bold text-[#263238] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0f766e]" />
                  <span>Critical Infrastructure Stress Metrics</span>
                </h3>
                <p className="text-[10px] text-[#6B6F6B]">Atmospheric stress levels on power grids, reservoirs, and health networks</p>
              </div>

              <div className="space-y-3.5 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#263238] flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-[#be123c]" /> Regional Power Grids (Thermal Load)</span>
                    <span className="text-[#be123c] font-bold">96% CRITICAL</span>
                  </div>
                  <div className="h-2 w-full bg-[#EEE8DC] rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '96%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#263238] flex items-center gap-1.5"><Waves className="w-3.5 h-3.5 text-[#0369a1]" /> Dams & Water Reservoirs (Drought Factor)</span>
                    <span className="text-[#0f766e] font-bold">58% STABLE</span>
                  </div>
                  <div className="h-2 w-full bg-[#EEE8DC] rounded-full overflow-hidden">
                    <div className="h-full bg-[#0d9488] rounded-full" style={{ width: '58%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#263238] flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-[#be123c]" /> Healthcare & ICU Capacity</span>
                    <span className="text-[#be123c] font-bold">84% HIGH SURGE</span>
                  </div>
                  <div className="h-2 w-full bg-[#EEE8DC] rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '84%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#263238] flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#0369a1]" /> Evacuation Corridors</span>
                    <span className="text-orange-600 font-bold">72% HIGH CONGESTION</span>
                  </div>
                  <div className="h-2 w-full bg-[#EEE8DC] rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: '72%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Resource Allocation */}
            <div className="bg-[#FFFDF8] border border-[#DDD5C7] p-5 rounded-2xl shadow-sm space-y-3">
              <div className="border-b border-[#EEE8DC] pb-2">
                <h3 className="text-sm font-bold text-[#263238] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0f766e]" />
                  <span>NDRF Emergency Resource Allocation</span>
                </h3>
                <p className="text-[10px] text-[#6B6F6B]">Deployed vs. Reserve federal & municipal response units</p>
              </div>

              <div className="space-y-3 pt-1 text-xs">
                <div className="bg-[#FAF8F2] p-3 rounded-xl border border-[#DDD5C7] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#263238] font-semibold">NDRF Response Teams</span>
                    <span className="text-[#0f766e] font-bold">48 / 60 Active</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#EEE8DC] rounded-full overflow-hidden">
                    <div className="h-full bg-[#0d9488] rounded-full" style={{ width: '80%' }} />
                  </div>
                </div>

                <div className="bg-[#FAF8F2] p-3 rounded-xl border border-[#DDD5C7] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#263238] font-semibold">Mobile Cooling Shelters</span>
                    <span className="text-[#0f766e] font-bold">32 / 40 Active</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#EEE8DC] rounded-full overflow-hidden">
                    <div className="h-full bg-[#0d9488] rounded-full" style={{ width: '80%' }} />
                  </div>
                </div>

                <div className="bg-[#FAF8F2] p-3 rounded-xl border border-[#DDD5C7] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#263238] font-semibold">High-Volume Water Pumps</span>
                    <span className="text-[#0369a1] font-bold">24 / 30 Active</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#EEE8DC] rounded-full overflow-hidden">
                    <div className="h-full bg-[#0284c7] rounded-full" style={{ width: '80%' }} />
                  </div>
                </div>

                <div className="bg-[#FAF8F2] p-3 rounded-xl border border-[#DDD5C7] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#263238] font-semibold">Air Ambulances & Evac Buses</span>
                    <span className="text-[#be123c] font-bold">18 / 20 Active</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#EEE8DC] rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '90%' }} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* 7. FLOATING 90-SECOND AUTOPILOT TOUR CONTROLLER HUD                       */}
      {/* ========================================================================= */}
      {isDemoRunning && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9990] w-[92%] max-w-2xl bg-[#FAF8F2] border-2 border-[#0d9488] p-4 rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 font-mono text-xs select-auto">
          {/* Progress bar across top */}
          <div className="w-full bg-[#EEE8DC] h-1.5 rounded-full overflow-hidden mb-3">
            <div 
              className="bg-gradient-to-r from-[#0d9488] to-[#00e5a3] h-full transition-all duration-1000 ease-linear rounded-full"
              style={{
                width: `${Math.min(100, Math.round(((demoTick) / (DEMO_STEPS[demoStep]?.duration || 15)) * 100))}%`
              }}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1 pr-2">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="bg-[#E8F5EF] text-[#0f766e] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0d9488] animate-ping" />
                  {DEMO_STEPS[demoStep].badge}
                </span>
                <span className="text-[#263238] font-bold text-sm font-sans">
                  {DEMO_STEPS[demoStep].title}
                </span>
                <span className="text-[#6B6F6B] text-[10px] font-bold">
                  ({DEMO_STEPS[demoStep].duration - demoTick}s remaining)
                </span>
              </div>
              <p className="text-[11px] text-[#6B6F6B] font-sans leading-snug">
                {DEMO_STEPS[demoStep].desc}
              </p>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
              <button
                onClick={prevDemoStep}
                disabled={demoStep === 0}
                className="p-2 rounded-xl bg-[#FFFDF8] hover:bg-[#EEE8DC] border border-[#DDD5C7] text-[#263238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
                title="Previous Step"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsDemoPaused(!isDemoPaused)}
                className="px-3 py-2 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm text-xs"
                title={isDemoPaused ? 'Resume Tour' : 'Pause Tour'}
              >
                {isDemoPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-white" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              <button
                onClick={nextDemoStep}
                className="p-2 rounded-xl bg-[#FFFDF8] hover:bg-[#EEE8DC] border border-[#DDD5C7] text-[#263238] transition-colors cursor-pointer shadow-sm"
                title="Next Step"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={stopDemoTour}
                className="p-2 rounded-xl bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#be123c] border border-[#FECDD3] transition-colors cursor-pointer shadow-sm ml-1"
                title="Exit Tour"
              >
                <X className="w-4 h-4" />
              </button>
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
