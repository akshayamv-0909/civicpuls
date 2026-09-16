"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { mockCityData, ScenarioType } from '@/data/mockCityData';
import { calculateHeatRiskScore, getRiskColor, getRiskLevel } from '@/lib/riskEngine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Thermometer, Users, Wind, ArrowRight, Loader2, Info, Bookmark, ChevronRight, ShieldAlert } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-stone-100 text-slate-400">Loading Map Engine...</div>
});

interface AIAnalysis {
  explanation: string;
  recommendations: Array<{ priority: number; action: string; reason: string }>;
}

type InterventionType = 'none' | 'cooling_center' | 'medical_deploy' | 'evacuation';

export default function Dashboard() {
  const [scenario, setScenario] = useState<ScenarioType>('NORMAL');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Simulator State
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [intervention, setIntervention] = useState<InterventionType>('none');

  const baseZones = mockCityData[scenario];
  
  // Apply simulation overrides to zones
  const activeZones = baseZones.map(zone => {
    if (simulatorOpen && zone.id === selectedZoneId) {
      if (intervention === 'cooling_center') {
        return { ...zone, cooling_capacity: 'High' as const };
      }
      if (intervention === 'medical_deploy') {
        return { ...zone, emergency_resources: 'High' as const };
      }
      if (intervention === 'evacuation') {
        return { ...zone, elderly_population: Math.max(0, zone.elderly_population - 15) };
      }
    }
    return zone;
  });

  const baseSelectedZone = baseZones.find(z => z.id === selectedZoneId);
  const activeSelectedZone = activeZones.find(z => z.id === selectedZoneId);

  // Current states based on whether simulator is active
  const currentRiskScore = baseSelectedZone ? calculateHeatRiskScore(baseSelectedZone) : 0;
  const simulatedRiskScore = activeSelectedZone ? calculateHeatRiskScore(activeSelectedZone) : 0;
  
  const currentRiskColor = getRiskColor(currentRiskScore);
  const simulatedRiskColor = getRiskColor(simulatedRiskScore);

  // City-wide Summary Metrics
  const highRiskZones = activeZones.filter(z => calculateHeatRiskScore(z) >= 60);
  const activeHighRiskCount = highRiskZones.length;
  const totalPopulationExposed = highRiskZones.reduce((acc, z) => acc + z.population, 0);
  const avgCityRisk = Math.round(activeZones.reduce((acc, z) => acc + calculateHeatRiskScore(z), 0) / activeZones.length);

  // Deltas vs Normal
  const normalZones = mockCityData['NORMAL'];
  const normalHighRiskCount = normalZones.filter(z => calculateHeatRiskScore(z) >= 60).length;
  const normalPopExposed = normalZones.filter(z => calculateHeatRiskScore(z) >= 60).reduce((acc, z) => acc + z.population, 0);
  const normalAvgRisk = Math.round(normalZones.reduce((acc, z) => acc + calculateHeatRiskScore(z), 0) / normalZones.length);

  const diffHighRisk = activeHighRiskCount - normalHighRiskCount;
  const diffPopExposed = totalPopulationExposed - normalPopExposed;
  const diffAvgRisk = avgCityRisk - normalAvgRisk;

  // 24-Hour Simulated Risk Trend (Generated dynamically based on current score)
  const simulatedTrendData = Array.from({ length: 7 }).map((_, i) => {
    const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];
    return {
      time: hours[i],
      Risk: Math.max(0, currentRiskScore - (6 - i) * 6), // Artificial curve leading up to current score
    };
  });

  // Simulated Incident Timeline
  const timelineEvents = scenario === 'NORMAL' 
    ? [
        { time: '08:00', text: 'System baseline established' },
        { time: '09:30', text: 'Routine sensor calibration' },
        { time: '10:15', text: 'City conditions nominal' }
      ]
    : [
        { time: '08:00', text: 'System baseline established' },
        { time: '09:30', text: 'Heat conditions rising steadily' },
        { time: '14:00', text: 'Heat warning threshold crossed' },
        { time: '14:45', text: 'High risk exposure detected' },
        { time: '15:30', text: 'Automated emergency protocols advised' }
      ];

  useEffect(() => {
    let isMounted = true;
    setAiAnalysis(null);
    
    if (baseSelectedZone && !simulatorOpen) {
      const fetchAnalysis = async () => {
        setIsAnalyzing(true);
        try {
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zone: baseSelectedZone, riskScore: currentRiskScore }),
            cache: 'no-store'
          });
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              setAiAnalysis(data);
            }
          }
        } catch (error) {
          console.error("Failed to fetch analysis", error);
        } finally {
          if (isMounted) {
            setIsAnalyzing(false);
          }
        }
      };
      fetchAnalysis();
    }
    
    return () => {
      isMounted = false;
    };
  }, [selectedZoneId, scenario, currentRiskScore, baseSelectedZone, simulatorOpen]);

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-900 flex-col overflow-hidden font-sans">
      
      {/* HEADER - Deep Navy */}
      <header className="flex h-14 items-center justify-between px-6 bg-[#0f172a] text-white shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-blue-500 flex items-center justify-center rounded-md shrink-0">
            <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-4 mt-0.5">
            <h1 className="text-2xl font-bold tracking-wide uppercase">CIVICPULSE</h1>
            <div className="text-xs text-slate-400 uppercase tracking-[0.2em] hidden sm:block font-medium">Urban Risk Intelligence</div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-[9px] text-slate-400 uppercase tracking-widest hidden sm:block">
            Washington Metro <span className="mx-1 text-slate-600">|</span> Demonstration Environment
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest pr-1 hidden md:block">Scenario</span>
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-sm">
              <button 
                onClick={() => { setScenario('NORMAL'); setSimulatorOpen(false); }}
                className={`text-[10px] font-medium px-4 py-1.5 rounded-sm transition-colors ${scenario === 'NORMAL' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Normal Conditions
              </button>
              <button 
                onClick={() => { setScenario('EXTREME_HEAT'); setSelectedZoneId('zone-17'); setSimulatorOpen(false); }}
                className={`text-[10px] font-medium px-4 py-1.5 rounded-sm transition-colors flex items-center gap-1.5 ${scenario === 'EXTREME_HEAT' ? 'bg-[#ef4444] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Extreme Heat
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* LEFT COLUMN: CITY OVERVIEW */}
        <section className="w-[320px] bg-white border-r border-slate-200 p-6 flex flex-col shrink-0 overflow-y-auto z-10">
          
          <div className="mb-8">
            <h2 className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-1">City Overview</h2>
            <h1 className="font-serif text-[26px] font-bold text-slate-900 mb-2 leading-tight">Washington Metro</h1>
            <p className="text-xs text-slate-500 leading-relaxed pr-4">Real-time insights for a safer, more resilient city.</p>
          </div>

          <div className="mb-8">
            <h2 className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-2">City Status</h2>
            <div className={`p-4 rounded-sm border-l-4 ${scenario === 'NORMAL' ? 'bg-green-50 border-green-500' : 'bg-red-50/50 border-red-500'}`}>
              <div className={`text-xs font-bold mb-1 ${scenario === 'NORMAL' ? 'text-green-700' : 'text-red-700'}`}>
                {scenario === 'NORMAL' ? 'NOMINAL CONDITIONS' : 'EXTREME HEAT EVENT'}
              </div>
              <div className="text-[11px] text-slate-600 leading-snug pr-2">
                {scenario === 'NORMAL' 
                  ? 'City operations normal. No priority risk zones identified.'
                  : `Elevated heat conditions across the metro. ${activeHighRiskCount} priority zones identified.`}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 mb-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-1">High-Risk Zones</div>
                <div className={`text-3xl font-bold tabular-nums ${activeHighRiskCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  {activeHighRiskCount}
                </div>
              </div>
              {diffHighRisk > 0 && (
                <div className="text-xs font-bold text-red-600 flex items-center">
                  <span className="text-[10px] mr-1">▲</span> +{diffHighRisk} <span className="text-[10px] text-slate-400 font-normal ml-1">vs. normal</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Population Exposed</div>
                <div className="text-3xl font-bold tabular-nums text-slate-900">
                  {totalPopulationExposed.toLocaleString()}
                </div>
              </div>
              {diffPopExposed > 0 && (
                <div className="text-xs font-bold text-red-600 flex items-center">
                  <span className="text-[10px] mr-1">▲</span> +{diffPopExposed.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal ml-1">vs. normal</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Average City Risk</div>
                <div className="text-3xl font-bold tabular-nums" style={{ color: getRiskColor(avgCityRisk) }}>
                  {avgCityRisk} <span className="text-base text-slate-400 font-normal">/100</span>
                </div>
              </div>
              {diffAvgRisk > 0 && (
                <div className="text-xs font-bold text-red-600 flex items-center">
                  <span className="text-[10px] mr-1">▲</span> +{diffAvgRisk} <span className="text-[10px] text-slate-400 font-normal ml-1">vs. normal</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-4">Simulated Incident Timeline</h2>
            <div className="relative border-l border-slate-200 ml-2 space-y-4 pb-2">
              {timelineEvents.map((event, idx) => (
                <div key={idx} className="relative pl-4">
                  <div className={`absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full border-2 border-white ${scenario === 'EXTREME_HEAT' && idx > 1 ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                  <div className={`text-[10px] font-medium mb-0.5 ${scenario === 'EXTREME_HEAT' && idx > 1 ? 'text-red-500' : 'text-slate-400'}`}>{event.time}</div>
                  <div className="text-xs text-slate-700 leading-snug">{event.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-4 flex gap-2 items-start text-slate-400">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            <div className="text-[9px] uppercase tracking-widest leading-tight">
              Simulated sensor data.<br/>Prototype environment only.
            </div>
          </div>
        </section>

        {/* CENTER COLUMN: MAP */}
        <section className="flex-1 relative bg-stone-100 z-0">
          <Map 
            zones={activeZones}
            selectedZoneId={selectedZoneId}
            onZoneSelect={(id) => {
              setSelectedZoneId(id);
              setSimulatorOpen(false);
            }}
          />
          
          {/* Map Legend */}
          <div className="absolute bottom-6 left-6 z-[1000] pointer-events-none">
            <div className="bg-[#0f172a] p-4 rounded-lg shadow-xl pointer-events-auto border border-slate-700/50">
              <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-3">Risk Level</div>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div><span className="text-[10px] text-slate-300">Low</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div><span className="text-[10px] text-slate-300">Elevated</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div><span className="text-[10px] text-slate-300">High</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-600"></div><span className="text-[10px] text-slate-300">Critical</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: INCIDENT BRIEF */}
        <section className="w-[420px] bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.03)]">
          {baseSelectedZone && activeSelectedZone ? (
            <div className="p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* HEADER */}
              <div>
                <div className="flex justify-between items-start mb-1">
                  <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">Incident Brief</div>
                  <Bookmark className="w-4 h-4 text-slate-300" />
                </div>
                <h2 className="font-serif text-[26px] font-bold text-slate-900 mb-6">{baseSelectedZone.name}</h2>
                
                <div className="flex items-end justify-between pb-4 border-b border-slate-100">
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">Status</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-1 rounded-sm flex items-center gap-1.5" style={{ backgroundColor: simulatorOpen ? simulatedRiskColor : currentRiskColor }}>
                      {currentRiskScore >= 60 && <ShieldAlert className="w-3 h-3" />}
                      {getRiskLevel(simulatorOpen ? simulatedRiskScore : currentRiskScore)} RISK
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Risk Score</div>
                    <div className="text-3xl font-bold tabular-nums leading-none" style={{ color: simulatorOpen ? simulatedRiskColor : currentRiskColor }}>
                      {simulatorOpen ? simulatedRiskScore : currentRiskScore} <span className="text-lg text-slate-300 font-normal">/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONDITIONS */}
              <div>
                <h3 className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-3">Conditions</h3>
                <div className="grid grid-cols-2 gap-px bg-slate-100 border border-slate-100 overflow-hidden">
                  <div className="bg-white p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Thermometer className="w-3 h-3 text-slate-400" />
                      <span className="text-[9px] uppercase tracking-widest text-slate-400">Temperature</span>
                    </div>
                    <div className="text-xl font-semibold text-slate-900">{activeSelectedZone.temperature}°C</div>
                  </div>
                  <div className="bg-white p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span className="text-[9px] uppercase tracking-widest text-slate-400">Elderly Pop.</span>
                    </div>
                    <div className={`text-xl font-semibold ${simulatorOpen && intervention === 'evacuation' ? 'text-blue-600' : 'text-slate-900'}`}>
                      {activeSelectedZone.elderly_population}%
                    </div>
                  </div>
                  <div className="bg-white p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Wind className="w-3 h-3 text-slate-400" />
                      <span className="text-[9px] uppercase tracking-widest text-slate-400">Cooling Cap.</span>
                    </div>
                    <div className={`text-xl font-semibold ${simulatorOpen && intervention === 'cooling_center' ? 'text-blue-600' : 'text-slate-900'}`}>
                      {activeSelectedZone.cooling_capacity}
                    </div>
                  </div>
                  <div className="bg-white p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Wind className="w-3 h-3 text-slate-400" />
                      <span className="text-[9px] uppercase tracking-widest text-slate-400">Air Quality</span>
                    </div>
                    <div className="text-xl font-semibold text-slate-900">{activeSelectedZone.air_quality} AQI</div>
                  </div>
                </div>
              </div>

              {!simulatorOpen && (
                <>
                  {/* TREND */}
                  <div>
                    <div className="flex justify-between items-end mb-3">
                      <h3 className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">Simulated 24-Hour Risk Trend</h3>
                      <span className="text-[9px] text-slate-400">Simulated data</span>
                    </div>
                    <div className="h-28 w-full -ml-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={simulatedTrendData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={currentRiskColor} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={currentRiskColor} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} dy={10} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} ticks={[0, 50, 100]} />
                          <Area 
                            type="monotone" 
                            dataKey="Risk" 
                            stroke={currentRiskColor} 
                            fillOpacity={1} 
                            fill="url(#colorRisk)" 
                            strokeWidth={2}
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* AI ASSESSMENT */}
                  <div>
                    <h3 className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-3 flex items-center justify-between">
                      <span>Situation Assessment</span>
                      <span className="text-[9px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-sm font-semibold">AI ASSISTED</span>
                    </h3>
                    
                    {isAnalyzing ? (
                      <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mb-2" />
                        <span className="text-xs">Processing data...</span>
                      </div>
                    ) : aiAnalysis ? (
                      <div className="animate-in fade-in duration-500">
                        <p className="text-xs text-slate-700 leading-relaxed mb-6">
                          {aiAnalysis.explanation}
                        </p>
                        
                        <h3 className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-3">
                          Response Options
                        </h3>
                        
                        <div className="space-y-1 mb-6">
                          {aiAnalysis.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 group cursor-pointer hover:bg-slate-50 px-2 -mx-2 rounded-sm transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                                  {rec.priority}
                                </div>
                                <div className="text-xs font-semibold text-slate-800">{rec.action}</div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-3">
                          <Button 
                            className="bg-[#0f172a] hover:bg-slate-800 text-white rounded-sm font-semibold tracking-wide text-xs h-10 px-6 shadow-none flex items-center gap-2"
                            onClick={() => {
                              setSimulatorOpen(true);
                              setIntervention('cooling_center');
                            }}
                          >
                            Open Intervention Lab
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                          <div className="text-[9px] text-slate-500 leading-tight">
                            Simulate the impact<br/>of response actions
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              )}

              {/* INTERVENTION LAB */}
              {simulatorOpen && (
                <div className="bg-slate-50 border border-blue-200 rounded-sm p-5 relative animate-in fade-in slide-in-from-top-2">
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-600" />
                  
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-[10px] uppercase tracking-widest text-blue-700 font-semibold">Intervention Lab</h3>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase tracking-widest px-2 text-slate-400 hover:text-slate-900" onClick={() => setSimulatorOpen(false)}>
                      Close
                    </Button>
                  </div>

                  <div className="mb-5">
                    <label className="text-[9px] uppercase tracking-widest text-slate-500 mb-2 block font-semibold">Select Action</label>
                    <Select value={intervention} onValueChange={(val) => setIntervention(val as InterventionType)}>
                      <SelectTrigger className="w-full bg-white border-slate-200 rounded-sm text-xs h-9">
                        <SelectValue placeholder="Choose an action..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-sm text-xs z-[100] relative" side="top" alignItemWithTrigger={false}>
                        <SelectItem value="none">No Action (Baseline)</SelectItem>
                        <SelectItem value="cooling_center">Deploy Mobile Cooling Centers</SelectItem>
                        <SelectItem value="medical_deploy">Increase Medical Resources</SelectItem>
                        <SelectItem value="evacuation">Evacuate Vulnerable Demographics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-blue-100/50">
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-slate-400 mb-1 font-semibold">Baseline Score</div>
                      <div className="text-2xl font-bold" style={{ color: currentRiskColor }}>{currentRiskScore}</div>
                    </div>
                    <div className="flex-1 border-t border-dashed border-slate-300 mx-4 mt-3 relative">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 absolute -top-1.5 -right-1" />
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-widest text-blue-600 font-semibold mb-1">Projected Score</div>
                      <div className="text-2xl font-bold" style={{ color: simulatedRiskColor }}>{simulatedRiskScore}</div>
                    </div>
                  </div>
                  
                  <div className="mt-5 text-[9px] text-slate-400 uppercase tracking-widest text-center border-t border-slate-200 pt-3">
                    * Prototype simulation estimate
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm p-6 text-center">
              <Info className="w-8 h-8 text-slate-200 mb-3" />
              <div className="text-[10px] uppercase tracking-widest font-semibold mb-1 text-slate-400">No Zone Selected</div>
              <p className="text-xs">Select a jurisdiction on the map to view the incident brief.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
