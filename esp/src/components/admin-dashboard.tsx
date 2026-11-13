'use client';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  Activity,
  BusFront,
  Check,
  Clock3,
  History,
  Info,
  LayoutDashboard,
  MapPin,
  Pencil,
  Plus,
  Route,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Shell } from './shell';
import { Stat } from './dashboard';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { AdminData, AdminEntity, AdminRow, Analytics, adminConfig } from '@/lib/admin-config';
import { FleetResponse, HistoryItem } from '@/lib/types';
import { fetchJson } from '@/lib/utils';
import { deleteRecord, saveRecord } from '@/app/admin/actions';
const sections = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'buses', label: 'Buses', icon: BusFront },
  { id: 'routes', label: 'Routes', icon: Route },
  { id: 'stops', label: 'Stops', icon: MapPin },
  { id: 'drivers', label: 'Drivers', icon: Users },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'history', label: 'Trip history', icon: History },
];
const columnLabels: Record<string, string> = {
  id: 'ID',
  busNumber: 'Bus number',
  vehicleNumber: 'Registration',
  routeName: 'Route',
  stopCount: 'Stops',
  stopName: 'Stop',
  sequenceNumber: 'Sequence',
  licenseNumber: 'License number',
  createdAt: 'Joined',
  userId: 'User',
};
export function AdminDashboard({ view }: { view: AdminEntity | 'overview' | 'history' }) {
  const client = useQueryClient();
  const isEntity = view !== 'overview' && view !== 'history';
  const entity: AdminEntity = isEntity ? view : 'buses';
  const config = adminConfig[entity];
  const fleet = useQuery({
    queryKey: ['fleet'],
    queryFn: () => fetchJson<FleetResponse>('/api/buses'),
    refetchInterval: 3000,
  });
  const records = useQuery({
    queryKey: ['admin', entity],
    queryFn: () => fetchJson<AdminData>(`/api/admin?entity=${entity}`),
    enabled: isEntity,
  });
  const analytics = useQuery({
    queryKey: ['analytics'],
    queryFn: () => fetchJson<Analytics>('/api/admin?entity=analytics'),
    enabled: view === 'overview',
  });
  const history = useQuery({
    queryKey: ['history', 30],
    queryFn: () => fetchJson<{ trips: HistoryItem[] }>('/api/history?days=30'),
    enabled: view === 'history',
  });
  const [previewRows, setPreviewRows] = useState<AdminRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminRow | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<AdminRow | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  useEffect(() => {
    setPreviewRows(null);
    setSearch('');
  }, [view]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);
  const demo = fleet.data?.demo ?? records.data?.demo ?? false;
  const buses = fleet.data?.buses ?? [];
  const active = buses.filter((bus) => bus.status !== 'INACTIVE');
  const rows = (previewRows ?? records.data?.rows ?? []).filter((row) =>
    Object.values(row).some((value) => String(value).toLowerCase().includes(search.toLowerCase())),
  );
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const input = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (demo) {
        const row: AdminRow = {
          ...editing,
          ...(input as Record<string, string>),
          id: String(editing?.id ?? input.id ?? `PREVIEW-${crypto.randomUUID().slice(0, 8)}`),
        };
        row.routeName = String(
          records.data?.routes.find((route) => route.id === row.routeId)?.name ??
            row.routeName ??
            '',
        );
        row.name =
          entity === 'drivers'
            ? String(records.data?.users.find((user) => user.id === row.userId)?.name ?? 'Driver')
            : (row.name ?? '');
        row.busNumber =
          entity === 'drivers'
            ? String(
                records.data?.buses.find((bus) => bus.id === row.busId)?.busNumber ?? 'Unassigned',
              )
            : (row.busNumber ?? '');
        if (entity === 'users') {
          delete row.password;
          row.createdAt = new Date().toISOString().slice(0, 10);
        }
        if (entity === 'routes') row.stopCount = editing?.stopCount ?? 0;
        setPreviewRows((current) =>
          editing
            ? (current ?? records.data?.rows ?? []).map((item) =>
                item.id === editing.id ? row : item,
              )
            : [...(current ?? records.data?.rows ?? []), row],
        );
        setToast('Demo preview saved. No database record was changed.');
      } else {
        const result = await saveRecord(entity, editing ? String(editing.id) : null, input);
        if (!result.success) throw new Error(result.error);
        await client.invalidateQueries({ queryKey: ['admin'] });
        await client.invalidateQueries({ queryKey: ['fleet'] });
        setToast('Record saved successfully.');
      }
      setEditing(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save record.');
    } finally {
      setPending(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setPending(true);
    setError('');
    try {
      if (demo) {
        setPreviewRows((current) =>
          (current ?? records.data?.rows ?? []).filter((row) => row.id !== deleting.id),
        );
        setToast('Record removed from this demo preview.');
      } else {
        const result = await deleteRecord(entity, String(deleting.id));
        if (!result.success) throw new Error(result.error);
        await client.invalidateQueries({ queryKey: ['admin'] });
        await client.invalidateQueries({ queryKey: ['fleet'] });
        setToast('Record deleted.');
      }
      setDeleting(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete record.');
    } finally {
      setPending(false);
    }
  }
  return (
    <Shell title="Admin console" demo={demo}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CAMPUS TRANSPORT OPERATIONS</div>
          <h1>
            {view === 'overview'
              ? 'The whole fleet. One view.'
              : view === 'history'
                ? 'Trip history'
                : config.title}
          </h1>
          <p>
            {view === 'overview'
              ? 'Keep your campus moving, safely and on schedule.'
              : view === 'history'
                ? 'A reliable record of your campus transportation.'
                : `Manage your college ${entity} and assignments.`}
          </p>
        </div>
        {isEntity && (
          <Button
            onClick={() => {
              setEditing(null);
              setError('');
            }}
          >
            <Plus size={16} />
            Add {config.singular}
          </Button>
        )}
      </div>
      <nav className="admin-tabs">
        {sections.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={id === 'overview' ? '/admin' : `/admin/${id}`}
            className={view === id ? 'active' : ''}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>
      {demo && (
        <div className="demo-banner">
          <Info size={16} />
          Demo workspace. GPS and analytics are simulated; edits are temporary previews.
        </div>
      )}
      {(fleet.error || records.error || analytics.error) && (
        <div className="error-banner">
          <Info size={18} />
          {fleet.error?.message ?? records.error?.message ?? analytics.error?.message}
        </div>
      )}
      {view === 'overview' && (
        <>
          <section className="stats-grid">
            <Stat
              label="Active buses / drivers"
              value={String(active.length).padStart(2, '0')}
              icon={<BusFront size={21} />}
              accent="green"
              note={
                <>
                  <span className="live-dot" />
                  {active.length} running trips · {buses.length} total buses
                </>
              }
            />
            <Stat
              label="Historical trips"
              value={String(analytics.data?.completed ?? 0)}
              icon={<Check size={21} />}
              accent="blue"
              note={<>Completed journeys · Last 30 days</>}
            />
            <Stat
              label="Average trip time"
              value={String(analytics.data?.average ?? 0)}
              suffix="min"
              icon={<Clock3 size={21} />}
              accent="amber"
              note={<>Across completed campus trips</>}
            />
          </section>
          <div className="admin-overview-grid">
            <section className="analytics-section">
              <h2>Daily active buses</h2>
              <div className="bar-chart">
                {analytics.data?.daily.map((day, index) => (
                  <div className="chart-column" key={index}>
                    <span>{day.count}</span>
                    <i
                      style={{
                        height: `${Math.max(3, (day.count / Math.max(1, ...analytics.data!.daily.map((day) => day.count))) * 125)}px`,
                      }}
                    />
                    <small>{day.day}</small>
                  </div>
                ))}
              </div>
              <p className="analytics-meta">Distinct buses with completed trips · Last 7 days</p>
            </section>
            <section className="analytics-section">
              <h2>Route popularity</h2>
              {analytics.data?.routes.map((route) => (
                <div className="popularity-row" key={route.name}>
                  <span>{route.name}</span>
                  <div className="popularity-track">
                    <i
                      style={{
                        width: `${(route.count / Math.max(1, analytics.data!.completed)) * 100}%`,
                      }}
                    />
                  </div>
                  <strong>{route.count}</strong>
                </div>
              ))}
              <p className="analytics-meta">Completed journeys by route · Last 30 days</p>
            </section>
          </div>
          <section className="data-section">
            <div className="section-heading">
              <h2>Running trips</h2>
              <span className="count-badge">{active.length} active</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Bus</th>
                    <th>Route</th>
                    <th>Driver</th>
                    <th>Speed</th>
                    <th>Status</th>
                    <th>Live map</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((bus) => (
                    <tr key={bus.id}>
                      <td className="table-bus">
                        <BusFront size={16} />
                        Bus {bus.busNumber}
                      </td>
                      <td>{bus.route.name}</td>
                      <td>{bus.driverName}</td>
                      <td>{bus.location?.speed ?? 0} km/h</td>
                      <td>
                        <span className={`status-badge ${bus.status.toLowerCase()}`}>
                          {bus.status === 'STALE'
                            ? 'Signal lost'
                            : bus.status === 'DELAYED'
                              ? 'Delayed'
                              : 'Active'}
                        </span>
                      </td>
                      <td>
                        <Link href={`/?bus=${bus.id}`} className="button button-ghost button-sm">
                          <Activity size={15} />
                          Monitor
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!active.length && <div className="empty-state">No running trips</div>}
            </div>
          </section>
          <section className="data-section" style={{ marginTop: 22 }}>
            <div className="section-heading">
              <h2>Driver performance</h2>
              <span className="muted" style={{ fontSize: 10 }}>
                Last 30 days
              </span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Completed trips</th>
                    <th>Average trip time</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.data?.drivers.map((driver) => (
                    <tr key={driver.name}>
                      <td>{driver.name}</td>
                      <td>{driver.trips}</td>
                      <td>{driver.average} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {isEntity && (
        <section className="data-section">
          <div className="section-heading">
            <h2>
              {rows.length} {entity}
            </h2>
            <label className="search-field admin-search">
              <Search size={15} />
              <input
                aria-label={`Search ${entity}`}
                placeholder={`Search ${entity}…`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
          {records.isPending ? (
            <div className="table-skeleton skeleton" />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {config.columns.map((column) => (
                      <th key={column}>
                        {columnLabels[column] ?? column.charAt(0).toUpperCase() + column.slice(1)}
                      </th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      {config.columns.map((column) => (
                        <td key={column}>{String(row[column] ?? '—')}</td>
                      ))}
                      <td>
                        <div className="table-actions">
                          <button
                            title="Edit record"
                            aria-label={`Edit ${row.name || row.stopName || row.id}`}
                            className="icon-button"
                            onClick={() => {
                              setEditing(row);
                              setError('');
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            title="Delete record"
                            aria-label={`Delete ${row.name || row.stopName || row.id}`}
                            className="icon-button"
                            onClick={() => {
                              setDeleting(row);
                              setError('');
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <div className="empty-state">
                  <Search size={28} />
                  <strong>No records found</strong>
                </div>
              )}
            </div>
          )}
        </section>
      )}
      {view === 'history' && (
        <section className="data-section">
          <div className="section-heading">
            <h2>Last 30 days</h2>
            <span className="count-badge">{history.data?.trips.length ?? 0} trips</span>
          </div>
          {history.error ? (
            <div className="error-banner">{history.error.message}</div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Bus</th>
                    <th>Driver</th>
                    <th>Route</th>
                    <th>Started</th>
                    <th>Ended</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data?.trips.map((trip) => (
                    <tr key={trip.id}>
                      <td>Bus {trip.busNumber}</td>
                      <td>{trip.driverName}</td>
                      <td>{trip.routeName}</td>
                      <td>{new Date(trip.startTime).toLocaleString('en-IN')}</td>
                      <td>
                        {trip.endTime ? new Date(trip.endTime).toLocaleString('en-IN') : 'Running'}
                      </td>
                      <td>
                        <span className="status-badge on_time">{trip.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open && !pending) setEditing(undefined);
        }}
      >
        <DialogContent
          title={`${editing ? 'Edit' : 'Add'} ${config.singular}`}
          description={
            demo
              ? 'Temporary demo preview. Changes are not persisted.'
              : 'Update your college transportation records.'
          }
        >
          <form className="admin-form" key={`${entity}-${editing?.id ?? 'new'}`} onSubmit={submit}>
            {config.fields.map((field) => (
              <label key={field.key}>
                {field.label}
                {field.options ? (
                  <select
                    name={field.key}
                    defaultValue={String(
                      editing?.[field.key] ?? (field.options === 'roles' ? 'STUDENT' : ''),
                    )}
                    required={field.required}
                  >
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {field.options === 'roles'
                      ? ['STUDENT', 'DRIVER', 'ADMIN'].map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))
                      : (
                          (field.options === 'users'
                            ? records.data?.users.filter((user) => user.role === 'DRIVER')
                            : records.data?.[field.options]) ?? []
                        ).map((option) => (
                          <option key={option.id} value={option.id}>
                            {String(option.name ?? option.busNumber ?? option.id)}
                          </option>
                        ))}
                  </select>
                ) : (
                  <input
                    name={field.key}
                    type={field.type ?? 'text'}
                    defaultValue={
                      field.key === 'password'
                        ? ''
                        : String(editing?.[field.key] ?? (field.type === 'color' ? '#5e1ef4' : ''))
                    }
                    required={field.required || (field.key === 'password' && !editing)}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    minLength={field.type === 'password' ? 8 : undefined}
                    maxLength={field.type === 'password' ? 128 : 150}
                    readOnly={!!editing && field.key === 'id'}
                  />
                )}
              </label>
            ))}
            {error && (
              <p role="alert" className="form-error wide">
                {error}
              </p>
            )}
            <Button disabled={pending}>
              <Save size={16} />
              {pending ? 'Saving…' : 'Save record'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !pending) setDeleting(null);
        }}
      >
        <DialogContent
          title={`Delete ${config.singular}?`}
          description="This action cannot be undone. Linked trip history is protected."
        >
          {error && (
            <p role="alert" className="form-error" style={{ marginTop: 20 }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 25 }}>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              <Trash2 size={15} />
              {pending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {toast && (
        <div role="status" className="toast">
          <Check size={16} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </Shell>
  );
}
