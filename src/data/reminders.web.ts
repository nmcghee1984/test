const browserTimers = new Map<string, ReturnType<typeof setTimeout>>();

export async function scheduleReminder(
  key: string,
  title: string,
  body: string,
  date: Date,
  askPermission = true,
): Promise<string> {
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
    throw new Error("This reminder time has already passed.");
  }
  if (!("Notification" in globalThis)) {
    throw new Error("This browser does not support notifications.");
  }
  const permission = askPermission ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") {
    throw new Error("Allow browser notifications to set a reminder.");
  }
  const deadline = date.getTime();
  const notifyWhenDue = () => {
    const remaining = deadline - Date.now();
    if (remaining > 0) {
      const timer = setTimeout(notifyWhenDue, Math.min(remaining, 2_147_000_000));
      browserTimers.set(key, timer);
      return;
    }
    new Notification(title, { body });
    browserTimers.delete(key);
  };
  const previous = browserTimers.get(key);
  if (previous) clearTimeout(previous);
  const timer = setTimeout(notifyWhenDue, Math.min(deadline - Date.now(), 2_147_000_000));
  browserTimers.set(key, timer);
  return `web:${key}`;
}

export async function cancelReminder(key: string, identifier: string): Promise<void> {
  if (!identifier.startsWith("web:")) return;
  const timer = browserTimers.get(key);
  if (timer) clearTimeout(timer);
  browserTimers.delete(key);
}
