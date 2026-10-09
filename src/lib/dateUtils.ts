/**
 * Central Date & Timezone Utility for Bilal Hospital Management System (Bilal HMS)
 * Business Timezone: Pakistan Standard Time (PKT, UTC+05:00 / Asia/Karachi)
 */

export interface PKTDateRange {
  startOfPKTDay: Date;
  startOfTomorrowPKTDay: Date;
  dateStringPKT: string; // YYYY-MM-DD in PKT
}

export interface PKTMonthRange {
  startOfPKTMonth: Date;
  startOfNextPKTMonth: Date;
  monthStringPKT: string; // YYYY-MM in PKT
}

/**
 * Returns current date string in PKT timezone (YYYY-MM-DD)
 */
export function getTodayPKTString(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Converts any date or string into PKT YYYY-MM-DD date string
 */
export function toPKTDateString(targetDate?: Date | string | null): string {
  if (!targetDate) return getTodayPKTString();
  const d = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  if (isNaN(d.getTime())) return getTodayPKTString();

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

/**
 * Calculates half-open interval boundaries for a given date in PKT:
 * startOfPKTDay <= timestamp < startOfTomorrowPKTDay
 */
export function getPKTDateRange(targetDate?: Date | string | null): PKTDateRange {
  const dateStringPKT = toPKTDateString(targetDate);
  const startOfPKTDay = new Date(`${dateStringPKT}T00:00:00.000+05:00`);
  const startOfTomorrowPKTDay = new Date(startOfPKTDay.getTime() + 24 * 60 * 60 * 1000);

  return {
    startOfPKTDay,
    startOfTomorrowPKTDay,
    dateStringPKT,
  };
}

/**
 * Calculates start of PKT calendar month and start of next PKT calendar month
 * for monthly dashboard statistics (e.g., Oct 1 00:00:00 PKT to Nov 1 00:00:00 PKT).
 */
export function getPKTMonthRange(targetDate?: Date | string | null): PKTMonthRange {
  const dateStr = toPKTDateString(targetDate);
  const [yearStr, monthStr] = dateStr.split("-");
  const monthStringPKT = `${yearStr}-${monthStr}`;

  const startOfPKTMonth = new Date(`${monthStringPKT}-01T00:00:00.000+05:00`);

  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const nextMonthNum = monthNum === 12 ? 1 : monthNum + 1;
  const nextYearNum = monthNum === 12 ? yearNum + 1 : yearNum;
  const nextMonthStr = String(nextMonthNum).padStart(2, "0");

  const startOfNextPKTMonth = new Date(`${nextYearNum}-${nextMonthStr}-01T00:00:00.000+05:00`);

  return {
    startOfPKTMonth,
    startOfNextPKTMonth,
    monthStringPKT,
  };
}

/**
 * Formats a timestamp/date into a human-readable PKT string: "09 Oct 2026 (Friday)"
 */
export function formatPKTDateAndDay(targetDate?: Date | string | null): string {
  if (!targetDate) return "Today";
  const d = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  if (isNaN(d.getTime())) return String(targetDate);

  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "long",
  }).format(d);

  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);

  return `${formattedDate} (${dayName})`;
}

/**
 * Checks if two dates fall on the same calendar day in PKT
 */
export function isSamePKTDay(dateA?: Date | string | null, dateB?: Date | string | null): boolean {
  return toPKTDateString(dateA) === toPKTDateString(dateB);
}
