import type { SavedState, CampusDataSource } from "./storage";
import { reminderDate } from "../utils/schedule";

/** Serializes writes/actions; a rejection never poisons later work. */
export function createSerialQueue() {
  let pending = Promise.resolve();
  return function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation);
    pending = result.then(() => undefined, () => undefined);
    return result;
  };
}

export type ReminderPort = {
  cancel: (key: string, identifier: string) => Promise<void>;
  schedule: (key: string, title: string, body: string, date: Date, askPermission?: boolean) => Promise<string>;
};

/** Remove only successfully cancelled IDs, retaining failures for Settings retry. */
export async function cancelMatching(reminders: Record<string, string>, matches: (key: string) => boolean, port: ReminderPort) {
  const next = { ...reminders };
  let failed = false;
  for (const [key, id] of Object.entries(reminders)) {
    if (!matches(key)) continue;
    try { await port.cancel(key, id); delete next[key]; }
    catch { failed = true; }
  }
  return { reminders: next, failed };
}

export async function restoreReminders(state: SavedState, campus: CampusDataSource, web: boolean, port: ReminderPort) {
  const retired = new Set(["event:freshers", "event:careers", "event:wellbeing"]);
  const result = await cancelMatching(state.reminders, (key) => retired.has(key), port);
  let message = result.failed ? "An old sample-event reminder could not be cancelled. Turn off event reminders in Settings to retry." : "";
  if (!web) return { ...result, message };
  for (const [key, id] of Object.entries(result.reminders)) {
    if (!id.startsWith("web:") || retired.has(key)) continue;
    let title = "", body = "", date: Date | null = null;
    const event = campus.events.find((item) => key === `event:${item.id}`);
    if (event) {
      const [year, month, day] = event.date.split("-").map(Number);
      title = event.title; body = event.place;
      date = reminderDate(new Date(year, month - 1, day), event.time, 30);
    }
    const match = /^class:(\d{4}-\d{2}-\d{2}):(.+)$/.exec(key);
    if (match) {
      const [year, month, day] = match[1].split("-").map(Number);
      const item = Object.values(campus.timetable).flat().find((entry) => entry.id === match[2]);
      const dayDate = new Date(year, month - 1, day);
      if (item && dayDate.getFullYear() === year && dayDate.getMonth() === month - 1 && dayDate.getDate() === day) {
        title = item.title; body = `${item.place} · starts at ${item.start}`;
        date = reminderDate(dayDate, item.start, state.preferences.classReminderMinutes);
      }
    }
    // Only definitively expired reminders are discarded. Missing data/permission may recover.
    if (date && Number.isFinite(date.getTime()) && date.getTime() <= Date.now()) {
      delete result.reminders[key];
      message ||= "Some old browser reminders expired or could not be restored.";
    } else if (date && Number.isFinite(date.getTime()) && title) {
      try { result.reminders[key] = await port.schedule(key, title, body, date, false); }
      catch { message ||= "Some browser reminders could not be restored. Their saved settings have been kept."; }
    } else {
      message ||= "Some browser reminders could not be restored. Their saved settings have been kept.";
    }
  }
  return { ...result, message };
}
