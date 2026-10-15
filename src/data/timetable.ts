/** Proposed prototype contract, NOT a verified CMIS or MyCampus interface. */
export type TimetableOccurrence = {
  id: string;
  classId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: 'scheduled' | 'changed' | 'cancelled';
  revision: string;
  location: { building: string; room: string; buildingId?: string };
};
export type TimetableResult =
  | { mode: 'LIVE'; asOf: string; occurrences: TimetableOccurrence[] }
  | { mode: 'UNAVAILABLE'; reason: 'not-configured' | 'sign-in-required' | 'forbidden' | 'service-error' | 'invalid-response'; occurrences: [] };
export const unavailableTimetable = (): TimetableResult => ({ mode: 'UNAVAILABLE', reason: 'not-configured', occurrences: [] });
const timestamp = (v: unknown): v is string => typeof v === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v));
const nonempty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
/** Reject the whole response rather than silently dropping an invalid/cancelled meeting. */
export function parseTimetable(value: unknown): TimetableResult {
  const invalid = (): TimetableResult => ({ mode: 'UNAVAILABLE', reason: 'invalid-response', occurrences: [] });
  if (!value || typeof value !== 'object') return invalid();
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 1 || !timestamp(v.asOf) || !Array.isArray(v.occurrences) || v.occurrences.length > 10000) return invalid();
  const ids = new Set<string>();
  const occurrences: TimetableOccurrence[] = [];
  for (const raw of v.occurrences) {
    if (!raw || typeof raw !== 'object') return invalid();
    const o = raw as Record<string, unknown>;
    const location = o.location as Record<string, unknown> | undefined;
    if (!nonempty(o.id) || ids.has(o.id) || !nonempty(o.classId) || !nonempty(o.title)
      || !timestamp(o.startsAt) || !timestamp(o.endsAt) || Date.parse(o.endsAt) <= Date.parse(o.startsAt)
      || !nonempty(o.revision) || !['scheduled', 'changed', 'cancelled'].includes(String(o.status))
      || !location || typeof location.building !== 'string' || typeof location.room !== 'string'
      || (location.buildingId !== undefined && !nonempty(location.buildingId))) return invalid();
    ids.add(o.id);
    // Whitelist fields: do not retain unexpected personal attributes from upstream.
    occurrences.push({ id: o.id, classId: o.classId, title: o.title, startsAt: o.startsAt,
      endsAt: o.endsAt, revision: o.revision, status: o.status as TimetableOccurrence['status'],
      location: { building: location.building, room: location.room,
        ...(location.buildingId ? { buildingId: location.buildingId as string } : {}) } });
  }
  return { mode: 'LIVE', asOf: v.asOf, occurrences };
}
/** Transport must call an approved authenticated backend; never accept a student ID from the UI. */
export function createTimetableAdapter(transport?: () => Promise<{ status: number; body?: unknown }>) {
  return {
    async load(): Promise<TimetableResult> {
      if (!transport) return unavailableTimetable();
      try {
        const response = await transport();
        if (response.status !== 200) return { mode: 'UNAVAILABLE', occurrences: [], reason:
          response.status === 401 ? 'sign-in-required' : response.status === 403 ? 'forbidden' : 'service-error' };
        return parseTimetable(response.body);
      } catch { return { mode: 'UNAVAILABLE', reason: 'service-error', occurrences: [] }; }
    },
  };
}
