"use client";

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LiveZoneTelemetry } from '@/lib/liveWeatherService';
import { Locate, Layers, Globe, Mountain, Flame, Radio, Moon, ShieldAlert } from 'lucide-react';
import { SatelliteViewType } from './USClimateMap';

interface MapProps {
  zones: LiveZoneTelemetry[];
  selectedZoneId: string | null;
  onZoneSelect: (zoneId: string) => void;
  coolingBusesDeployed?: number;
  generatorsDeployed?: number;
  paramedicSurgeDeployed?: number;
  simulatedScore?: number | null;
}

const mapTileConfigs: Record<SatelliteViewType, {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  baseLayer: string;
  overlayLayer?: string;
  attribution: string;
}> = {
  gis: {
    name: 'GIS Dark Canvas',
    icon: Globe,
    baseLayer: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Urban Heat Intelligence'
  },
  satellite: {
    name: 'High-Res Optical Satellite',
    icon: Layers,
    baseLayer: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Satellite Imagery &copy; Esri, Maxar, Earthstar Geographics'
  },
  terrain: {
    name: 'USGS Topographic Terrain',
    icon: Mountain,
    baseLayer: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Topography &copy; Esri, USGS'
  },
  thermal: {
    name: 'Thermal Infrared (LST)',
    icon: Flame,
    baseLayer: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayLayer: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png',
    attribution: 'Thermal & Radar Overlay &copy; NASA GIBS & NOAA'
  },
  radar: {
    name: 'Live NOAA Doppler Radar',
    icon: Radio,
    baseLayer: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayLayer: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png',
    attribution: 'Live Radar &copy; NOAA / NWS NEXRAD'
  },
  night: {
    name: 'NASA Night Radiance',
    icon: Moon,
    baseLayer: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
    attribution: 'Night Radiance &copy; NASA Earth Observatory / EOSDIS'
  }
};

function getScoreColor(score: number | null): string {
  if (score === null) return '#64748b'; // slate-500
  if (score >= 80) return '#ef4444'; // red-500
  if (score >= 60) return '#ea580c'; // orange-600
  if (score >= 40) return '#d97706'; // amber-600
  return '#16a34a'; // green-600
}

function getThermalDomeColor(tempF: number | null): string {
  if (tempF === null) return '#f59e0b';
  if (tempF >= 95) return '#dc2626'; // Deep Red
  if (tempF >= 85) return '#ea580c'; // Orange
  if (tempF >= 75) return '#d97706'; // Amber
  return '#16a34a'; // Green
}

function MapController({ 
  selectedZone, 
  userLocation 
}: { 
  selectedZone: LiveZoneTelemetry | undefined;
  userLocation: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 10, { duration: 1.5 });
    } else if (selectedZone) {
      // Calibrated zoom level 8.5 gives a full view of the 15-mile metropolitan heat dome footprint
      map.flyTo([selectedZone.lat, selectedZone.lng], 8.5, { duration: 1.2 });
    }
  }, [selectedZone, userLocation, map]);
  return null;
}

