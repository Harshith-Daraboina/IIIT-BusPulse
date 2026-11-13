'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BellRing,
  BusFront,
  Check,
  ChevronRight,
  Clock3,
  Download,
  Info,
  LocateFixed,
  MapPin,
  MessageCircle,
  Radio,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Shell } from './shell';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { DriverChat } from './driver-chat';
import { AlertInfo, BusInfo, FleetResponse, HistoryItem } from '@/lib/types';
import { etaMinutes, stopProximity } from '@/lib/geo';
import { fetchJson } from '@/lib/utils';
const BusMap = dynamic(() => import('./bus-map'), {
  ssr: false,
  loading: () => <div className="map-placeholder skeleton" />,
});
type View = 'tracking' | 'routes' | 'history' | 'alerts';
const titles = {
  tracking: 'Live tracking',
  routes: 'Bus routes',
  history: 'Trip history',
  alerts: 'Arrival alerts',
};
const statusText = {
  ON_TIME: 'On time',
  DELAYED: 'Delayed',
  INACTIVE: 'Inactive',
  STALE: 'Signal lost',
};
export function Dashboard({ view }: { view: View }) {
  const fleet = useQuery({
    queryKey: ['fleet'],
    queryFn: () => fetchJson<FleetResponse>('/api/buses'),
    refetchInterval: 3000,
  });
  const [selectedId, setSelectedId] = useState('BUS001');
  const [stopId, setStopId] = useState('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [filter, setFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('stops');
  const [alertDialog, setAlertDialog] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [demoSubscriptions, setDemoSubscriptions] = useState<string[]>([]);
  const [demoAlerts, setDemoAlerts] = useState<AlertInfo[]>([]);
  const [localAlertsReady, setLocalAlertsReady] = useState(false);
  const [toast, setToast] = useState('');
  const [pendingAlert, setPendingAlert] = useState(false);
  const notified = useRef(new Set<string>());
  const [days, setDays] = useState(7);
  const history = useQuery({
    queryKey: ['history', days],
    queryFn: () => fetchJson<{ trips: HistoryItem[]; demo: boolean }>(`/api/history?days=${days}`),
    enabled: view === 'history',
  });
  useEffect(() => {
    const bus = new URLSearchParams(window.location.search).get('bus');
    if (bus) setSelectedId(bus);
  }, []);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem('campusride-subscriptions') ?? '[]');
      if (Array.isArray(stored) && stored.every((item) => typeof item === 'string'))
        setDemoSubscriptions(stored);
    } catch {
      localStorage.removeItem('campusride-subscriptions');
    }
    try {
      const stored = z
        .array(
          z.object({
            id: z.string(),
            message: z.string(),
            read: z.boolean(),
            createdAt: z.iso.datetime(),
          }),
        )
        .safeParse(JSON.parse(localStorage.getItem('buspulse-arrival-alerts') ?? '[]'));
      if (stored.success) {
        const alerts = stored.data.slice(0, 50);
        setDemoAlerts(alerts);
        notified.current = new Set(alerts.map((alert) => alert.id));
      }
    } catch {
      localStorage.removeItem('buspulse-arrival-alerts');
    }
    setLocalAlertsReady(true);
  }, []);
  useEffect(() => {
    if (localAlertsReady)
      localStorage.setItem('buspulse-arrival-alerts', JSON.stringify(demoAlerts));
  }, [demoAlerts, localAlertsReady]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timeout);
  }, [toast]);
  const buses = fleet.data?.buses ?? [];
  const demo = fleet.data?.demo ?? false;
  const selected = buses.find((bus) => bus.id === selectedId) ?? buses[0];
  const effectiveStopId = selected?.route.stops.some((stop) => stop.id === stopId)
    ? stopId
    : (selected?.route.stops.at(-1)?.id ?? '');
  const selectedStop = selected?.route.stops.find((stop) => stop.id === effectiveStopId);
  const eta = selectedStop && selected ? etaMinutes(selected.location, selectedStop) : null;
  const subscriptions = demoSubscriptions;
  const notifications = demoAlerts;
  const routes = Array.from(new Map(buses.map((bus) => [bus.route.id, bus.route])).values());
  const activeBuses = buses.filter((bus) => bus.status !== 'INACTIVE');
  const filtered = buses.filter(
    (bus) =>
      `${bus.busNumber} ${bus.route.name} ${bus.route.source}`
        .toLowerCase()
        .includes(deferredSearch.toLowerCase()) &&
      (filter === 'all' ||
        (filter === 'active' && bus.status !== 'INACTIVE') ||
        (filter === 'delayed' && bus.status === 'DELAYED')) &&
      (routeFilter === 'all' || bus.route.id === routeFilter),
  );
  useEffect(() => {
    if (!fleet.data || !localAlertsReady) return;
    const additions: AlertInfo[] = [];
    for (const bus of fleet.data.buses)
      for (const stop of bus.route.stops) {
        if (
          !bus.location ||
          Date.now() - Date.parse(bus.location.updatedAt) > 30_000 ||
          !demoSubscriptions.includes(stop.id) ||
          !stopProximity(bus.location, stop).notify
        )
          continue;
        const key = `${bus.location.tripId}:${stop.id}`;
        if (notified.current.has(key)) continue;
        notified.current.add(key);
        const message = `Bus ${bus.busNumber} is approaching ${stop.stopName}. Arriving in approximately 5 minutes.`;
        additions.push({ id: key, message, read: false, createdAt: new Date().toISOString() });
        if ('Notification' in window && Notification.permission === 'granted')
          new Notification('IIIT BusPulse · Arrival alert', { body: message });
      }
    if (additions.length) setDemoAlerts((current) => [...additions, ...current].slice(0, 50));
  }, [fleet.data, demoSubscriptions, localAlertsReady]);
  function selectBus(id: string) {
    setSelectedId(id);
    const bus = buses.find((bus) => bus.id === id);
    const stop = bus?.route.stops.at(-1);
    if (stop) setStopId(stop.id);
  }
  async function toggleSubscription(id: string) {
    const enabled = !subscriptions.includes(id);
    setPendingAlert(true);
    try {
      if (enabled && 'Notification' in window && Notification.permission === 'default')
        await Notification.requestPermission();
      const next = enabled
        ? [...demoSubscriptions, id]
        : demoSubscriptions.filter((stop) => stop !== id);
      setDemoSubscriptions(next);
      localStorage.setItem('campusride-subscriptions', JSON.stringify(next));
      setToast(enabled ? 'Arrival alert enabled for your stop.' : 'Arrival alert removed.');
      setAlertDialog(false);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not update alert.');
    } finally {
      setPendingAlert(false);
    }
  }
  function exportHistory() {
    const rows = [
      ['Bus', 'Route', 'Departure', 'Arrival', 'Status'],
      ...(history.data?.trips ?? []).map((trip) => [
        trip.busNumber,
        trip.routeName,
        trip.startTime,
        trip.endTime ?? '',
        trip.status,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'iiit-buspulse-trips.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Shell
      title={titles[view]}
      demo={demo}
      notificationCount={notifications.filter((item) => !item.read).length}
    >
      <div className="page-heading">
        <div>
          <h1>{view === 'tracking' ? 'Where is my bus?' : titles[view]}</h1>
          <p>
            {view === 'tracking'
              ? 'Pick your bus and stop. We will tell you when to leave.'
              : view === 'routes'
                ? 'Find your route and every stop along the way.'
                : view === 'history'
                  ? 'A clear picture of your past campus commutes.'
                  : 'Be ready when your bus is around the corner.'}
          </p>
        </div>
        <span className="today">
          <Clock3 size={15} />
          {new Intl.DateTimeFormat('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            timeZone: 'Asia/Kolkata',
          }).format(new Date())}
        </span>
      </div>
      {fleet.error && (
        <div className="error-banner">
          <Info size={20} />
          <span>{fleet.error.message}</span>
          <Button variant="outline" size="sm" onClick={() => fleet.refetch()}>
            <RefreshCw size={14} />
            Retry
          </Button>
        </div>
      )}
      {view === 'tracking' && selected && (
        <section className="ride-card" aria-label="Your ride">
          <div className="ride-main">
            <small>YOUR NEXT BUS</small>
            <div className="ride-eta">
              {eta === null ? '—' : eta === 0 ? 'Now' : eta}
              {eta !== null && eta > 0 && <span>min</span>}
            </div>
            <p>
              Bus {selected.busNumber} · {statusText[selected.status]}
              {selectedStop && ` · to ${selectedStop.stopName}`}
            </p>
          </div>
          <div className="ride-controls">
            <label>
              <span>Bus</span>
              <select value={selected.id} onChange={(event) => selectBus(event.target.value)}>
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    Bus {bus.busNumber} · {bus.route.source} to {bus.route.destination}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Your stop</span>
              <select value={effectiveStopId} onChange={(event) => setStopId(event.target.value)}>
                {selected.route.stops.map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    {stop.stopName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="ride-actions">
            <Button onClick={() => setAlertDialog(true)}>
              <Bell size={16} />
              Notify me
            </Button>
            <Button variant="outline" onClick={() => setChatOpen(true)}>
              <MessageCircle size={16} />
              Chat with driver
            </Button>
          </div>
        </section>
      )}
      {view === 'tracking' && (
        <>
          <section className="tracking-section">
            <div className="section-heading">
              <div className="section-title">
                <Radio size={16} className="section-radio" />
                <h2>Live bus tracker</h2>
                <span className="count-badge">{activeBuses.length} active</span>
              </div>
              <div className="refresh-caption">
                <button className="map-toggle" onClick={() => setShowMap(!showMap)}>
                  <MapPin size={14} />
                  {showMap ? 'Hide map' : 'Show map'}
                </button>
                <span className="live-dot" />
                Auto-updating every 3s
                <button
                  aria-label="Refresh buses"
                  title="Refresh buses"
                  className={`icon-button ${fleet.isFetching ? 'fetching' : ''}`}
                  onClick={() => fleet.refetch()}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            <div className={`tracking-workspace ${showMap ? '' : 'no-map'}`}>
              <div className="bus-list-panel">
                <div className="bus-list-head">
                  <strong>
                    Your campus buses<span>{buses.length}</span>
                  </strong>
                  <button
                    className={`icon-button ${filtersOpen ? 'selected-filter' : ''}`}
                    aria-label="Filter routes"
                    title="Filter routes"
                    onClick={() => setFiltersOpen(!filtersOpen)}
                  >
                    <SlidersHorizontal size={17} />
                  </button>
                </div>
                <label className="search-field">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search bus or route…"
                    aria-label="Search buses"
                  />
                  {search && (
                    <button aria-label="Clear search" onClick={() => setSearch('')}>
                      <X size={14} />
                    </button>
                  )}
                </label>
                {filtersOpen && (
                  <select
                    className="route-filter"
                    aria-label="Route filter"
                    value={routeFilter}
                    onChange={(event) => setRouteFilter(event.target.value)}
                  >
                    <option value="all">All campus routes</option>
                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.name}
                      </option>
                    ))}
                  </select>
                )}
                <div className="filter-tabs">
                  {[
                    ['all', 'All buses'],
                    ['active', 'Active'],
                    ['delayed', 'Delayed'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setFilter(value)}
                      className={filter === value ? 'selected' : ''}
                    >
                      {label}
                      {value === 'active' && <span>{activeBuses.length}</span>}
                    </button>
                  ))}
                </div>
                <div className="bus-cards">
                  {fleet.isPending ? (
                    [1, 2, 3].map((index) => (
                      <div className="bus-card-skeleton skeleton" key={index} />
                    ))
                  ) : filtered.length ? (
                    filtered.map((bus) => (
                      <BusCard
                        key={bus.id}
                        bus={bus}
                        selected={selected?.id === bus.id}
                        onClick={() => selectBus(bus.id)}
                      />
                    ))
                  ) : (
                    <div className="empty-state">
                      <Search size={26} />
                      <strong>No buses found</strong>
                      <span>Try another bus or route.</span>
                    </div>
                  )}
                </div>
                <div className="bus-list-foot">
                  <ShieldCheck size={14} />
                  {demo ? 'Demo fleet · Simulated locations' : 'Verified college transportation'}
                </div>
              </div>
              {showMap &&
                (selected ? (
                  <BusMap
                    buses={buses}
                    selected={selected}
                    stopId={effectiveStopId}
                    onSelect={selectBus}
                    onStop={setStopId}
                  />
                ) : (
                  <div className="map-placeholder skeleton" />
                ))}
            </div>
          </section>
          {selected && (
            <section className="trip-detail">
              <div className="trip-detail-top">
                <div className="section-title">
                  <span className="detail-icon">
                    <BusFront size={21} />
                  </span>
                  <div>
                    <h2>
                      Bus {selected.busNumber}{' '}
                      <span className="detail-route-name">{selected.route.name}</span>
                    </h2>
                    <p>
                      {selected.route.source}
                      <ArrowRight size={12} />
                      {selected.route.destination}
                    </p>
                  </div>
                </div>
                <div className="detail-tabs">
                  <button
                    onClick={() => setDetailTab('stops')}
                    className={detailTab === 'stops' ? 'selected' : ''}
                  >
                    Route & stops
                  </button>
                  <button
                    onClick={() => setDetailTab('details')}
                    className={detailTab === 'details' ? 'selected' : ''}
                  >
                    Bus details
                  </button>
                </div>
              </div>
              {detailTab === 'stops' ? (
                <div className="route-detail-body">
                  <div
                    className="horizontal-stops"
                    style={{
                      gridTemplateColumns: `repeat(${selected.route.stops.length}, minmax(0,1fr))`,
                    }}
                  >
                    {selected.route.stops.map((stop, index) => (
                      <button
                        key={stop.id}
                        onClick={() => setStopId(stop.id)}
                        className={`timeline-stop ${stop.id === effectiveStopId ? 'your-stop' : ''}`}
                      >
                        <span className="timeline-track">
                          <span className="timeline-dot">
                            {index === selected.route.stops.length - 1 ? (
                              <MapPin size={11} />
                            ) : index === 0 ? (
                              <Check size={10} />
                            ) : (
                              <i />
                            )}
                          </span>
                        </span>
                        <strong>{stop.stopName}</strong>
                        <small>
                          {stop.id === effectiveStopId
                            ? 'Your selected stop'
                            : index === 0
                              ? 'Starting point'
                              : index === selected.route.stops.length - 1
                                ? 'Destination'
                                : `Stop ${index + 1}`}
                        </small>
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setAlertDialog(true)}>
                    <Bell size={15} />
                    Notify me
                    <ChevronRight size={13} />
                  </Button>
                </div>
              ) : (
                <div className="bus-info-grid">
                  <div>
                    <small>DRIVER</small>
                    <strong>{selected.driverName}</strong>
                  </div>
                  <div>
                    <small>REGISTRATION</small>
                    <strong>{selected.vehicleNumber}</strong>
                  </div>
                  <div>
                    <small>CAPACITY</small>
                    <strong>
                      <Users size={16} />
                      {selected.capacity} seats
                    </strong>
                  </div>
                  <div>
                    <small>STUDENTS ON BOARD</small>
                    {selected.passengerCount === null ? (
                      <strong>Not active</strong>
                    ) : (
                      <>
                        <strong>
                          {selected.passengerCount} / {selected.capacity}
                          {selected.passengerCount >= selected.capacity && ' · Full'}
                        </strong>
                        <span className="occupancy-meter">
                          <i
                            style={{
                              width: `${Math.min(100, (selected.passengerCount / Math.max(1, selected.capacity)) * 100)}%`,
                            }}
                          />
                        </span>
                      </>
                    )}
                  </div>
                  <div>
                    <small>MESSAGE THE DRIVER</small>
                    <Button variant="outline" size="sm" onClick={() => setChatOpen(true)}>
                      <MessageCircle size={15} />
                      Chat with driver
                    </Button>
                  </div>
                  <div>
                    <small>LAST GPS UPDATE</small>
                    <strong>
                      {selected.location
                        ? new Date(selected.location.updatedAt).toLocaleTimeString('en-IN')
                        : 'Not active'}
                    </strong>
                  </div>
                </div>
              )}
            </section>
          )}
          {selected && <DriverChat bus={selected} open={chatOpen} onOpenChange={setChatOpen} />}
          <div className="commute-note">
            <span className="note-spark">
              <Sparkles size={17} />
            </span>
            <span>
              <strong>A smoother commute starts with a heads-up.</strong>
              <small>Get notified before your bus reaches your stop.</small>
            </span>
            <button onClick={() => setAlertDialog(true)}>
              Create an alert
              <ArrowRight size={15} />
            </button>
          </div>
        </>
      )}
      {view === 'routes' && (
        <div className="routes-grid">
          {routes.map((route) => (
            <article className="route-card" key={route.id}>
              <div className="route-card-heading">
                <span
                  className="route-color-icon"
                  style={{ backgroundColor: `${route.color}18`, color: route.color }}
                >
                  <Route size={23} />
                </span>
                <span className="count-badge">{route.stops.length} stops</span>
              </div>
              <h2>{route.name}</h2>
              <p>
                {route.source}
                <ArrowRight size={14} />
                {route.destination}
              </p>
              <div className="vertical-timeline">
                {route.stops.map((stop, index) => (
                  <div key={stop.id}>
                    <span className="vertical-dot" style={{ borderColor: route.color }} />
                    <div>
                      <strong>{stop.stopName}</strong>
                      <small>
                        {index === 0
                          ? 'Departure'
                          : index === route.stops.length - 1
                            ? 'Campus arrival'
                            : `Stop ${index + 1}`}
                      </small>
                    </div>
                    <button
                      title={`Arrival alert for ${stop.stopName}`}
                      aria-label={`Arrival alert for ${stop.stopName}`}
                      className={`icon-button ${subscriptions.includes(stop.id) ? 'subscribed-icon' : ''}`}
                      disabled={pendingAlert}
                      onClick={() => toggleSubscription(stop.id)}
                    >
                      {subscriptions.includes(stop.id) ? (
                        <BellRing size={17} />
                      ) : (
                        <Bell size={17} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
              <div className="route-card-footer">
                <span>
                  <BusFront size={16} />
                  {
                    buses.filter((bus) => bus.route.id === route.id && bus.status !== 'INACTIVE')
                      .length
                  }{' '}
                  active buses
                </span>
                <Link href={`/?bus=${buses.find((bus) => bus.route.id === route.id)?.id ?? ''}`}>
                  Track route
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      {view === 'history' && (
        <section className="data-section">
          <div className="section-heading">
            <h2>Recent journeys</h2>
            <div className="history-actions">
              <div className="segmented">
                {[
                  [1, 'Yesterday'],
                  [7, 'Last 7 days'],
                  [30, 'Last month'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setDays(Number(value))}
                    className={days === value ? 'selected' : ''}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                aria-label="Export history"
                onClick={exportHistory}
                disabled={!history.data?.trips.length}
              >
                <Download size={15} />
                Export
              </Button>
            </div>
          </div>
          {history.isPending ? (
            <div className="table-skeleton skeleton" />
          ) : history.error ? (
            <div className="error-banner">{history.error.message}</div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Bus</th>
                    <th>Route</th>
                    <th>Date</th>
                    <th>Departure</th>
                    <th>Arrival</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data?.trips.map((trip) => (
                    <tr key={trip.id}>
                      <td>
                        <span className="table-bus">
                          <BusFront size={17} />
                          Bus {trip.busNumber}
                        </span>
                      </td>
                      <td>{trip.routeName}</td>
                      <td>
                        {new Date(trip.startTime).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td>
                        {new Date(trip.startTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        {trip.endTime
                          ? new Date(trip.endTime).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td>
                        {trip.endTime
                          ? `${Math.round((Date.parse(trip.endTime) - Date.parse(trip.startTime)) / 60_000)} min`
                          : 'In progress'}
                      </td>
                      <td>
                        <span className="status-badge on_time">
                          {trip.status === 'ACTIVE' ? 'Running' : 'Completed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!history.data?.trips.length && (
                <div className="empty-state">
                  <Clock3 size={30} />
                  <strong>No trips in this period</strong>
                </div>
              )}
            </div>
          )}
          <div className="table-footer">
            {history.data?.trips.length ?? 0} journeys{demo && ' · Demonstration records'}
          </div>
        </section>
      )}
      {view === 'alerts' && (
        <div className="alerts-layout">
          <section className="data-section">
            <div className="section-heading">
              <h2>Your stop subscriptions</h2>
              <Button size="sm" onClick={() => setAlertDialog(true)} disabled={!selected}>
                <Bell size={15} />
                Add alert
              </Button>
            </div>
            {subscriptions.length ? (
              routes.flatMap((route) =>
                route.stops
                  .filter((stop) => subscriptions.includes(stop.id))
                  .map((stop) => (
                    <div className="subscription-row" key={stop.id}>
                      <span className="alert-icon">
                        <BellRing size={22} />
                      </span>
                      <div>
                        <strong>{stop.stopName}</strong>
                        <p>{route.name}</p>
                        <small>Alert when your bus is within 1 km</small>
                      </div>
                      <button
                        className="icon-button"
                        title="Remove alert"
                        aria-label={`Remove alert for ${stop.stopName}`}
                        disabled={pendingAlert}
                        onClick={() => toggleSubscription(stop.id)}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )),
              )
            ) : (
              <div className="empty-state">
                <Bell size={32} />
                <strong>No arrival alerts yet</strong>
                <span>Choose a stop to receive arrival updates.</span>
              </div>
            )}
            <p className="demo-alert-note">
              <Info size={14} />
              Subscriptions stay in this browser. Keep the app open for alerts.
            </p>
          </section>
          <section className="data-section">
            <div className="section-heading">
              <h2>Notifications</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setDemoAlerts((items) => items.map((item) => ({ ...item, read: true })))
                }
                disabled={!notifications.length}
              >
                <Check size={15} />
                Mark all read
              </Button>
            </div>
            {notifications.length ? (
              notifications.map((notification) => (
                <div
                  className={`notification-row ${notification.read ? '' : 'unread'}`}
                  key={notification.id}
                >
                  <span className="alert-icon">
                    <BusFront size={20} />
                  </span>
                  <div>
                    <strong>Bus approaching your stop</strong>
                    <p>{notification.message}</p>
                    <small>
                      {new Date(notification.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Check size={32} />
                <strong>You’re all caught up</strong>
                <span>Arrival updates will appear here.</span>
              </div>
            )}
          </section>
        </div>
      )}
      <Dialog open={alertDialog} onOpenChange={setAlertDialog}>
        <DialogContent
          title="A heads-up for your next ride"
          description="Get an arrival alert when your bus is within 1 km of your stop."
        >
          <div className="alert-form">
            <label>
              Bus
              <select
                value={selected?.id ?? ''}
                onChange={(event) => selectBus(event.target.value)}
              >
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    Bus {bus.busNumber} · {bus.route.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Your stop
              <select value={effectiveStopId} onChange={(event) => setStopId(event.target.value)}>
                {selected?.route.stops.map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    {stop.stopName}
                  </option>
                ))}
              </select>
            </label>
            <div className="alert-preview">
              <BellRing size={22} />
              <span>
                <strong>{selectedStop?.stopName ?? 'Select a stop'}</strong>
                <small>{demo ? 'Browser alert · Demo mode' : 'Browser arrival alert'}</small>
              </span>
              <span className="count-badge">1 km</span>
            </div>
            <Button
              disabled={pendingAlert || !effectiveStopId}
              onClick={() => toggleSubscription(effectiveStopId)}
            >
              {pendingAlert ? (
                <RefreshCw size={16} className="spin" />
              ) : subscriptions.includes(effectiveStopId) ? (
                <X size={16} />
              ) : (
                <Bell size={16} />
              )}
              {subscriptions.includes(effectiveStopId)
                ? 'Remove arrival alert'
                : 'Enable arrival alert'}
            </Button>
            <p className="form-note">ETAs are estimates and may change with traffic.</p>
          </div>
        </DialogContent>
      </Dialog>
      {toast && (
        <div role="status" className="toast">
          <Info size={17} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </Shell>
  );
}
export function Stat({
  label,
  value,
  suffix,
  icon,
  note,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: React.ReactNode;
  note: React.ReactNode;
  accent: string;
}) {
  return (
    <article className={`stat-card ${accent}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">
        {value}
        <small>{suffix}</small>
      </div>
      <div className="stat-note">{note}</div>
    </article>
  );
}
function BusCard({
  bus,
  selected,
  onClick,
}: {
  bus: BusInfo;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`bus-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="bus-card-top">
        <span
          className="bus-number-icon"
          style={{ color: bus.route.color, backgroundColor: `${bus.route.color}14` }}
        >
          <BusFront size={21} />
        </span>
        <span className="bus-number">
          Bus {bus.busNumber}
          <small>{bus.vehicleNumber}</small>
        </span>
        <span className={`status-badge ${bus.status.toLowerCase()}`}>{statusText[bus.status]}</span>
      </div>
      <strong className="bus-route">{bus.route.name}</strong>
      <div className="bus-card-bottom">
        <span>
          <MapPin size={12} />
          {bus.route.stops.length} stops<span className="small-separator">·</span>
          {bus.location?.speed ?? 0} km/h
        </span>
        <span className={bus.eta === null ? 'inactive-eta' : 'bus-eta'}>
          <Clock3 size={13} />
          {bus.eta === null ? 'No ETA' : bus.eta === 0 ? 'Arriving' : `${bus.eta} min`}
        </span>
      </div>
      {selected && (
        <span className="bus-card-selected">
          <LocateFixed size={12} />
          Currently tracking
          <ArrowRight size={13} />
        </span>
      )}
    </button>
  );
}
