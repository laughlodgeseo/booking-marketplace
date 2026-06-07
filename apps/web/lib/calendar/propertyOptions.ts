import type { PortalCalendarProperty } from "@/lib/api/portal/calendar";

/**
 * Returns `incoming` when it is non-empty, otherwise returns `current`.
 *
 * This keeps the dropdown list stable: once populated it is never cleared by a
 * calendar reload or an error state that returns an empty property list.
 */
export function mergePropertyOptions(
  current: PortalCalendarProperty[],
  incoming: PortalCalendarProperty[],
): PortalCalendarProperty[] {
  return incoming.length > 0 ? incoming : current;
}
