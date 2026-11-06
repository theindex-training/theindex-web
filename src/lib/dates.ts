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
