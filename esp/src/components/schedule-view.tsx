'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, CalendarClock, Clock3, Coffee } from 'lucide-react';
import { Shell } from './shell';
import { busSchedule, formatTime, isBreak, toMinutes } from '@/lib/schedule';

const places = ['All', 'Transit Hostel', 'Shivaji PG', 'Campus Mess'];
const buses = ['All', 'Bus 1', 'Bus 2', 'Bus 3'];

function istMinutes() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
  return toMinutes(parts);
}

export function ScheduleView() {
  const [place, setPlace] = useState('All');
  const [bus, setBus] = useState('All');
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(istMinutes());
    const timer = setInterval(() => setNow(istMinutes()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const entries = busSchedule.filter(
    (entry) =>
      isBreak(entry) ||
      ((place === 'All' || entry.from === place || entry.to === place) &&
        (bus === 'All' || entry.buses.includes(bus))),
  );
  const nextIndex =
    now === null
      ? -1
      : entries.findIndex((entry) => !isBreak(entry) && toMinutes(entry.time) >= now);

  return (
    <Shell title="Bus schedule">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            YOUR DAILY COMMUTE, SIMPLIFIED
          </div>
          <h1>Bus schedule</h1>
          <p>Every departure between campus, Transit Hostel and Shivaji PG.</p>
        </div>
        <div className="heading-actions">
          <span className="today">
            <Clock3 size={15} />
            Institute timetable
          </span>
        </div>
      </div>
      <section className="schedule-card">
        <div className="schedule-filters">
          <div className="chip-group" role="group" aria-label="Filter by place">
            {places.map((item) => (
              <button
                key={item}
                className={place === item ? 'selected' : ''}
                aria-pressed={place === item}
                onClick={() => setPlace(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="chip-group" role="group" aria-label="Filter by bus">
            {buses.map((item) => (
              <button
                key={item}
                className={bus === item ? 'selected' : ''}
                aria-pressed={bus === item}
                onClick={() => setBus(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="schedule-table" role="table" aria-label="Institute bus schedule">
          <div className="schedule-head" role="row">
            <span role="columnheader">Time</span>
            <span role="columnheader">Route</span>
            <span role="columnheader">Bus</span>
          </div>
          {entries.map((entry, index) =>
            isBreak(entry) ? (
              <div className="schedule-break" role="row" key={entry.breakName}>
                <Coffee size={15} />
                {entry.breakName}
              </div>
            ) : (
              <div
                role="row"
                key={`${entry.time}-${entry.from}-${entry.to}-${entry.buses.join()}`}
                className={`schedule-row ${entry.from === 'Campus' ? 'outbound' : 'inbound'} ${
                  index === nextIndex ? 'next' : ''
                } ${now !== null && toMinutes(entry.time) < now ? 'past' : ''}`}
              >
                <span role="cell" className="schedule-time">
                  {formatTime(entry.time)}
                  {index === nextIndex && <em>Next</em>}
                </span>
                <span role="cell" className="schedule-route">
                  {entry.from}
                  <ArrowRight size={14} />
                  {entry.to}
                </span>
                <span role="cell" className="schedule-buses">
                  {entry.buses.map((name) => (
                    <b key={name}>{name}</b>
                  ))}
                </span>
              </div>
            ),
          )}
          {!entries.some((entry) => !isBreak(entry)) && (
            <div className="schedule-empty">
              <CalendarClock size={20} />
              No departures match these filters.
            </div>
          )}
        </div>
      </section>
    </Shell>
  );
}
