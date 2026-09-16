import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ZoneData } from '@/data/mockCityData';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock');

export async function POST(req: Request) {
  try {
    const { zone, riskScore }: { zone: ZoneData, riskScore: number } = await req.json();

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock') {
      // Mock response for hackathon demo if no API key is provided
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate latency
      return NextResponse.json({
        explanation: `The ${zone.name} has a high risk profile due to a combination of elevated temperatures (${zone.temperature}°C) and a high percentage of vulnerable elderly residents (${zone.elderly_population}%). Furthermore, limited tree coverage (${zone.tree_coverage}%) and ${zone.cooling_capacity} cooling capacity compound the heat exposure.`,
        recommendations: [
          { priority: 1, action: "Deploy Mobile Cooling Centers", reason: `Current cooling infrastructure is rated as ${zone.cooling_capacity}.` },
          { priority: 2, action: "Issue Localized Heat Warnings", reason: `High population density of ${zone.population_density} requires immediate awareness.` },
          { priority: 3, action: "Dispatch Wellness Check Teams", reason: `Protect the ${zone.elderly_population}% elderly population.` }
        ]
      });
    }

    // Real API call
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
      You are an AI assistant for a city emergency operations dashboard.
      Analyze the following zone data and provide a brief explanation of why it is at risk, along with 3 recommended actions.
      
      Zone Name: ${zone.name}
      Risk Score: ${riskScore}/100
      Temperature: ${zone.temperature}°C
      Humidity: ${zone.humidity}%
      Air Quality Index: ${zone.air_quality}
      Population Density: ${zone.population_density} per sq km
      Elderly Population: ${zone.elderly_population}%
      Tree Coverage: ${zone.tree_coverage}%
      Cooling Capacity: ${zone.cooling_capacity}
      Emergency Resources: ${zone.emergency_resources}
      
      Respond STRICTLY in the following JSON format without any markdown wrappers:
      {
        "explanation": "A 2-sentence explanation of why the risk score is what it is based on intersecting factors.",
        "recommendations": [
          { "priority": 1, "action": "Action name", "reason": "Short reason" },
          { "priority": 2, "action": "Action name", "reason": "Short reason" },
          { "priority": 3, "action": "Action name", "reason": "Short reason" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Clean markdown if model returned it
    const jsonStr = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const data = JSON.parse(jsonStr);

    return NextResponse.json(data);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json(
      { error: "Failed to generate analysis" },
      { status: 500 }
    );
  }
}
