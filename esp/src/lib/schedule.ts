export type ScheduleRow = {
  time: string; // 24-hour HH:mm, IST
  from: string;
  to: string;
  buses: string[];
};

export type ScheduleBreak = { time: string; breakName: string };
export type ScheduleEntry = ScheduleRow | ScheduleBreak;

const C = 'Campus';
const T = 'Transit Hostel';
const S = 'Shivaji PG';
const M = 'Campus Mess';

const row = (time: string, from: string, to: string, ...buses: number[]): ScheduleRow => ({
  time,
  from,
  to,
  buses: buses.map((n) => `Bus ${n}`),
});

export const busSchedule: ScheduleEntry[] = [
  row('07:30', C, T, 1, 2, 3),
  row('07:45', T, M, 1),
  row('08:00', T, M, 2, 3),
  row('08:00', C, S, 1),
  row('08:15', S, M, 1),
  row('08:30', C, S, 2),
  row('08:45', S, M, 2),
  row('09:15', C, S, 3),
  row('09:30', S, C, 3),
  row('09:30', C, T, 1, 2),
  row('10:00', T, C, 1, 2),
  row('11:00', C, T, 2, 3),
  row('11:30', T, C, 2, 3),
  row('12:30', C, T, 1, 3),
  row('13:00', T, C, 1, 3),
  { time: '13:30', breakName: 'Lunch break' },
  row('14:30', C, T, 1, 2, 3),
  row('15:00', T, C, 1, 2, 3),
  row('15:30', C, T, 2),
  row('16:00', T, C, 2),
  row('16:15', C, T, 1),
  row('17:00', T, C, 1),
  row('17:45', C, T, 2),
  row('17:45', C, T, 3),
  row('18:00', T, C, 2, 3),
  row('19:00', C, T, 1, 2, 3),
  row('19:30', T, C, 1, 2, 3),
  row('20:00', C, T, 1),
  row('20:30', T, C, 1),
  row('21:00', C, T, 2, 3),
  row('21:30', C, T, 1),
  row('22:00', T, C, 1, 2, 3),
  { time: '22:30', breakName: 'Dinner break' },
  row('23:00', C, T, 2, 3),
  row('23:30', T, C, 2, 3),
];

export const isBreak = (entry: ScheduleEntry): entry is ScheduleBreak => 'breakName' in entry;

export function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
