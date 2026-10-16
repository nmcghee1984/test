import { useEffect, useRef, useState, type SetStateAction } from "react";
import { Alert, Platform } from "react-native";
import { cancelReminder, scheduleReminder } from "../data/reminders";
import { defaultPreferences, readSavedState, writeSavedState } from "../data/storage";
import type { AppPreferences, SavedState, CampusDataSource } from "../data/storage";
import { cancelMatching, createSerialQueue, restoreReminders } from "../data/stateLifecycle";

const port = { cancel: cancelReminder, schedule: scheduleReminder };
const initialState = (): SavedState => ({
  preferences: { ...defaultPreferences, homeSections: [...defaultPreferences.homeSections] },
  savedSpaces: [], savedEvents: [], savedPlaces: [], savedResearch: [], researchInterests: [],
  reminders: {}, dismissedNotice: false, updatedAt: new Date(0).toISOString(),
});

export function useSavedCampusState(campusData: CampusDataSource) {
  const [state, setState] = useState(initialState);
  const current = useRef(state);
  const touched = useRef(new Set<keyof SavedState>());
  const touchedPreferences = useRef(new Set<keyof AppPreferences>());
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [reminderError, setReminderError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const canSave = useRef(false);
  const mounted = useRef(false);
  const initialization = useRef<Promise<void> | null>(null);
  const writeQueue = useRef(createSerialQueue()).current;
  const reminderQueue = useRef(createSerialQueue()).current;

  function commit(next: SavedState) {
    current.current = next;
    setState(next);
  }
  function update<K extends keyof SavedState>(key: K, value: SetStateAction<SavedState[K]>) {
    touched.current.add(key);
    const previous = current.current[key];
    commit({ ...current.current, [key]: typeof value === "function"
      ? (value as (previous: SavedState[K]) => SavedState[K])(previous) : value });
  }
  function updatePreferences(value: Partial<AppPreferences>) {
    for (const key of Object.keys(value) as (keyof AppPreferences)[]) touchedPreferences.current.add(key);
    update("preferences", { ...current.current.preferences, ...value });
  }

  useEffect(() => {
    mounted.current = true;
    // Reuse initialization across StrictMode effect replay; never restore twice.
    initialization.current ??= (async () => {
      try {
        const saved = await readSavedState();
        if (saved) {
          const restored = await restoreReminders(saved, campusData, Platform.OS === "web", port);
          const next = { ...saved, reminders: restored.reminders };
          for (const key of touched.current) {
            if (key !== "preferences") Object.assign(next, { [key]: current.current[key] });
          }
          for (const key of touchedPreferences.current) Object.assign(next.preferences, { [key]: current.current.preferences[key] });
          current.current = next;
          if (mounted.current) { setState(next); setReminderError(restored.message); }
        }
        canSave.current = true;
      } catch (error) {
        console.error("Could not load saved UofG Life preferences.", error);
        // Preserve unreadable storage for recovery instead of replacing it with defaults.
        if (mounted.current) setStorageError("Some saved preferences could not be loaded. Changes will not replace saved settings during this session.");
      } finally {
        if (mounted.current) setLoaded(true);
      }
    })();
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!loaded || !canSave.current) return;
    const snapshot = { ...state, updatedAt: new Date().toISOString() };
    void writeQueue(() => writeSavedState(snapshot)).then(() => {
      if (mounted.current) setStorageError("");
    }).catch((error: unknown) => {
      console.error("Could not save UofG Life preferences.", error);
      if (mounted.current) setStorageError("Changes could not be saved on this device.");
    });
  }, [state, loaded, writeQueue]);

  function report(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    if (mounted.current) setActionMessage(message);
    if (Platform.OS !== "web") Alert.alert("Reminder unavailable", message);
  }
  async function toggleReminder(key: string, title: string, body: string, date: Date) {
    if (!loaded || !canSave.current) {
      setActionMessage(loaded ? "Reminders are unavailable until saved settings can be read. Please restart the app to retry." : "Saved settings are still loading. Please try again.");
      return;
    }
    await reminderQueue(async () => {
      try {
        const existing = current.current.reminders[key];
        if (existing) {
          await port.cancel(key, existing);
          const next = { ...current.current.reminders }; delete next[key];
          update("reminders", next);
          setActionMessage("Reminder removed.");
        } else {
          const id = await port.schedule(key, title, body, date);
          update("reminders", { ...current.current.reminders, [key]: id });
          setActionMessage(`Reminder set for ${date.toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })}.`);
        }
      } catch (error) { report(error, "The reminder could not be set."); }
    });
  }
  async function toggleEventReminderSetting() {
    if (!loaded || !canSave.current) {
      setActionMessage(loaded ? "Reminders are unavailable until saved settings can be read. Please restart the app to retry." : "Saved settings are still loading. Please try again.");
      return;
    }
    await reminderQueue(async () => {
      if (!current.current.preferences.eventRemindersEnabled) {
        updatePreferences({ eventRemindersEnabled: true }); return;
      }
      const result = await cancelMatching(current.current.reminders, (key) => key.startsWith("event:"), port);
      update("reminders", result.reminders);
      if (result.failed) report(new Error("Could not cancel some event reminders. Please try again."), "Could not cancel event reminders.");
      else { updatePreferences({ eventRemindersEnabled: false }); setReminderError(""); }
    });
  }

  return {
    ...state, noticeVisible: !state.dismissedNotice,
    setNoticeVisible: (value: SetStateAction<boolean>) => update("dismissedNotice",
      typeof value === "function" ? !value(!current.current.dismissedNotice) : !value),
    setSavedSpaces: (value: SetStateAction<string[]>) => update("savedSpaces", value),
    setSavedEvents: (value: SetStateAction<string[]>) => update("savedEvents", value),
    setSavedPlaces: (value: SetStateAction<string[]>) => update("savedPlaces", value),
    setSavedResearch: (value: SetStateAction<SavedState["savedResearch"]>) => update("savedResearch", value),
    setResearchInterests: (value: SetStateAction<string[]>) => update("researchInterests", value),
    updatePreferences, toggleReminder, toggleEventReminderSetting,
    storageError: storageError || reminderError, actionMessage, setActionMessage,
  };
}
