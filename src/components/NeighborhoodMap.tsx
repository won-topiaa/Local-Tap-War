import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap, CircleMarker } from 'react-leaflet';
import type { Neighborhood } from '../data/neighborhoods';
import 'leaflet/dist/leaflet.css';

interface NeighborhoodMapProps {
  neighborhoods: Neighborhood[];
  myNeighborhoodId: string;
  isFever: boolean;
  onSelectNeighborhood: (id: string) => void;
  selectedId: string;
}

function PulseCircle({ center, active, color }: { center: [number, number]; active: boolean; color: string }) {
  const [radius, setRadius] = useState(20);

  useEffect(() => {
    if (!active) return;
    let frame: number;
    let start: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = ((ts - start) % 1200) / 1200;
      setRadius(20 + Math.sin(progress * Math.PI * 2) * 10);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  if (!active) return null;

  return (
    <CircleMarker
      center={center}
      radius={radius}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 2,
        opacity: 0.6,
      }}
    />
  );
}

function MapBounds({ center }: { center: [number, number] }) {
  const map = useMap();
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      map.setView(center, 14);
      initialized.current = true;
    }
  }, [map, center]);
  return null;
}

function TapRipple({ center, trigger }: { center: [number, number]; trigger: number }) {
  const [ripples, setRipples] = useState<{ id: number; point: [number, number] }[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const jitterLat = center[0] + (Math.random() - 0.5) * 0.003;
    const jitterLng = center[1] + (Math.random() - 0.5) * 0.003;
    const id = trigger;
    setRipples((prev) => [...prev, { id, point: [jitterLat, jitterLng] }]);
    const t = setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
    return () => clearTimeout(t);
  }, [trigger, center]);

  return (
    <>
      {ripples.map((r) => (
        <CircleMarker
          key={r.id}
          center={r.point}
          radius={15}
          pathOptions={{
            color: '#FDE047',
            fillColor: '#FDE047',
            fillOpacity: 0.4,
            weight: 2,
          }}
        />
      ))}
    </>
  );
}

export function NeighborhoodMap({
  neighborhoods,
  myNeighborhoodId,
  isFever,
  onSelectNeighborhood,
  selectedId,
}: NeighborhoodMapProps) {
  const [tapTrigger, setTapTrigger] = useState(0);
  const myNeighborhood = neighborhoods.find((n) => n.id === myNeighborhoodId);
  const maxTaps = Math.max(...neighborhoods.map((n) => n.taps));

  const triggerRipple = useCallback(() => {
    setTapTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    (window as any).__mapTriggerRipple = triggerRipple;
    return () => { delete (window as any).__mapTriggerRipple; };
  }, [triggerRipple]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl">
      <MapContainer
        center={myNeighborhood?.center || [37.5007, 127.0365]}
        zoom={14}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
        dragging={true}
        scrollWheelZoom={true}
        doubleClickZoom={false}
        touchZoom={true}
      >
        <MapBounds center={myNeighborhood?.center || [37.5007, 127.0365]} />

        <TileLayer
          url={isFever
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          }
        />

        {neighborhoods.map((n) => {
          const isMe = n.id === myNeighborhoodId;
          const isSelected = n.id === selectedId;
          const intensity = n.taps / maxTaps;

          return (
            <Polygon
              key={n.id}
              positions={n.polygon}
              pathOptions={{
                color: isMe ? (isFever ? '#FDE047' : '#3B82F6') : n.color,
                fillColor: isMe ? (isFever ? '#FDE047' : '#3B82F6') : n.color,
                fillOpacity: 0.15 + intensity * 0.35,
                weight: isSelected ? 4 : isMe ? 3 : 2,
                dashArray: isMe ? undefined : '5 5',
              }}
              eventHandlers={{
                click: () => onSelectNeighborhood(n.id),
              }}
            >
              <Tooltip
                permanent
                direction="center"
                className="neighborhood-label"
              >
                <div className="text-center">
                  <div className="font-black text-sm">{n.name}</div>
                  <div className="text-xs opacity-80">{n.taps.toLocaleString()}</div>
                </div>
              </Tooltip>
            </Polygon>
          );
        })}

        {myNeighborhood && (
          <>
            <PulseCircle
              center={myNeighborhood.center}
              active={isFever}
              color={isFever ? '#FDE047' : '#3B82F6'}
            />
            <TapRipple center={myNeighborhood.center} trigger={tapTrigger} />
          </>
        )}
      </MapContainer>

      {/* Map overlay info */}
      <div className="absolute top-3 left-3 z-[1000] pointer-events-none">
        <div className={`px-3 py-1.5 rounded-lg backdrop-blur-md text-xs font-bold ${
          isFever ? 'bg-black/50 text-yellow-400' : 'bg-white/80 text-gray-700'
        }`}>
          실시간 동네 전쟁 지도
        </div>
      </div>
    </div>
  );
}
