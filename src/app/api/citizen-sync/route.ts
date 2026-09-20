import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory serverless state buffer for two-way citizen-EOC sync
interface CitizenPing {
  id: string;
  type: 'SAFE' | 'OUTAGE' | 'WATER_SOS' | 'MEDICAL_SOS';
  zoneId: string;
  metro: string;
  lat?: number;
  lng?: number;
  notes?: string;
  timestampMs: number;
}

interface EOCBroadcastState {
  isCodeRedActive: boolean;
  transitWaiverActive: boolean;
  preHazardCountdownMinutes: number;
  targetedMetro: string;
  activeSheltersCount: number;
  lastBroadcastTimeUtc: string;
}

// Global in-memory telemetry buffer (persists across requests during server execution)
let broadcastState: EOCBroadcastState = {
  isCodeRedActive: true,
  transitWaiverActive: true,
  preHazardCountdownMinutes: 165, // 2h 45m until peak thermal surge
  targetedMetro: 'Phoenix, AZ',
  activeSheltersCount: 14,
  lastBroadcastTimeUtc: new Date().toUTCString().replace('GMT', 'UTC'),
};

let citizenPings: CitizenPing[] = [
  { id: 'ping-1', type: 'SAFE', zoneId: 'phx-downtown', metro: 'Phoenix, AZ', lat: 33.451, lng: -112.074, timestampMs: Date.now() - 1000 * 60 * 5 },
  { id: 'ping-2', type: 'SAFE', zoneId: 'phx-downtown', metro: 'Phoenix, AZ', lat: 33.454, lng: -112.071, timestampMs: Date.now() - 1000 * 60 * 12 },
  { id: 'ping-3', type: 'OUTAGE', zoneId: 'phx-downtown', metro: 'Phoenix, AZ', lat: 33.448, lng: -112.068, notes: 'Substation #4 AC Trip', timestampMs: Date.now() - 1000 * 60 * 8 },
  { id: 'ping-4', type: 'SAFE', zoneId: 'phx-maryvale', metro: 'Phoenix, AZ', lat: 33.488, lng: -112.169, timestampMs: Date.now() - 1000 * 60 * 20 },
  { id: 'ping-5', type: 'WATER_SOS', zoneId: 'phx-downtown', metro: 'Phoenix, AZ', lat: 33.442, lng: -112.076, notes: 'Hydration Station Refill Request', timestampMs: Date.now() - 1000 * 60 * 15 }
];

export async function GET() {
  try {
    const safeCount = citizenPings.filter(p => p.type === 'SAFE').length;
    const outageCount = citizenPings.filter(p => p.type === 'OUTAGE').length;
    const sosCount = citizenPings.filter(p => p.type === 'WATER_SOS' || p.type === 'MEDICAL_SOS').length;

    return NextResponse.json({
      success: true,
      broadcastState,
      stats: {
        totalVerifiedSafe: 1420 + safeCount,
        activeOutageReports: 8 + outageCount,
        urgentSosRequests: 3 + sosCount,
        openSheltersAvailable: broadcastState.activeSheltersCount,
        transitWaiverStatus: broadcastState.transitWaiverActive ? 'ACTIVE_FREE_PASS' : 'STANDARD'
      },
      recentPings: citizenPings.slice(-15),
      timestampMs: Date.now()
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Citizen Sync GET Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve sync state' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, ping, broadcastUpdate } = body;

    // 1. Handle Citizen Ping / SOS Check-in
    if (action === 'SUBMIT_PING' && ping) {
      const newPing: CitizenPing = {
        id: `ping-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: ping.type || 'SAFE',
        zoneId: ping.zoneId || 'phx-downtown',
        metro: ping.metro || 'Phoenix, AZ',
        lat: ping.lat ?? (33.4484 + (Math.random() - 0.5) * 0.04),
        lng: ping.lng ?? (-112.074 + (Math.random() - 0.5) * 0.04),
        notes: ping.notes || '',
        timestampMs: Date.now()
      };

      citizenPings.push(newPing);
      // Keep buffer bounded
      if (citizenPings.length > 100) {
        citizenPings = citizenPings.slice(-50);
      }

      return NextResponse.json({
        success: true,
        message: 'Telemetry ping registered successfully',
        pingId: newPing.id,
        timestampMs: newPing.timestampMs,
        totalSafeNow: 1420 + citizenPings.filter(p => p.type === 'SAFE').length
      });
    }

    // 2. Handle EOC Commander Broadcast Update
    if (action === 'UPDATE_BROADCAST' && broadcastUpdate) {
      broadcastState = {
        ...broadcastState,
        ...broadcastUpdate,
        lastBroadcastTimeUtc: new Date().toUTCString().replace('GMT', 'UTC')
      };

      return NextResponse.json({
        success: true,
        broadcastState,
        message: 'EOC broadcast parameters synchronized to citizen network'
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action payload' }, { status: 400 });
  } catch (error) {
    console.error('Citizen Sync POST Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process sync update' }, { status: 500 });
  }
}
