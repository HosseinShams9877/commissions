import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Persian digit conversion
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  return input.toString().replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d)]);
}

// Format number with Persian digits and thousand separators
export function formatNumber(num: number): string {
  const formatted = new Intl.NumberFormat('en-US').format(num);
  return toPersianDigits(formatted);
}

// Format as currency with Persian digits
export function formatCurrency(num: number): string {
  const formatted = new Intl.NumberFormat('en-US').format(num);
  return toPersianDigits(formatted) + ' ریال';
}

// Format percentage with Persian digits
export function formatPercent(num: number): string {
  return toPersianDigits(num.toString()) + '٪';
}

// Jalaali (Shamsi) Calendar utilities
// Using the jalaali-js algorithm inline for SSR compatibility
const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function div(a: number, b: number) { return ~~(a / b); }
function mod(a: number, b: number) { return a - ~~(a / b) * b; }

function jalCal(jy: number) {
  const bl = breaks.length;
  let gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jm: number, jump: number, leap: number, leapG: number, march: number, n: number;

  for (let i = 1; i < bl; i++) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump!, 33) === 4 && jump! - n === 4) leapJ += 1;
  leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  march = 20 + leapJ - leapG;

  if (jump! - n < 6) n = n - jump! + div(jump! + 4, 33) * 33;
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
    + div(153 * mod(gm + 9, 12) + 2, 5)
    + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function d2j(jdn: number) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm: number, jd: number;

  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    } else {
      k -= 186;
    }
  } else {
    jy -= 1;
    k += 179 + (r.leap === 1 ? 1 : 0);
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

/**
 * Convert Gregorian date to Jalaali (Shamsi)
 */
export function toJalaali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  return d2j(g2d(gy, gm, gd));
}

/**
 * Convert Jalaali (Shamsi) date to Gregorian
 */
export function toGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  return d2g(j2d(jy, jm, jd));
}

/**
 * Get current Shamsi date
 */
export function getCurrentShamsiDate(): { year: number; month: number; day: number } {
  const now = new Date();
  const { jy, jm, jd } = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return { year: jy, month: jm, day: jd };
}

/**
 * Check if a Jalaali year is a leap year
 */
export function isLeapJalaaliYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

/**
 * Get the number of days in a Jalaali month
 */
export function jalaaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaaliYear(jy) ? 30 : 29;
}

/**
 * Validate a Jalaali date
 */
export function isValidJalaaliDate(jy: number, jm: number, jd: number): boolean {
  return jy >= 1 && jy <= 3177 &&
    jm >= 1 && jm <= 12 &&
    jd >= 1 && jd <= jalaaliMonthLength(jy, jm);
}

export const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

export const PERSIAN_WEEKDAYS = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'
];

/**
 * Format a Shamsi date in Persian
 */
export function formatShamsiDate(year: number, month: number, day?: number): string {
  const monthName = PERSIAN_MONTHS[month - 1] || '';
  if (day) {
    return `${toPersianDigits(day)} ${monthName} ${toPersianDigits(year)}`;
  }
  return `${monthName} ${toPersianDigits(year)}`;
}
