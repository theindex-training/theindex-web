/** The gym's time zone. Dates on the site are Sofia dates, whatever the server's TZ is. */
export const SITE_TIME_ZONE = 'Europe/Sofia';

/** The current year in Sofia (the container runs in UTC, two or three hours behind). */
export function currentYear(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en', {
      timeZone: SITE_TIME_ZONE,
      year: 'numeric',
    }).format(now),
  );
}

const longDate = new Intl.DateTimeFormat('bg', {
  dateStyle: 'long',
  timeZone: SITE_TIME_ZONE,
});

/** A date as readers see it, in Sofia: "7 ноември 2026 г.". */
export function formatLongDate(date: Date | string): string {
  return longDate.format(new Date(date));
}

const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TIME_ZONE });

/** The Sofia calendar day of a moment, as YYYY-MM-DD. */
export function sofiaDay(date: Date | string): string {
  return isoDay.format(new Date(date));
}
