'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl, { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import {
  BusFront,
  GraduationCap,
  Layers,
  LocateFixed,
  Maximize2,
  Minus,
  Plus,
  Navigation,
  MapPin,
} from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BusInfo, COLLEGE } from '@/lib/types';
import { hasCoordinates } from '@/lib/geo';
import 'maplibre-gl/dist/maplibre-gl.css';
const mapTileUrl =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export default function BusMap({
  buses,
  selected,
  stopId,
  onSelect,
  onStop,
}: {
  buses: BusInfo[];
  selected: BusInfo;
  stopId: string;
  onSelect: (id: string) => void;
  onStop: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const busMarkers = useRef<Map<string, Marker>>(new Map());
  const stopMarkers = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [mapError, setMapError] = useState('');
  const callbacks = useRef({ onSelect, onStop });
  useEffect(() => {
    callbacks.current = { onSelect, onStop };
  }, [onSelect, onStop]);
  useEffect(() => {
    if (!container.current) return;
    const markers = busMarkers.current;
    const instance = new maplibregl.Map({
      container: container.current,
      center: [COLLEGE.longitude, COLLEGE.latitude],
      zoom: 13.4,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          basemap: {
            type: 'raster',
            tiles: [mapTileUrl],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors | Imagery &copy; Esri',
          },
        },
        layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
      },
    });
    map.current = instance;
    // Route layers and markers need a ready style, not completion of every remote tile.
    instance.once('style.load', () => {
      instance.addSource('route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      instance.addLayer({
        id: 'route-outline',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.9 },
        layout: { 'line-join': 'round', 'line-cap': 'round' },
      });
      instance.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#25408f', 'line-width': 4 },
        layout: { 'line-join': 'round', 'line-cap': 'round' },
      });
      const campus = document.createElement('div');
      campus.className = 'campus-marker';
      campus.innerHTML = `${renderToStaticMarkup(<GraduationCap size={23} />)}<span>IIIT DHARWAD</span>`;
      new Marker({ element: campus })
        .setLngLat([COLLEGE.longitude, COLLEGE.latitude])
        .addTo(instance);
      setReady(true);
    });
    instance.on('error', (event) => {
      if (event.error?.message?.includes('WebGL'))
        setMapError('Map rendering is unavailable on this device.');
    });
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      markers.clear();
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    const instance = map.current;
    const located = selected.route.stops.filter(hasCoordinates);
    const complete = located.length === selected.route.stops.length && located.length >= 2;
    (instance.getSource('route') as GeoJSONSource).setData(
      complete
        ? {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: located.map((stop) => [stop.longitude, stop.latitude]),
            },
          }
        : { type: 'FeatureCollection', features: [] },
    );
    instance.setPaintProperty('route-line', 'line-color', selected.route.color);
    const bounds = new maplibregl.LngLatBounds();
    located.forEach((stop) => bounds.extend([stop.longitude, stop.latitude]));
    if (!located.length) bounds.extend([COLLEGE.longitude, COLLEGE.latitude]);
    instance.fitBounds(bounds, {
      padding: { top: 100, bottom: 140, left: 65, right: 65 },
      maxZoom: 14,
      duration: 1000,
    });
  }, [ready, selected.id, selected.route]);
  useEffect(() => {
    if (!ready || !map.current) return;
    stopMarkers.current.forEach((marker) => marker.remove());
    stopMarkers.current = selected.route.stops
      .filter((stop) => stop.stopName !== 'IIIT Dharwad Campus')
      .filter(hasCoordinates)
      .map((stop) => {
        const element = document.createElement('button');
        element.className = `stop-marker ${stop.id === stopId ? 'chosen' : ''}`;
        element.title = stop.stopName;
        element.setAttribute('aria-label', `Select ${stop.stopName}`);
        element.style.setProperty('--route-color', selected.route.color);
        element.addEventListener('click', () => callbacks.current.onStop(stop.id));
        return new Marker({ element })
          .setLngLat([stop.longitude, stop.latitude])
          .addTo(map.current!);
      });
  }, [ready, selected.route, stopId]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const activeIds = new Set<string>();
    buses.forEach((bus) => {
      if (!bus.location || bus.status === 'STALE') return;
      activeIds.add(bus.id);
      let marker = busMarkers.current.get(bus.id);
      if (!marker) {
        const element = document.createElement('button');
        element.innerHTML = `${renderToStaticMarkup(<BusFront size={18} />)}<span>${bus.busNumber}</span>`;
        element.title = `Track Bus ${bus.busNumber}`;
        element.setAttribute('aria-label', `Track Bus ${bus.busNumber}`);
        element.addEventListener('click', () => callbacks.current.onSelect(bus.id));
        marker = new Marker({ element })
          .setLngLat([bus.location.longitude, bus.location.latitude])
          .addTo(map.current!);
        busMarkers.current.set(bus.id, marker);
      }
      marker.getElement().className = `bus-marker ${bus.id === selected.id ? 'selected' : ''}`;
      marker.getElement().style.setProperty('--route-color', bus.route.color);
      marker.setLngLat([bus.location.longitude, bus.location.latitude]);
    });
    busMarkers.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        busMarkers.current.delete(id);
      }
    });
  }, [buses, selected.id, ready]);
  function toggleLayer() {
    const source = map.current?.getSource('basemap') as maplibregl.RasterTileSource | undefined;
    source?.setTiles([
      satellite
        ? mapTileUrl
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ]);
    setSatellite(!satellite);
  }
  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await wrapper.current?.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      setMapError('Fullscreen is not available in this browser.');
    }
  }
  const selectedStop = selected.route.stops.find((stop) => stop.id === stopId);
  return (
    <div className="map-wrapper" ref={wrapper}>
      <div ref={container} className="bus-map" aria-label="Live bus tracking map" />
      <div className="map-route-label">
        <span className="map-route-icon">
          <Navigation size={20} />
        </span>
        <div>
          <strong>{selected.route.name}</strong>
          <span>
            <MapPin size={12} />
            IIIT Dharwad transport
          </span>
        </div>
        <span className="map-live">
          <span className="live-dot" />
          LIVE
        </span>
      </div>
      {ready && selected.route.stops.some((stop) => !hasCoordinates(stop)) && (
        <div className="map-location-status">Route pins pending verification</div>
      )}
      <div className="map-controls">
        <button title="Zoom in" aria-label="Zoom in" onClick={() => map.current?.zoomIn()}>
          <Plus size={19} />
        </button>
        <button title="Zoom out" aria-label="Zoom out" onClick={() => map.current?.zoomOut()}>
          <Minus size={19} />
        </button>
        <span />
        <button
          title="Center on bus"
          aria-label="Center on bus"
          onClick={() => {
            if (selected.location)
              map.current?.flyTo({
                center: [selected.location.longitude, selected.location.latitude],
                zoom: 15,
              });
          }}
        >
          <LocateFixed size={19} />
        </button>
        <button
          title="Toggle satellite layer"
          aria-label="Toggle satellite layer"
          onClick={toggleLayer}
          className={satellite ? 'enabled' : ''}
        >
          <Layers size={19} />
        </button>
        <button title="Toggle fullscreen" aria-label="Toggle fullscreen" onClick={toggleFullscreen}>
          <Maximize2 size={18} />
        </button>
      </div>
      {!ready && (
        <div className="map-loading">
          <span className="spinner" />
          Loading map…
        </div>
      )}
      {mapError && <div className="map-error">{mapError}</div>}
      <div className="map-legend">
        <span>
          <i className="legend-line" style={{ background: selected.route.color }} />
          Bus route
        </span>
        <span>
          <i className="legend-stop" />
          Bus stop
        </span>
        <span>
          <i className="legend-campus" />
          Campus
        </span>
      </div>
      <div className="map-bus-summary">
        <span className="summary-bus">
          <BusFront size={23} />
        </span>
        <div>
          <strong>
            Bus {selected.busNumber}
            <span className={`status-badge ${selected.status.toLowerCase()}`}>
              {selected.status === 'INACTIVE'
                ? 'Trip ended'
                : selected.status === 'STALE'
                  ? 'Signal lost'
                  : selected.status === 'DELAYED'
                    ? 'Delayed'
                    : 'On time'}
            </span>
          </strong>
          <span>
            {selected.location && selected.status !== 'STALE' ? (
              <>
                <span className="live-dot" />
                GPS signal active
              </>
            ) : selected.status === 'STALE' ? (
              'Waiting for GPS'
            ) : (
              'No active trip'
            )}
            <i>·</i>
            {selected.location?.speed ?? 0} km/h
          </span>
        </div>
        <div className="summary-destination">
          <small>HEADING TO</small>
          <strong>{selectedStop?.stopName ?? selected.route.destination}</strong>
        </div>
      </div>
    </div>
  );
}
