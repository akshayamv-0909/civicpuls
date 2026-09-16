"use client";

import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ZoneData } from '@/data/mockCityData';
import { calculateHeatRiskScore, getRiskColor } from '@/lib/riskEngine';

interface MapProps {
  zones: ZoneData[];
  selectedZoneId: string | null;
  onZoneSelect: (zoneId: string) => void;
}

export default function Map({ zones, selectedZoneId, onZoneSelect }: MapProps) {
  // Center roughly on Washington DC
  const position: [number, number] = [38.8951, -77.0364];

  return (
    <div className="h-full w-full border-x border-stone-200 z-0 relative">
      <MapContainer center={position} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
        />
        {zones.map((zone) => {
          const score = calculateHeatRiskScore(zone);
          const isSelected = zone.id === selectedZoneId;
          const color = getRiskColor(score);
          
          let baseRadius = 500;
          if (score >= 80) baseRadius = 1100;
          else if (score >= 60) baseRadius = 850;
          else if (score >= 40) baseRadius = 650;
          
          const radius = isSelected ? baseRadius * 1.25 : baseRadius;
          
          return (
            <Circle
              key={zone.id}
              center={[zone.lat, zone.lng]}
              radius={radius}
              pathOptions={{
                color: color,
                weight: isSelected ? 3 : 2,
                fillColor: color,
                fillOpacity: isSelected ? 0.6 : 0.4,
              }}
              eventHandlers={{
                click: () => onZoneSelect(zone.id),
              }}
            >
              <Popup autoPan={true} closeButton={false}>
                <div className="p-0.5 min-w-[140px]">
                  <div className="font-serif font-bold text-slate-900 uppercase tracking-wide text-xs mb-1.5">{zone.name}</div>
                  <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest mb-2.5">
                    Risk Score <span className="text-slate-900 font-bold ml-1 text-sm">{score}</span> / 100
                  </div>
                  <div className="text-[9px] text-blue-600 font-bold uppercase tracking-widest flex items-center gap-1 hover:text-blue-800 transition-colors">
                    Click to analyze risk <span className="text-lg leading-none mb-0.5">&rarr;</span>
                  </div>
                </div>
              </Popup>
            </Circle>
          );
        })}
      </MapContainer>
    </div>
  );
}
