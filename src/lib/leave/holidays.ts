/**
 * Kenyan Statutory Public Holidays (Public Holidays Act, Cap 110)
 * Includes fixed national days, Sunday rollover observance, and movable holidays.
 */

// Compute Easter Sunday using the Anonymous Gregorian algorithm (Meeus/Jones/Butcher)
function getEasterSunday(year: number): { month: number; day: number } {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1); // 1-based safe offset
  d.setUTCDate(d.getUTCDate() - 1 + days);
  return d.toISOString().slice(0, 10);
}

// Approximate Eid dates for 2024-2028 (subject to lunar sighting)
const ISLAMIC_HOLIDAYS: Record<string, string> = {
  // 2025
  "2025-03-31": "Eid al-Fitr",
  "2025-06-06": "Eid al-Adha",
  // 2026
  "2026-03-20": "Eid al-Fitr",
  "2026-05-27": "Eid al-Adha",
  // 2027
  "2027-03-10": "Eid al-Fitr",
  "2027-05-17": "Eid al-Adha",
};

/**
 * Returns a map of YYYY-MM-DD -> Holiday Name for the specified year.
 */
export function getKenyanHolidays(year: number): Map<string, string> {
  const holidays = new Map<string, string>();

  // Fixed National Holidays
  const fixed: [number, number, string][] = [
    [1, 1, "New Year's Day"],
    [5, 1, "Labour Day"],
    [6, 1, "Madaraka Day"],
    [10, 10, "Mazingira / Utamaduni Day"],
    [10, 20, "Mashujaa Day"],
    [12, 12, "Jamhuri Day"],
    [12, 25, "Christmas Day"],
    [12, 26, "Boxing / Utumishi Day"],
  ];

  for (const [m, d, name] of fixed) {
    const dStr = formatDate(year, m, d);
    holidays.set(dStr, name);

    // Kenyan Law: If a holiday falls on Sunday, following Monday is a public holiday
    const dateObj = new Date(`${dStr}T00:00:00Z`);
    if (dateObj.getUTCDay() === 0) {
      const nextMon = addDays(dStr, 1);
      holidays.set(nextMon, `${name} (Observed)`);
    }
  }

  // Movable Christian Holidays (Good Friday & Easter Monday)
  const easter = getEasterSunday(year);
  const easterDateStr = formatDate(year, easter.month, easter.day);
  const goodFriday = addDays(easterDateStr, -2);
  const easterMonday = addDays(easterDateStr, 1);

  holidays.set(goodFriday, "Good Friday");
  holidays.set(easterMonday, "Easter Monday");

  // Movable Islamic Holidays
  for (const [dStr, name] of Object.entries(ISLAMIC_HOLIDAYS)) {
    if (dStr.startsWith(String(year))) {
      holidays.set(dStr, name);
    }
  }

  return holidays;
}

export type WorkingDaysBreakdown = {
  workingDays: number;
  calendarDays: number;
  weekendDays: number;
  holidays: { date: string; name: string }[];
};

/**
 * Detailed calculation of working days excluding weekends (Sat/Sun) and public holidays.
 */
export function calculateWorkingDaysDetailed(
  startDateStr: string,
  endDateStr: string
): WorkingDaysBreakdown {
  if (!startDateStr || !endDateStr) {
    return { workingDays: 0, calendarDays: 0, weekendDays: 0, holidays: [] };
  }

  const start = new Date(`${startDateStr}T00:00:00Z`);
  const end = new Date(`${endDateStr}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return { workingDays: 0, calendarDays: 0, weekendDays: 0, holidays: [] };
  }

  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  // Load holidays for involved years
  const allHolidays = new Map<string, string>();
  for (let y = startYear; y <= endYear; y++) {
    const yrHolidays = getKenyanHolidays(y);
    yrHolidays.forEach((name, date) => allHolidays.set(date, name));
  }

  let workingDays = 0;
  let calendarDays = 0;
  let weekendDays = 0;
  const holidays: { date: string; name: string }[] = [];

  const cursor = new Date(start);
  while (cursor <= end) {
    calendarDays += 1;
    const dayOfWeek = cursor.getUTCDay();
    const dateStr = cursor.toISOString().slice(0, 10);
    const holidayName = allHolidays.get(dateStr);

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDays += 1;
    } else if (holidayName) {
      holidays.push({ date: dateStr, name: holidayName });
    } else {
      workingDays += 1;
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    workingDays,
    calendarDays,
    weekendDays,
    holidays,
  };
}
