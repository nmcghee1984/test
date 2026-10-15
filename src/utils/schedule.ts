// Local-date helpers for the labelled sample schedule. Live integrations need dated, timezone-aware occurrences.
import type { StudySpace } from "../domain/campus";

export const weekdayKeys = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const dayLetters = ["M", "T", "W", "T", "F"];

export const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function reminderDate(day: Date, time: string, minutesBefore: number) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(day);
  date.setHours(hours, minutes - minutesBefore, 0, 0);
  return date;
}

export function localDateKey(day: Date) {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

export function isSampleSpaceOpen(space: StudySpace, date: Date) {
  const day = date.getDay();
  if (!space.openWeekends && (day === 0 || day === 6)) return false;
  const [openHour, openMinute] = space.openFrom.split(":").map(Number);
  const [closeHour, closeMinute] = space.openUntil.split(":").map(Number);
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  return nowMinutes >= openHour * 60 + openMinute && nowMinutes < closeHour * 60 + closeMinute;
}

export function calendarLink(title: string, date: Date, time: string, durationMinutes: number, details: string, location: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const start = new Date(date);
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const formatDate = (value: Date) => value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatDate(start)}/${formatDate(end)}`,
    details,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
