import { rifaConfig } from "@/config/rifa";

const COLOMBIA_TZ = "America/Bogota";

function easterDate(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function nextMonday(date: Date) {
  const day = date.getUTCDay();
  const diff = day === 1 ? 0 : (8 - day) % 7;
  return addDays(date, diff);
}

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function colombiaHolidayDates(year: number) {
  const fixed = [
    `${year}-01-01`,
    `${year}-05-01`,
    `${year}-07-20`,
    `${year}-08-07`,
    `${year}-12-08`,
    `${year}-12-25`,
  ];

  const moved = [
    new Date(Date.UTC(year, 0, 6)),
    new Date(Date.UTC(year, 2, 19)),
    new Date(Date.UTC(year, 5, 29)),
    new Date(Date.UTC(year, 7, 15)),
    new Date(Date.UTC(year, 9, 12)),
    new Date(Date.UTC(year, 10, 1)),
    new Date(Date.UTC(year, 10, 11)),
  ].map((date) => ymd(nextMonday(date)));

  const easter = easterDate(year);
  const easterBased = [-3, -2, 43, 64, 71].map((offset) => ymd(offset > 0 ? nextMonday(addDays(easter, offset)) : addDays(easter, offset)));

  return new Set([...fixed, ...moved, ...easterBased]);
}

export function getNextDrawDate(from = new Date()) {
  const cursor = new Date(from);
  cursor.setUTCHours(rifaConfig.drawHour + 5, rifaConfig.drawMinute, 0, 0);

  for (let i = 0; i < 60; i += 1) {
    const candidate = new Date(cursor);
    candidate.setUTCDate(cursor.getUTCDate() + i);
    candidate.setUTCHours(rifaConfig.drawHour + 5, rifaConfig.drawMinute, 0, 0);
    const localDay = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: COLOMBIA_TZ }).format(candidate);
    const isThursday = localDay === "Thu";
    const isFuture = candidate.getTime() > from.getTime();
    const holiday = colombiaHolidayDates(candidate.getUTCFullYear()).has(ymd(candidate));

    if (isThursday && isFuture && !holiday) return candidate.toISOString();
  }

  return cursor.toISOString();
}
