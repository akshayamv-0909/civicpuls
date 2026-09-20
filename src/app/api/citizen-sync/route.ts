import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export type SOSCategory = 
  | 'HEAT_STROKE'
  | 'POWER_FAILURE'
  | 'FLOOD_TRAP'
  | 'MEDICAL_SOS'
  | 'OUTAGE'
  | 'SAFE';

export interface CitizenPing {
  id: string;
  type: SOSCategory;
  categoryName: string;
  zoneId: string;
  metro: string;
  lat: number;
  lng: number;
  address?: string;
  notes?: string;
  status: 'PENDING' | 'DISPATCHED' | 'RESOLVED';
  assignedUnit?: string;
  etaMinutes?: number;
  timestampMs: number;
  timeFormatted: string;
}

export interface EOCBroadcastState {
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

const INITIAL_TIME = Date.now();
const formatTime = (ms: number) => {
  return new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

let citizenPings: CitizenPing[] = [
  { 
    id: 'ping-demo-1', 
    type: 'HEAT_STROKE', 
    categoryName: 'Heat Stroke / Dehydration',
    zoneId: 'zone-phx-core', 
    metro: 'Phoenix, AZ', 
    lat: 33.4484, 
    lng: -112.0740, 
    address: '1221 N Central Ave (Near Burton Barr Library)',
    notes: 'Elderly resident experiencing dizziness and heat exhaustion. Need immediate hydration & paramedic.', 
    status: 'PENDING',
    timestampMs: INITIAL_TIME - 1000 * 60 * 3,
    timeFormatted: formatTime(INITIAL_TIME - 1000 * 60 * 3)
  },
  { 
    id: 'ping-demo-2', 
    type: 'POWER_FAILURE', 
    categoryName: 'Power & AC Grid Failure',
    zoneId: 'zone-phx-core', 
    metro: 'Phoenix, AZ', 
    lat: 33.4542, 
    lng: -112.0685, 
    address: '450 E Van Buren St',
    notes: 'Substation #4 AC Trip. Indoor temperature 88°F. Oxygen concentrator battery low.', 
    status: 'DISPATCHED',
    assignedUnit: 'Generator Unit #03 / Medic-09',
    etaMinutes: 4,
    timestampMs: INITIAL_TIME - 1000 * 60 * 9,
    timeFormatted: formatTime(INITIAL_TIME - 1000 * 60 * 9)
  },
  { 
    id: 'ping-demo-3', 
    type: 'SAFE', 
    categoryName: 'Welfare Check Confirmed',
    zoneId: 'zone-phx-east', 
    metro: 'Phoenix, AZ', 
    lat: 33.4255, 
    lng: -111.9400, 
    address: 'Tempe Transit Plaza',
    status: 'RESOLVED',
    timestampMs: INITIAL_TIME - 1000 * 60 * 15,
    timeFormatted: formatTime(INITIAL_TIME - 1000 * 60 * 15)
  }
];

export async function GET() {
  try {
    const safeCount = citizenPings.filter(p => p.type === 'SAFE').length;
    const outageCount = citizenPings.filter(p => p.type === 'OUTAGE' || p.type === 'POWER_FAILURE').length;
    const urgentSosList = citizenPings.filter(p => p.type !== 'SAFE' && p.status !== 'RESOLVED');
    const urgentSosCount = urgentSosList.length;

    return NextResponse.json({
      success: true,
      broadcastState,
      stats: {
        totalVerifiedSafe: 1420 + safeCount,
        activeOutageReports: 8 + outageCount,
        urgentSosRequests: urgentSosCount,
        openSheltersAvailable: broadcastState.activeSheltersCount,
        transitWaiverStatus: broadcastState.transitWaiverActive ? 'ACTIVE_FREE_PASS' : 'STANDARD'
      },
      urgentSosList,
      recentPings: citizenPings.slice(-30),
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
    const { action, ping, pingId, assignedUnit, etaMinutes, broadcastUpdate } = body;
    const nowMs = Date.now();

    // 1. Handle Citizen Ping / SOS Check-in
    if ((action === 'SUBMIT_PING' || action === 'SUBMIT_SOS') && ping) {
      const type: SOSCategory = ping.type || 'HEAT_STROKE';
      let categoryName = 'Emergency Distress';
      if (type === 'HEAT_STROKE') categoryName = 'Heat Stroke / Collapse';
      else if (type === 'POWER_FAILURE' || type === 'OUTAGE') categoryName = 'Power & AC Failure';
      else if (type === 'FLOOD_TRAP') categoryName = 'Flash Flood / Trapped';
      else if (type === 'MEDICAL_SOS') categoryName = 'Medical / Senior Emergency';
      else if (type === 'SAFE') categoryName = 'Welfare Check Confirmed';

      const newPing: CitizenPing = {
        id: `sos-${nowMs}-${Math.random().toString(36).substr(2, 4)}`,
        type,
        categoryName,
        zoneId: ping.zoneId || 'zone-phx-core',
        metro: ping.metro || 'Phoenix, AZ',
        lat: typeof ping.lat === 'number' ? ping.lat : 33.4484 + (Math.random() - 0.5) * 0.02,
        lng: typeof ping.lng === 'number' ? ping.lng : -112.0740 + (Math.random() - 0.5) * 0.02,
        address: ping.address || (type === 'SAFE' ? 'Resident Location' : 'Phoenix Downtown Sector 4'),
        notes: ping.notes || (type === 'SAFE' ? 'Citizen verified safe at residence' : 'Citizen activated mobile distress beacon'),
        status: type === 'SAFE' ? 'RESOLVED' : 'PENDING',
        timestampMs: nowMs,
        timeFormatted: formatTime(nowMs)
      };

      citizenPings.unshift(newPing); // Add to beginning for newest first
      // Keep buffer bounded
      if (citizenPings.length > 100) {
        citizenPings = citizenPings.slice(0, 80);
      }

      return NextResponse.json({
        success: true,
        message: 'Telemetry ping registered successfully',
        ping: newPing,
        pingId: newPing.id,
        timestampMs: newPing.timestampMs,
        totalSafeNow: 1420 + citizenPings.filter(p => p.type === 'SAFE').length
      });
    }

    // 2. Handle EOC Dispatch Rescue Team Action
    if (action === 'DISPATCH_RESCUE') {
      const targetId = pingId || (citizenPings.find(p => p.status === 'PENDING')?.id);
      if (targetId) {
        citizenPings = citizenPings.map(p => {
          if (p.id === targetId || (targetId === 'ALL_PENDING' && p.status === 'PENDING')) {
            return {
              ...p,
              status: 'DISPATCHED',
              assignedUnit: assignedUnit || 'Paramedic Unit Medic-04 / EMS-Rescue-12',
              etaMinutes: etaMinutes || 5
            };
          }
          return p;
        });

        const updatedPing = citizenPings.find(p => p.id === targetId);

        return NextResponse.json({
          success: true,
          message: 'Rescue team successfully dispatched to citizen location',
          dispatchedPing: updatedPing,
          allPings: citizenPings.slice(0, 20)
        });
      }
      return NextResponse.json({ success: false, error: 'Target SOS Ping ID not found' }, { status: 404 });
    }

    // 3. Handle Resolve SOS
    if (action === 'RESOLVE_SOS' && pingId) {
      citizenPings = citizenPings.map(p => {
        if (p.id === pingId) {
          return { ...p, status: 'RESOLVED' };
        }
        return p;
      });

      return NextResponse.json({
        success: true,
        message: 'SOS incident resolved'
      });
    }

    // 4. Handle EOC Commander Broadcast Update
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
