import { NextResponse } from 'next/server';
import { fetchLiveSystemTelemetry } from '@/lib/liveWeatherService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await fetchLiveSystemTelemetry();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching live climate telemetry:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch live climate telemetry from NOAA / Open-Meteo feeds',
        status: 'UNAVAILABLE',
        zones: [],
        states: [],
        nwsAlerts: [],
        lastUpdatedUtc: new Date().toUTCString().replace('GMT', 'UTC'),
        timestampMs: Date.now(),
        dataSources: {
          weather: 'NOAA HRRR / Open-Meteo (UNAVAILABLE)',
          airQuality: 'Open-Meteo AQI (UNAVAILABLE)',
          alerts: 'api.weather.gov (UNAVAILABLE)',
          demographics: 'US Census Bureau ACS',
          historical: 'NOAA NCEI'
        }
      },
      { status: 500 }
    );
  }
}