export default function Map({ 
  zones, 
  selectedZoneId, 
  onZoneSelect,
  coolingBusesDeployed = 0,
  generatorsDeployed = 0,
  paramedicSurgeDeployed = 0,
  simulatedScore = null
}: MapProps) {
  const defaultCenter: [number, number] = [38.50, -96.50];
  const selectedZone = zones.find(z => z.id === selectedZoneId) || zones[0];

  const [activeBaseView, setActiveBaseView] = useState<SatelliteViewType>('gis');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn("Geolocation error:", err);
        setIsLocating(false);
        alert("Location access was denied or timed out. Please allow browser location access.");
      },
      { timeout: 8000 }
    );
  };

  const currentConfig = mapTileConfigs[activeBaseView];
  const effectiveDomeColor = (simulatedScore !== null && simulatedScore < 45)
    ? '#00e5a3' // Stabilized Neon Mint
    : (simulatedScore !== null && simulatedScore < 65)
    ? '#eab308' // Moderate Amber
    : getThermalDomeColor(selectedZone?.temperatureF ?? null);

  const BUS_OFFSETS = [
    { dlat: 0.012, dlng: 0.015, name: "Civic Transit Plaza & 4th Ave" },
    { dlat: -0.015, dlng: 0.020, name: "Public Library & Park Sanctuary" },
    { dlat: 0.022, dlng: -0.018, name: "North Industrial Worker Pod" },
    { dlat: -0.020, dlng: -0.022, name: "South Corridor Community Rec" },
    { dlat: 0.008, dlng: -0.032, name: "West Senior Living Hub" },
    { dlat: -0.008, dlng: 0.035, name: "East Metro Market Shelter" },
    { dlat: 0.028, dlng: 0.022, name: "Northeast Medical Annex" },
    { dlat: -0.030, dlng: 0.008, name: "South Gateway Transfer Hub" },
    { dlat: 0.018, dlng: -0.038, name: "West District Stadium Gate" },
    { dlat: -0.025, dlng: -0.014, name: "Central High School Campus" },
    { dlat: 0.010, dlng: 0.042, name: "Eastern Commerce Center" },
    { dlat: -0.012, dlng: -0.040, name: "Southwest Bus Terminal" },
    { dlat: 0.035, dlng: -0.025, name: "Northwest Park & Ride" },
    { dlat: -0.038, dlng: 0.030, name: "Southeast Public Square" },
    { dlat: 0.003, dlng: -0.048, name: "Central Station Walk-in Bay" },
  ];

  const GENERATOR_OFFSETS = [
    { dlat: 0.018, dlng: -0.008, name: "Substation Alpha-1 (10 MW Reserve)" },
    { dlat: -0.012, dlng: 0.014, name: "Metro Grid Transformer 4B (10 MW)" },
    { dlat: 0.024, dlng: 0.030, name: "North Medical Substation (12 MW)" },
    { dlat: -0.028, dlng: -0.018, name: "South Industrial Feeder (10 MW)" },
    { dlat: 0.005, dlng: 0.025, name: "Central Water Pumping Station" },
    { dlat: -0.005, dlng: -0.028, name: "Westside Grid Buffer Node" },
    { dlat: 0.030, dlng: -0.015, name: "Northwest Emergency Tie-line" },
    { dlat: -0.032, dlng: 0.020, name: "Southeast Power Distribution Hub" },
  ];

  const PARAMEDIC_OFFSETS = [
    { dlat: 0.006, dlng: 0.009, name: "EMS Rapid Triage Unit 1 (Ice Baths & IV)" },
    { dlat: -0.010, dlng: -0.008, name: "EMS Rapid Triage Unit 2 (Cooling Vests)" },
    { dlat: 0.016, dlng: -0.022, name: "EMS Rapid Triage Unit 3 (Mobile ICU)" },
    { dlat: -0.018, dlng: 0.018, name: "EMS Rapid Triage Unit 4 (Heatstroke Bay)" },
    { dlat: 0.022, dlng: 0.012, name: "EMS Rapid Triage Unit 5 (Field Clinic)" },
    { dlat: -0.024, dlng: -0.025, name: "EMS Rapid Triage Unit 6 (Hydration Triage)" },
    { dlat: 0.014, dlng: 0.035, name: "EMS Rapid Triage Unit 7 (Worker Station)" },
    { dlat: -0.015, dlng: 0.028, name: "EMS Rapid Triage Unit 8 (Senior Center Annex)" },
    { dlat: 0.030, dlng: -0.005, name: "EMS Rapid Triage Unit 9 (Transit Triage)" },
    { dlat: -0.030, dlng: -0.005, name: "EMS Rapid Triage Unit 10 (Sports Complex)" },
  ];

  return (
    <div className="h-full w-full border-x border-slate-800 z-0 relative bg-slate-950">
      
      {/* FLOATING TACTICAL CONTROLS */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        <button
          onClick={handleLocateUser}
          disabled={isLocating}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono uppercase tracking-wider font-semibold shadow-lg border backdrop-blur-md transition-all ${
            userLocation 
              ? 'bg-[#00e5a3]/20 text-[#00e5a3] border-[#00e5a3]/60 shadow-[#00e5a3]/10' 
              : 'bg-[#0e1626]/90 text-slate-300 border-[#1e2d42] hover:bg-[#162032] hover:border-[#00e5a3]/50 hover:text-[#00e5a3]'
          }`}
          title="Detect and fly to your live GPS coordinates"
        >
          <Locate className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-[#00e5a3]' : 'text-[#00e5a3]'}`} />
          <span>{isLocating ? 'Acquiring GPS...' : userLocation ? 'GPS Lock' : 'My Location'}</span>
        </button>

        <div className="flex items-center bg-[#0e1626]/90 border border-[#1e2d42] rounded-xl shadow-lg backdrop-blur-md p-1">
          <div className="flex items-center gap-1 pl-2 pr-1 text-[#00e5a3] text-xs font-mono">
            <Layers className="w-3.5 h-3.5 text-[#00e5a3]" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Feed:</span>
          </div>
          <select
            value={activeBaseView}
            onChange={(e) => setActiveBaseView(e.target.value as SatelliteViewType)}
            className="bg-transparent text-[11px] text-slate-200 font-mono py-1 pr-2 outline-none cursor-pointer"
          >
            <option value="gis" className="bg-[#0e1626] text-slate-100">GIS Dark Canvas (Default)</option>
            <option value="satellite" className="bg-[#0e1626] text-slate-100">High-Res Optical Satellite</option>
            <option value="terrain" className="bg-[#0e1626] text-slate-100">USGS Topographic Terrain</option>
            <option value="thermal" className="bg-[#0e1626] text-slate-100">Thermal Infrared (LST)</option>
            <option value="radar" className="bg-[#0e1626] text-slate-100">Live NOAA Doppler Radar</option>
            <option value="night" className="bg-[#0e1626] text-slate-100">NASA Night Radiance</option>
          </select>
        </div>
      </div>

      <MapContainer 
        center={defaultCenter} 
        zoom={4} 
        minZoom={3} 
        maxZoom={16}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          key={activeBaseView}
          url={currentConfig.baseLayer}
          attribution={currentConfig.attribution}
          className="tactical-map-tiles"
        />

        {currentConfig.overlayLayer && (
          <TileLayer
            key={`${activeBaseView}-overlay`}
            url={currentConfig.overlayLayer}
            opacity={0.65}
            className="tactical-satellite-tiles"
          />
        )}

        <MapController selectedZone={selectedZone} userLocation={userLocation} />

        {/* 1. METROPOLITAN THERMAL HEAT DOME (HEAT ISLAND PLUME OVERLAY) */}
        {selectedZone && (
          <>
            {/* Outer Metropolitan Thermal Footprint (18 km radius) */}
            <Circle
              center={[selectedZone.lat, selectedZone.lng]}
              radius={18000}
              pathOptions={{
                color: effectiveDomeColor,
                weight: 1.5,
                dashArray: '6, 6',
                fillColor: effectiveDomeColor,
                fillOpacity: simulatedScore !== null && simulatedScore < 45 ? 0.06 : 0.12,
              }}
            />

            {/* Inner Urban Heat Core Ring (8 km radius) */}
            <Circle
              center={[selectedZone.lat, selectedZone.lng]}
              radius={8000}
              pathOptions={{
                color: effectiveDomeColor,
                weight: 2,
                fillColor: effectiveDomeColor,
                fillOpacity: simulatedScore !== null && simulatedScore < 45 ? 0.10 : 0.22,
              }}
            >
              <Popup autoPan={true} closeButton={false}>
                <div className="p-2.5 min-w-[210px] bg-[#0e1626] text-slate-100 rounded-xl border border-[#1e2d42] font-mono text-xs shadow-2xl">
                  <div className="font-bold text-[#00e5a3] uppercase tracking-wider text-[10px] mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      <span>Metropolitan Heat Dome</span>
                    </span>
                    <span className="text-[8.5px] bg-[#00e5a3]/20 text-[#00e5a3] px-1.5 py-0.5 rounded font-bold">
                      18 km Radius
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-200 mb-1">
                    Footprint: <strong>{selectedZone.metro}</strong>
                  </div>
                  <div className="text-[9.5px] text-slate-400 space-y-0.5">
                    <div>Local Time: <strong className="text-[#00e5a3]">{selectedZone.localObservationTime}</strong></div>
                    <div>Station: <strong className="text-[#00f2fe]">{selectedZone.noaaStation}</strong></div>
                    <div>Live Temp: <strong className="text-white">{selectedZone.temperatureF}°F ({selectedZone.temperatureC}°C)</strong></div>
                    {simulatedScore !== null && (
                      <div className="text-[#00e5a3] font-bold border-t border-slate-800 pt-0.5 mt-0.5">
                        Simulated Status: {simulatedScore < 45 ? 'Stabilized' : 'Active Mitigation'} ({simulatedScore}/100)
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Circle>

            {/* 1.1 TACTICAL SIMULATION ASSETS: MOBILE COOLING BUSES */}
            {coolingBusesDeployed > 0 && BUS_OFFSETS.slice(0, coolingBusesDeployed).map((bus, idx) => (
              <div key={`bus-${idx}`}>
                {/* 500m Walking Radius Circle */}
                <Circle
                  center={[selectedZone.lat + bus.dlat, selectedZone.lng + bus.dlng]}
                  radius={750}
                  pathOptions={{
                    color: '#00e5a3',
                    weight: 1.5,
                    dashArray: '4, 4',
                    fillColor: '#00e5a3',
                    fillOpacity: 0.18,
                  }}
                />
                {/* Bus Node Marker */}
                <CircleMarker
                  center={[selectedZone.lat + bus.dlat, selectedZone.lng + bus.dlng]}
                  radius={8}
                  pathOptions={{
                    color: '#080d17',
                    weight: 2,
                    fillColor: '#00e5a3',
                    fillOpacity: 1,
                  }}
                >
                  <Popup autoPan={true} closeButton={false}>
                    <div className="p-2.5 min-w-[200px] bg-[#0e1626] text-slate-100 rounded-xl border border-[#00e5a3] font-mono text-xs shadow-2xl">
                      <div className="font-bold text-[#00e5a3] text-[11px] mb-1 flex items-center justify-between">
                        <span>❄️ AC Cooling Bus #{idx + 1}</span>
                        <span className="text-[8.5px] bg-[#00e5a3]/20 text-[#00e5a3] px-1.5 py-0.2 rounded">ACTIVE</span>
                      </div>
                      <div className="text-[10px] text-slate-300 mb-1">{bus.name}</div>
                      <div className="text-[9px] text-slate-400 space-y-0.5 border-t border-slate-800 pt-1">
                        <div>Cabin Temp: <strong className="text-white">68°F (20°C)</strong></div>
                        <div>Hydration: <strong className="text-[#00f2fe]">Free Cold Water & Misters</strong></div>
                        <div>Throughput: <strong className="text-[#00e5a3]">85 Persons / Hr</strong></div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              </div>
            ))}

            {/* 1.2 TACTICAL SIMULATION ASSETS: BACKUP GENERATORS */}
            {generatorsDeployed > 0 && GENERATOR_OFFSETS.slice(0, generatorsDeployed).map((gen, idx) => (
              <CircleMarker
                key={`gen-${idx}`}
                center={[selectedZone.lat + gen.dlat, selectedZone.lng + gen.dlng]}
                radius={7}
                pathOptions={{
                  color: '#080d17',
                  weight: 2,
                  fillColor: '#eab308',
                  fillOpacity: 0.95,
                }}
              >
                <Popup autoPan={true} closeButton={false}>
                  <div className="p-2.5 min-w-[190px] bg-[#0e1626] text-slate-100 rounded-xl border border-amber-500/60 font-mono text-xs shadow-2xl">
                    <div className="font-bold text-amber-400 text-[11px] mb-1">⚡ Mega-Generator #{idx + 1}</div>
                    <div className="text-[10px] text-slate-300 mb-1">{gen.name}</div>
                    <div className="text-[9px] text-slate-400 border-t border-slate-800 pt-1">
                      <div>Grid Load Relief: <strong className="text-amber-300">+10 MW Local Backup</strong></div>
                      <div>Status: <strong className="text-[#00e5a3]">Online & Synchronized</strong></div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* 1.3 TACTICAL SIMULATION ASSETS: PARAMEDIC TRIAGE STATIONS */}
            {paramedicSurgeDeployed > 0 && PARAMEDIC_OFFSETS.slice(0, paramedicSurgeDeployed).map((med, idx) => (
              <CircleMarker
                key={`med-${idx}`}
                center={[selectedZone.lat + med.dlat, selectedZone.lng + med.dlng]}
                radius={7}
                pathOptions={{
                  color: '#080d17',
                  weight: 2,
                  fillColor: '#f43f5e',
                  fillOpacity: 0.95,
                }}
              >
                <Popup autoPan={true} closeButton={false}>
                  <div className="p-2.5 min-w-[190px] bg-[#0e1626] text-slate-100 rounded-xl border border-rose-500/60 font-mono text-xs shadow-2xl">
                    <div className="font-bold text-rose-400 text-[11px] mb-1">🚑 Paramedic Triage Unit #{idx + 1}</div>
                    <div className="text-[10px] text-slate-300 mb-1">{med.name}</div>
                    <div className="text-[9px] text-slate-400 border-t border-slate-800 pt-1">
                      <div>Capability: <strong className="text-white">Active Ice Baths & IV Saline</strong></div>
                      <div>ER Diversion: <strong className="text-[#00e5a3]">On-site Stabilization</strong></div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </>
        )}

        {/* Live GPS User Marker */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={11}
            pathOptions={{
              color: '#00e5a3',
              weight: 2.5,
              fillColor: '#05d5a8',
              fillOpacity: 0.85,
            }}
          >
            <Popup autoPan={true} closeButton={false}>
              <div className="p-2 min-w-[150px] bg-[#0e1626] text-slate-100 rounded-xl border border-[#1e2d42]">
                <div className="font-mono font-bold text-[#00e5a3] text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00e5a3] animate-ping inline-block" />
                  Live GPS Fix Lock
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {userLocation.lat.toFixed(4)}°N, {userLocation.lng.toFixed(4)}°W
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* 2. NEIGHBORHOOD MUNICIPAL ZONE SENSOR HUBS */}
        {zones.map((zone) => {
          const score = zone.liveRiskScore;
          const isSelected = zone.id === selectedZoneId;
          const color = getScoreColor(score);
          
          let baseRadius = 8;
          if (score !== null) {
            if (score >= 80) baseRadius = 15;
            else if (score >= 60) baseRadius = 12;
            else if (score >= 40) baseRadius = 10;
          }
          
          const radius = isSelected ? baseRadius + 4 : baseRadius;
          
          return (
            <CircleMarker
              key={zone.id}
              center={[zone.lat, zone.lng]}
              radius={radius}
              pathOptions={{
                color: isSelected ? '#00e5a3' : '#080d17',
                weight: isSelected ? 3.5 : 1.5,
                fillColor: color,
                fillOpacity: isSelected ? 0.95 : 0.82,
              }}
              eventHandlers={{
                click: () => onZoneSelect(zone.id),
              }}
            >
              <Popup autoPan={true} closeButton={false}>
                <div className="p-3 min-w-[220px] bg-[#0e1626] text-slate-100 rounded-xl border border-[#1e2d42] shadow-2xl">
                  <div className="font-bold text-slate-100 uppercase tracking-wide text-xs mb-0.5">{zone.name}</div>
                  <div className="text-[9px] text-[#00e5a3] font-mono uppercase tracking-wider mb-1.5">{zone.metro}</div>
                  
                  <div className="text-[10px] text-slate-300 font-mono mb-1.5 border-t border-slate-800/80 pt-1.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Live Temperature:</span>
                      <span className="text-[#00e5a3] font-bold">
                        {zone.temperatureF !== null ? `${zone.temperatureF}°F` : 'DATA UNAVAILABLE'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Local Observation:</span>
                      <span className="text-slate-200 text-[9px]">{zone.localObservationTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Elderly Exposure:</span>
                      <span className="text-white font-bold">{zone.elderlyPopulationPct}% (Census ACS)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Tree Canopy:</span>
                      <span className="text-[#00f2fe] font-bold">{zone.treeCoveragePct}% Coverage</span>
                    </div>
                    <div className="flex items-center justify-between pt-0.5 border-t border-slate-800">
                      <span className="text-slate-400 font-bold">Calculated Risk:</span>
                      <span className="text-rose-400 font-bold text-xs">
                        {score !== null ? `${score} / 100` : 'DATA UNAVAILABLE'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[9.5px] text-[#00f2fe] font-mono font-bold uppercase tracking-wider flex items-center justify-between hover:text-[#00e5a3] transition-colors pt-1 border-t border-slate-800 cursor-pointer">
                    <span>Simulate Interventions</span>
                    <span>&rarr;</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* FLOATING ENHANCED LEGEND (Bottom-Left) */}
      <div className="absolute bottom-5 left-5 z-[1000] pointer-events-none font-mono">
        <div className="bg-[#0e1626]/95 backdrop-blur-md p-3 rounded-xl shadow-2xl pointer-events-auto border border-[#1e2d42] space-y-2">
          <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold flex items-center justify-between gap-4 border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1.5 text-slate-200">
              <ShieldAlert className="w-3.5 h-3.5 text-[#00e5a3]" />
              <span>Urban Heat Vulnerability Index</span>
            </span>
            <span className="text-[#00e5a3] font-bold">0–100 SCALE</span>
          </div>

          <div className="flex gap-2.5 items-center text-[9px]">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#10b981]" /><span className="text-slate-300">Low (0-39)</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#eab308]" /><span className="text-slate-300">Mod (40-59)</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#ea580c]" /><span className="text-slate-300">High (60-79)</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#dc2626]" /><span className="text-slate-300">Extreme (80+)</span></div>
          </div>

          <div className="text-[8.5px] text-slate-400 pt-1 border-t border-slate-800 flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 rounded-full border border-dashed border-[#00e5a3]/80 bg-[#00e5a3]/20" />
            <span>Shaded Radius: <strong>18 km Metropolitan Thermal Heat Dome</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
