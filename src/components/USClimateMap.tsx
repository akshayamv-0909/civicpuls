"use client";

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LiveStateTelemetry } from '@/lib/liveWeatherService';
import { ClimateHazardType, getRiskTier } from '@/lib/climateRiskEngine';
import { Locate, Layers, Globe, Mountain, Flame, Radio, Moon } from 'lucide-react';

export type SatelliteViewType = 'gis' | 'satellite' | 'terrain' | 'thermal' | 'radar' | 'night';

interface USClimateMapProps {
  states: LiveStateTelemetry[];
  selectedStateId: string | null;
  activeHazardLayer: ClimateHazardType;
  onStateSelect: (stateId: string) => void;
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
    attribution: 'Tiles &copy; Esri, DeLorme, NAVTEQ &mdash; NOAA / NCEI'
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
    attribution: 'Thermal & Radar Overlay &copy; NOAA / NWS NEXRAD'
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
  if (score >= 90) return '#7f1d1d'; // Dark Red
  if (score >= 80) return '#dc2626'; // Red
  if (score >= 65) return '#ea580c'; // Orange
  if (score >= 45) return '#eab308'; // Amber
  return '#16a34a'; // Green
}

function getHazardScoreForLiveState(state: LiveStateTelemetry, layer: ClimateHazardType): number | null {
  switch (layer) {
    case 'overall': return state.overallRisk;
    case 'heat': return state.heatRisk;
    case 'flood': return state.floodRisk;
    case 'drought': return state.droughtRisk;
    case 'wildfire': return state.wildfireRisk;
    default: return state.overallRisk;
  }
}

function MapViewController({ 
  selectedState, 
  userLocation 
}: { 
  selectedState: LiveStateTelemetry | undefined;
  userLocation: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 8, { duration: 1.5 });
    } else if (selectedState) {
      map.flyTo([selectedState.lat, selectedState.lng], 6, { duration: 1.2 });
    }
  }, [selectedState, userLocation, map]);

  return null;
}

export default function USClimateMap({
  states,
  selectedStateId,
  activeHazardLayer,
  onStateSelect
}: USClimateMapProps) {
  const defaultCenter: [number, number] = [38.50, -96.50];
  const selectedState = states.find(s => s.id === selectedStateId);

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
          title="Detect and lock onto live GPS satellite coordinates"
        >
          <Locate className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-[#00e5a3]' : 'text-[#00e5a3]'}`} />
          <span>{isLocating ? 'Acquiring GPS...' : userLocation ? 'GPS Lock' : 'My Location'}</span>
        </button>

        <div className="flex items-center bg-[#0e1626]/90 border border-[#1e2d42] rounded-xl shadow-lg backdrop-blur-md p-1">
          <div className="flex items-center gap-1 pl-2 pr-1 text-[#00e5a3] text-xs font-mono">
            <Layers className="w-3.5 h-3.5 text-[#00e5a3]" />
            <span className="text-[10px] uppercase tracking-wider font-bold hidden md:inline">Feed:</span>
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
        maxZoom={14}
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

        <MapViewController selectedState={selectedState} userLocation={userLocation} />

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

        {/* 50-State Multi-Hazard Risk Markers */}
        {states.map((state) => {
          const score = getHazardScoreForLiveState(state, activeHazardLayer);
          const isSelected = state.id === selectedStateId;
          const color = getScoreColor(score);
          const tier = score !== null ? getRiskTier(score) : 'UNKNOWN';

          let radius = 10;
          if (score !== null) {
            if (score >= 90) radius = 18;
            else if (score >= 80) radius = 15;
            else if (score >= 65) radius = 13;
            else if (score >= 45) radius = 11;
            else radius = 9;
          }

          if (isSelected) radius += 4;

          return (
            <CircleMarker
              key={state.id}
              center={[state.lat, state.lng]}
              radius={radius}
              pathOptions={{
                color: isSelected ? '#00e5a3' : '#080d17',
                weight: isSelected ? 3.5 : 1.5,
                fillColor: color,
                fillOpacity: isSelected ? 0.95 : 0.82,
              }}
              eventHandlers={{
                click: () => onStateSelect(state.id),
              }}
            >
              <Popup autoPan={true} closeButton={false}>
                <div className="p-3 min-w-[200px] bg-[#0e1626] text-slate-100 rounded-xl border border-[#1e2d42] shadow-2xl">
                  <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-slate-800/80 pb-1.5">
                    <span className="font-bold text-slate-100 text-sm tracking-wide">{state.name}</span>
                    <span 
                      className="text-[9px] font-mono font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm"
                      style={{ backgroundColor: color }}
                    >
                      {tier}
                    </span>
                  </div>
                  
                  <div className="text-[11px] text-slate-300 mb-2 font-mono flex items-center justify-between">
                    <span className="text-slate-400 uppercase text-[9.5px]">Live Risk Index:</span>
                    <strong className="text-[#00e5a3] text-xs">
                      {score !== null ? `${score} / 100` : 'DATA UNAVAILABLE'}
                    </strong>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-[#090e18] p-2 rounded-lg border border-[#1e2d42]/60 mb-2">
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase">Live Temp</span>
                      <span className="font-bold text-[#00e5a3]">
                        {state.currentTempF !== null ? `${state.currentTempF}°F` : 'UNAVAILABLE'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase">Temp Anomaly</span>
                      <span className={`font-bold ${state.tempAnomalyF !== null && state.tempAnomalyF > 0 ? 'text-rose-400' : 'text-[#00f2fe]'}`}>
                        {state.tempAnomalyF !== null ? `${state.tempAnomalyF > 0 ? '+' : ''}${state.tempAnomalyF}°F` : 'UNAVAILABLE'}
                      </span>
                    </div>
                  </div>

                  {state.activeNWSAlertCount > 0 && (
                    <div className="text-[9px] font-mono text-rose-300 bg-rose-950/40 p-1.5 rounded-lg border border-rose-600/40 mb-2 leading-tight flex items-center justify-between">
                      <span>⚠ ACTIVE NOAA ALERTS</span>
                      <strong className="font-bold">{state.activeNWSAlertCount} Active</strong>
                    </div>
                  )}

                  <div className="text-[10px] text-[#00f2fe] font-mono font-bold uppercase tracking-wider flex items-center justify-between hover:text-[#00e5a3] transition-colors pt-1 border-t border-slate-800 cursor-pointer">
                    <span>Inspect State Profile</span>
                    <span className="text-xs">&rarr;</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
