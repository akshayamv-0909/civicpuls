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
  status: 'PENDING' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED';
  assignedUnit?: string;
  etaMinutes?: number;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  alertSirenTriggered?: boolean;
  alertMessage?: string;
  timestampMs: number;
  timeFormatted: string;
}

export interface SirenBroadcastAlert {
  id: string;
  timestampMs: number;
  timeFormatted: string;
  title: string;
  message: string;
  severity: 'CRITICAL' | 'WARNING' | 'EVACUATION';
  sender: string;
  active: boolean;
}

export interface EOCBroadcastState {
  isCodeRedActive: boolean;
  transitWaiverActive: boolean;
  preHazardCountdownMinutes: number;
  targetedMetro: string;
  activeSheltersCount: number;
  lastBroadcastTimeUtc: string;
  activeSirenAlert: SirenBroadcastAlert | null;
}

// Global in-memory telemetry buffer
let broadcastState: EOCBroadcastState = {
  isCodeRedActive: true,
  transitWaiverActive: true,
  preHazardCountdownMinutes: 165,
  targetedMetro: 'Phoenix, AZ',
  activeSheltersCount: 14,
  lastBroadcastTimeUtc: new Date().toUTCString().replace('GMT', 'UTC'),
  activeSirenAlert: null
};

const INITIAL_TIME = Date.now();
const formatTime = (ms: number) => {
  return new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

let citizenPings: CitizenPing[] = [
  { 
    id: 'ping-demo-1', 
    type: 'HEAT_STROKE', 
    categoryName: 'Heat Stroke / Collapse',
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
    categoryName: 'Power & AC Failure',
    zoneId: 'zone-phx-core', 
    metro: 'Phoenix, AZ', 
    lat: 33.4542, 
    lng: -112.0685, 
    address: '450 E Van Buren St',
    notes: 'Substation #4 AC Trip. Indoor temperature 88°F. Oxygen concentrator battery low.', 
    status: 'DISPATCHED',
    assignedUnit: 'Generator Unit #03 / Medic-09',
    etaMinutes: 4,
    acknowledgedBy: 'Battalion Chief Marcus Vance • FEMA Desk #1',
    acknowledgedAt: formatTime(INITIAL_TIME - 1000 * 60 * 8),
    alertSirenTriggered: true,
    alertMessage: 'Unit dispatched. Paramedic en route to your building.',
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
      recentPings: citizenPings.slice(0, 30),
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
    const { 
      action, 
      ping, 
      pingId, 
      assignedUnit, 
      etaMinutes, 
      acknowledgedBy, 
      alertMessage, 
      broadcastUpdate,
      sirenAlert 
    } = body;
    const nowMs = Date.now();
    const nowTimeFormatted = formatTime(nowMs);

    // 1. Citizen submits SOS distress signal
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
        alertSirenTriggered: false,
        timestampMs: nowMs,
        timeFormatted: nowTimeFormatted
      };

      citizenPings.unshift(newPing);
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

    // 2. EOC Dashboard Acknowledges SOS & Dispatches Unit with Siren Alert
    if (action === 'ACKNOWLEDGE_SOS' || action === 'DISPATCH_RESCUE' || action === 'ACKNOWLEDGE_AND_DISPATCH') {
      const targetId = pingId || (citizenPings.find(p => p.status === 'PENDING')?.id);
      const isDispatch = action === 'DISPATCH_RESCUE' || action === 'ACKNOWLEDGE_AND_DISPATCH';
      const commanderName = acknowledgedBy || 'Battalion Chief Marcus Vance • FEMA Task Force 1';
      const unit = assignedUnit || 'Phoenix Fire Rescue Unit #04 / EMS Medic-04';
      const eta = etaMinutes || 4;
      const message = alertMessage || `🚨 FEMA EOC ALERT: Incident Command has locked your GPS coordinates. ${unit} dispatched (ETA ~${eta} min). Stay sheltered.`;

      citizenPings = citizenPings.map(p => {
        if (!targetId || targetId === 'ALL_PENDING' || p.id === targetId) {
          return {
            ...p,
            status: isDispatch ? 'DISPATCHED' : 'ACKNOWLEDGED',
            assignedUnit: unit,
            etaMinutes: eta,
            acknowledgedBy: commanderName,
            acknowledgedAt: nowTimeFormatted,
            alertSirenTriggered: true,
            alertMessage: message
          };
        }
        return p;
      });

      const updatedPing = targetId && targetId !== 'ALL_PENDING' 
        ? citizenPings.find(p => p.id === targetId) 
        : citizenPings[0];

      return NextResponse.json({
        success: true,
        message: 'SOS distress signal acknowledged and emergency siren alert transmitted to citizen handset',
        dispatchedPing: updatedPing,
        allPings: citizenPings.slice(0, 20)
      });
    }

    // 3. EOC Commander Broadcasts Nationwide / Metro Emergency Siren Alert to All Connected Handsets
    if (action === 'BROADCAST_SIREN_ALERT') {
      const newAlert: SirenBroadcastAlert = {
        id: `alert-${nowMs}`,
        timestampMs: nowMs,
        timeFormatted: nowTimeFormatted,
        title: sirenAlert?.title || '🚨 FEMA WEA EMERGENCY BROADCAST: CRITICAL HEAT SURGE / FLOOD WARNING',
        message: sirenAlert?.message || 'Emergency cooling shelters and evacuation corridors are now active. Free municipal transit pass available.',
        severity: sirenAlert?.severity || 'CRITICAL',
        sender: sirenAlert?.sender || 'FEMA IPAWS / Phoenix Municipal EOC Incident Command',
        active: true
      };

      broadcastState = {
        ...broadcastState,
        activeSirenAlert: newAlert,
        lastBroadcastTimeUtc: new Date().toUTCString().replace('GMT', 'UTC')
      };

      return NextResponse.json({
        success: true,
        message: 'Emergency siren alert broadcast to all citizen handsets',
        activeSirenAlert: newAlert
      });
    }

    // 4. Dismiss or Mute Active Siren Broadcast
    if (action === 'DISMISS_SIREN_ALERT') {
      broadcastState = {
        ...broadcastState,
        activeSirenAlert: null
      };

      return NextResponse.json({
        success: true,
        message: 'Siren broadcast silenced and dismissed'
      });
    }

    // 5. Resolve SOS Incident
    if (action === 'RESOLVE_SOS' && pingId) {
      citizenPings = citizenPings.map(p => {
        if (p.id === pingId) {
          return { ...p, status: 'RESOLVED', alertSirenTriggered: false };
        }
        return p;
      });

      return NextResponse.json({
        success: true,
        message: 'SOS incident resolved successfully'
      });
    }

    // 6. Update EOC Broadcast State Parameters
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
