import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { StateClimateProfile } from '@/data/noaaClimateData';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock');

interface ZonePayload {
  name?: string;
  metro?: string;
  temperatureF?: number;
  temperatureC?: number;
  temperature?: number;
  humidityPct?: number;
  humidity?: number;
  airQualityAqi?: number;
  air_quality?: number;
  elderlyPopulationPct?: number;
  elderlyPopulation?: number;
  elderly_population?: number;
  baseCoolingCapacity?: string;
  coolingCapacity?: string;
  cooling_capacity?: string;
  treeCoveragePct?: number;
  treeCanopyPct?: number;
  tree_coverage?: number;
  population?: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { zone, state, isForecast, forecastYear, riskScore }: {
      zone?: ZonePayload;
      state?: StateClimateProfile;
      riskScore?: number;
      isForecast?: boolean;
      forecastYear?: number;
    } = body;

    // -----------------------------------------------------------------------
    // 1. Handle State-Level Multi-Hazard Climate Profile Analysis
    // -----------------------------------------------------------------------
    if (state) {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock') {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        if (isForecast && forecastYear) {
          return NextResponse.json({
            explanation: `NOAA predictive modeling for ${state.name} projects an escalating multi-hazard risk profile by ${forecastYear}. Sustained temperature anomalies (${state.tempAnomalyF > 0 ? '+' : ''}${state.tempAnomalyF}°F) combined with ${state.droughtPdsi < 0 ? 'drought intensification' : 'precipitation volatility'} elevate primary hazard threats across wildfire, flood, and grid infrastructure.`,
            recommendations: [
              { priority: 1, action: "Deploy Grid & Substation Thermal Hardening", reason: `Anticipate ${state.extremeHeatDays}+ peak extreme heat days by ${forecastYear}.` },
              { priority: 2, action: "Accelerate Water Basin & Flood Defenses", reason: `Mitigate heavy rainfall volatility anomaly of ${state.precipAnomalyIn > 0 ? '+' : ''}${state.precipAnomalyIn} inches.` },
              { priority: 3, action: "Establish Proactive Wildfire & Drought Buffer Zones", reason: `Reduce exposure across ${state.wildfireAcresBurnedK}K acres of vulnerable terrain.` }
            ]
          });
        }

