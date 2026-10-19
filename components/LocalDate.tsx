"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

const formats = {
  date: { month: "short", day: "numeric", year: "numeric" },
  dateTime: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

/**
 * Renders a UTC ISO timestamp in the viewer's own time zone. The server can't
 * know that zone, so it renders the UTC date and the browser swaps in local time.
 */
export default function LocalDate({ iso, format = "date" }: { iso: string; format?: keyof typeof formats }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  const date = new Date(iso);
  const label = isClient
    ? new Intl.DateTimeFormat(undefined, formats[format]).format(date)
    : new Intl.DateTimeFormat("en-US", { ...formats.date, timeZone: "UTC" }).format(date);

  return <time dateTime={iso}>{label}</time>;
}
