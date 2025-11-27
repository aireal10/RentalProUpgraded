
export const createPageUrl = (pageName: string) => `/${pageName.toLowerCase()}`;

export const format = (date: Date, formatStr: string): string => {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthShort = shortMonths[date.getUTCMonth()];

  switch (formatStr) {
    case 'dd/MM/yyyy':
      return `${day}/${month}/${year}`;
    case 'yyyy-MM-dd':
      return `${year}-${month}-${day}`;
    case 'dd/MM/yyyy HH:mm':
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    case 'MMM d, yyyy':
      return `${monthShort} ${date.getUTCDate()}, ${year}`;
    default:
      return date.toISOString();
  }
};

// --- Hijri Calendar Conversion ---
// Based on the Kuwaity algorithm

function gMod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

const GREGORIAN_EPOCH = 1721425.5;
const HIJRI_EPOCH = 1948439.5;

export const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani",
  "Jumada al-ula", "Jumada al-ukhra", "Rajab", "Sha'ban",
  "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
];

// Is Gregorian year a leap year?
function isGregorianLeap(year: number): boolean {
  return ((year % 4) == 0) && (!(((year % 100) == 0) && ((year % 400) != 0)));
}

// Gregorian to Julian
function gregorianToJd(year: number, month: number, day: number): number {
  return (GREGORIAN_EPOCH - 1) +
    (365 * (year - 1)) +
    Math.floor((year - 1) / 4) +
    (-Math.floor((year - 1) / 100)) +
    Math.floor((year - 1) / 400) +
    Math.floor((((367 * month) - 362) / 12) +
      ((month <= 2) ? 0 :
        (isGregorianLeap(year) ? -1 : -2)
      ) + day);
}

// Julian to Gregorian
export function jdToGregorian(jd: number): { year: number, month: number, day: number } {
  const wjd = Math.floor(jd - 0.5) + 0.5;
  const depoch = wjd - GREGORIAN_EPOCH;
  const quadricent = Math.floor(depoch / 146097);
  const dqc = gMod(depoch, 146097);
  const cent = Math.floor(dqc / 36524);
  const dcent = gMod(dqc, 36524);
  const quad = Math.floor(dcent / 1461);
  const dquad = gMod(dcent, 1461);
  const yindex = Math.floor(dquad / 365);
  let year = (quadricent * 400) + (cent * 100) + (quad * 4) + yindex;
  if (!((cent == 4) || (yindex == 4))) {
    year++;
  }
  const yearday = wjd - gregorianToJd(year, 1, 1);
  const leapadj = (wjd < gregorianToJd(year, 3, 1)) ? 0 :
    (isGregorianLeap(year) ? 1 : 2);
  const month = Math.floor((((yearday + leapadj) * 12) + 373) / 367);
  const day = (wjd - gregorianToJd(year, month, 1)) + 1;

  return { year, month, day };
}

// Hijri to Julian
export function hijriToJd(year: number, month: number, day: number): number {
  return day +
    Math.ceil(29.5 * (month - 1)) +
    ((year - 1) * 354) +
    Math.floor((3 + (11 * year)) / 30) +
    HIJRI_EPOCH - 1;
}

// Julian to Hijri
function jdToHijri(jd: number): { year: number, month: number, day: number } {
  jd = Math.floor(jd) + 0.5;
  const year = Math.floor(((30 * (jd - HIJRI_EPOCH)) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((jd - (29 + hijriToJd(year, 1, 1))) / 29.5) + 1);
  const day = (jd - hijriToJd(year, month, 1)) + 1;
  return { year, month, day };
}

export function gregorianToHijri(gYear: number, gMonth: number, gDay: number): { hYear: number, hMonth: number, hDay: number } | null {
  if (isNaN(gYear) || isNaN(gMonth) || isNaN(gDay) || gYear === 0) return null;
  const jd = gregorianToJd(gYear, gMonth, gDay);
  const { year, month, day } = jdToHijri(jd);
  return { hYear: year, hMonth: month, hDay: day };
}

export function hijriToGregorian(hYear: number, hMonth: number, hDay: number): { gYear: number, gMonth: number, gDay: number } | null {
  if (isNaN(hYear) || isNaN(hMonth) || isNaN(hDay) || hYear === 0) return null;
  const jd = hijriToJd(hYear, hMonth, hDay);
  const { year, month, day } = jdToGregorian(jd);
  return { gYear: year, gMonth: month, gDay: day };
}

export function addHijriMonths(date: Date, months: number): Date {
  const gYear = date.getUTCFullYear();
  const gMonth = date.getUTCMonth() + 1;
  const gDay = date.getUTCDate();

  const hijriDate = gregorianToHijri(gYear, gMonth, gDay);
  if (!hijriDate) return date;

  let { hYear, hMonth, hDay } = hijriDate;
  
  hMonth += months;
  hYear += Math.floor((hMonth - 1) / 12);
  hMonth = ((hMonth - 1) % 12) + 1;
  
  const gregorianResult = hijriToGregorian(hYear, hMonth, hDay);
  if (!gregorianResult) return date;
  
  return new Date(Date.UTC(gregorianResult.gYear, gregorianResult.gMonth - 1, gregorianResult.gDay));
}

export function addHijriYears(date: Date, years: number): Date {
    return addHijriMonths(date, years * 12);
}


export function formatHijri(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(`${date}T00:00:00Z`) : date;
  if (isNaN(d.getTime())) return 'N/A';
  
  const hijri = gregorianToHijri(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  if (!hijri) return 'N/A';
  
  return `${String(hijri.hDay).padStart(2, '0')}-${String(hijri.hMonth).padStart(2, '0')}-${hijri.hYear}H`;
}

export const toYMD = (date: { year: number, month: number, day: number }) => {
    return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
};