        return NextResponse.json({
          explanation: `${state.name} (${state.stateCode}) exhibits an overall Climate Extremes Index (CEI) risk of ${state.overallRisk}/100. Primary operational hazards include ${state.wildfireRisk > 75 ? 'Severe Wildfire Hazard' : ''} ${state.floodRisk > 75 ? 'Catastrophic Flood Potential' : ''} ${state.heatRisk > 75 ? 'Extreme Heat Dome Stress' : ''} driven by a ${state.tempAnomalyF > 0 ? '+' : ''}${state.tempAnomalyF}°F temperature anomaly.`,
          recommendations: [
            { priority: 1, action: "Pre-position Regional Emergency Assets", reason: `Overall climate risk evaluated at ${state.overallRisk}/100.` },
            { priority: 2, action: "Issue Multi-Hazard Municipal Alerts", reason: `Compounding ${state.extremeHeatDays} extreme heat days and ${state.extremeRainDays} peak rainfall days.` },
            { priority: 3, action: "Coordinate Inter-Agency Relief Protocols", reason: `Target priority demographic protection for ${state.population.toLocaleString()} residents.` }
          ]
        });
      }

      // Real Gemini API call for State
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        You are a senior climate risk advisor for a national disaster emergency operations center.
        Analyze the following state climate profile based on NOAA/NCEI data and provide a concise 2-sentence explanation of compound climate risks and 3 prioritized actionable recommendations.
        
        State: ${state.name} (${state.stateCode})
        Overall Climate Extremes Index Risk: ${state.overallRisk}/100
        Temperature Anomaly: ${state.tempAnomalyF > 0 ? '+' : ''}${state.tempAnomalyF}°F
        Precipitation Anomaly: ${state.precipAnomalyIn > 0 ? '+' : ''}${state.precipAnomalyIn} in
        Heat Risk: ${state.heatRisk}/100, Flood Risk: ${state.floodRisk}/100, Drought Risk: ${state.droughtRisk}/100
        Wildfire Risk: ${state.wildfireRisk}/100, Storm Risk: ${state.stormRisk}/100, Hurricane Risk: ${state.hurricaneRisk}/100
        Forecast Horizon: ${isForecast ? `Forecast Year ${forecastYear}` : 'Current 2021-2025 Baseline'}
        
        Respond STRICTLY in JSON format:
        {
          "explanation": "2-sentence synthesis of compound multi-hazard risks and historical anomaly context.",
          "recommendations": [
            { "priority": 1, "action": "Action name", "reason": "Short operational reason" },
            { "priority": 2, "action": "Action name", "reason": "Short operational reason" },
            { "priority": 3, "action": "Action name", "reason": "Short operational reason" }
          ]
        }
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      return NextResponse.json(JSON.parse(jsonStr));
    }

    // -----------------------------------------------------------------------
    // 2. Handle Urban Heatwave Zone (Live Real Meteorological Telemetry)
    // -----------------------------------------------------------------------
    if (zone) {
      const zoneName = zone.name || 'Metropolitan Zone';
      const zoneMetro = zone.metro || 'Target Metro';
      const tempF = zone.temperatureF ?? (zone.temperature !== undefined ? Math.round((zone.temperature * 9) / 5 + 32) : 75);
      const tempC = zone.temperatureC ?? Math.round(((tempF - 32) * 5) / 9);
      const humidity = zone.humidityPct ?? zone.humidity ?? 55;
      const aqi = zone.airQualityAqi ?? zone.air_quality ?? 30;
      const elderlyPct = zone.elderlyPopulationPct ?? zone.elderlyPopulation ?? zone.elderly_population ?? 18;
      const coolingCap = zone.baseCoolingCapacity ?? zone.coolingCapacity ?? zone.cooling_capacity ?? 'Moderate';
      const treeCanopy = zone.treeCanopyPct ?? zone.tree_coverage ?? 25;
      const computedRisk = riskScore ?? Math.round(Math.min(Math.max((tempF - 85) * 1.2 + elderlyPct * 0.6 + (aqi / 10) - (coolingCap === 'High' ? 10 : coolingCap === 'Low' ? 2 : 5), 0), 100));

      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock') {
        await new Promise(resolve => setTimeout(resolve, 500));

        if (computedRisk < 40) {
          return NextResponse.json({
            explanation: `${zoneName} in ${zoneMetro} is currently at a LOW thermal risk tier (${computedRisk}/100) with live atmospheric temperature of ${tempF}°F (${tempC}°C) and clean air quality (${aqi} AQI). High-capacity cooling infrastructure and ${treeCanopy}% tree canopy provide strong thermal buffering.`,
            recommendations: [
              { priority: 1, action: "Maintain Routine Climate Monitoring", reason: `Current temperatures (${tempF}°F) remain within safe municipal baseline thresholds.` },
              { priority: 2, action: "Standby Cooling Hub Protocols", reason: `Ensure municipal facilities are prepped for diurnal peak afternoon solar heating.` },
              { priority: 3, action: "Demographic Outreach Check-ins", reason: `Maintain automated welfare check-ins for the ${elderlyPct}% senior citizen population.` }
            ]
          });
        }

        if (computedRisk < 70) {
          return NextResponse.json({
            explanation: `${zoneName} in ${zoneMetro} exhibits a MODERATE thermal stress profile (${computedRisk}/100) with live temperatures at ${tempF}°F (${tempC}°C) and ${humidity}% relative humidity. Elevated thermal load combined with ${elderlyPct}% elderly demographic exposure warrants active preparedness.`,
            recommendations: [
              { priority: 1, action: "Activate Public Cooling Hubs", reason: `Provide air-conditioned shelter options given ${coolingCap.toLowerCase()} baseline cooling capacity.` },
              { priority: 2, action: "Deploy Hydration Stations", reason: `Mitigate heat exposure along active pedestrian, transit, and commercial corridors.` },
              { priority: 3, action: "Air Quality & Heat Advisories", reason: `Current AQI (${aqi}) and heat index require monitoring for sensitive groups.` }
            ]
          });
        }

        return NextResponse.json({
          explanation: `${zoneName} in ${zoneMetro} is experiencing CRITICAL / HIGH thermal risk (${computedRisk}/100) driven by extreme live temperatures (${tempF}°F / ${tempC}°C) and ${humidity}% humidity. High demographic vulnerability (${elderlyPct}% seniors) creates immediate heat-stroke and hospital surge risk.`,
          recommendations: [
            { priority: 1, action: "Deploy Mobile Cooling Centers", reason: `Urgent frontline relief to buffer extreme ${tempF}°F thermal stress.` },
            { priority: 2, action: "Issue Multi-Channel Heat Warnings", reason: `Broadcast emergency SMS/WEA alerts to reach ${zone.population ? zone.population.toLocaleString() : 'vulnerable'} residents.` },
            { priority: 3, action: "Surge Emergency Medical Services", reason: `Pre-empt heat exhaustion hospital admissions across high-risk senior centers.` }
          ]
        });
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        You are an AI assistant for a national city emergency operations dashboard.
        Analyze the following real-time metropolitan zone data and provide a concise 2-sentence diagnostic of why the risk score is what it is, along with 3 prioritized recommendations.
        
        Zone Name: ${zoneName}
        Metropolitan Area: ${zoneMetro}
        Live Temperature: ${tempF}°F (${tempC}°C)
        Live Humidity: ${humidity}%
        Live Air Quality Index: ${aqi} AQI
        Elderly Population: ${elderlyPct}%
        Tree Canopy Coverage: ${treeCanopy}%
        Cooling Capacity: ${coolingCap}
        Calculated Live Risk Score: ${computedRisk}/100
        
        Respond STRICTLY in JSON format:
        {
          "explanation": "A 2-sentence diagnostic accurately explaining the live conditions and risk score.",
          "recommendations": [
            { "priority": 1, "action": "Action name", "reason": "Short operational reason" },
            { "priority": 2, "action": "Action name", "reason": "Short operational reason" },
            { "priority": 3, "action": "Action name", "reason": "Short operational reason" }
          ]
        }
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      return NextResponse.json(JSON.parse(jsonStr));
    }

    return NextResponse.json({ error: "Missing zone or state payload" }, { status: 400 });
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: "Failed to generate analysis" }, { status: 500 });
  }
}
