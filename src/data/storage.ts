import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  campusEvents,
  campusPlaces,
  sampleClasses,
  studySpaces,
} from "./mockData";
import type { DiscoveryRecord } from "./discovery";

export type HomeSection = "timetable" | "study" | "saved";

export type AppPreferences = {
  displayName: string;
  homeSections: HomeSection[];
  largerText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  classReminderMinutes: number;
  eventRemindersEnabled: boolean;
};

export type SavedState = {
  preferences: AppPreferences;
  savedSpaces: string[];
  savedEvents: string[];
  savedPlaces: string[];
  savedResearch: DiscoveryRecord[];
  researchInterests: string[];
  reminders: Record<string, string>;
  dismissedNotice: boolean;
  updatedAt: string;
};

export const defaultPreferences: AppPreferences = {
  displayName: "Alex",
  homeSections: ["timetable", "study", "saved"],
  largerText: false,
  highContrast: false,
  reducedMotion: true,
  classReminderMinutes: 10,
  eventRemindersEnabled: false,
};

const STATE_KEY = "uofg-life:local-state:v1";

function isDiscoveryRecord(value: unknown): value is DiscoveryRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<DiscoveryRecord>;
  return typeof record.id === "string"
    && typeof record.source === "string"
    && typeof record.sourceIdentifier === "string"
    && typeof record.sourceName === "string"
    && typeof record.sourceHomepage === "string"
    && typeof record.title === "string"
    && Array.isArray(record.creators) && record.creators.every((item) => typeof item === "string")
    && Array.isArray(record.subjects) && record.subjects.every((item) => typeof item === "string")
    && (record.description === undefined || typeof record.description === "string")
    && (record.publicationDate === undefined || typeof record.publicationDate === "string")
    && typeof record.recordUrl === "string"
    && Array.isArray(record.rights) && record.rights.every((item) => typeof item === "string")
    && typeof record.fetchedAt === "string"
    && ["LIVE", "CACHED", "DEMO", "UNAVAILABLE"].includes(record.mode ?? "");
}

export async function readSavedState(): Promise<SavedState | null> {
  const value = await AsyncStorage.getItem(STATE_KEY);
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") throw new Error("Saved settings were not an object.");
    const state = parsed as Partial<SavedState>;
    if (
      !state.preferences || typeof state.preferences !== "object"
      || !Array.isArray(state.savedSpaces)
      || !Array.isArray(state.savedEvents)
      || !Array.isArray(state.savedPlaces)
      || !state.reminders || typeof state.reminders !== "object"
    ) {
      throw new Error("Saved settings have an unsupported format.");
    }
    const incomingPreferences = state.preferences as Partial<AppPreferences>;
    const homeSections = Array.isArray(incomingPreferences.homeSections)
      ? incomingPreferences.homeSections.filter((section): section is HomeSection => (
        section === "timetable" || section === "study" || section === "saved"
      ))
      : defaultPreferences.homeSections;
    const savedLeadTime = incomingPreferences.classReminderMinutes;
    const classReminderMinutes = savedLeadTime === 5 || savedLeadTime === 10 || savedLeadTime === 15
      ? savedLeadTime
      : defaultPreferences.classReminderMinutes;
    return {
      preferences: {
        ...defaultPreferences,
        ...incomingPreferences,
        displayName: typeof incomingPreferences.displayName === "string"
          ? incomingPreferences.displayName.slice(0, 32)
          : defaultPreferences.displayName,
        homeSections,
        classReminderMinutes,
      },
      savedSpaces: state.savedSpaces.filter((id): id is string => typeof id === "string"),
      savedEvents: state.savedEvents.filter((id): id is string => typeof id === "string"),
      savedPlaces: state.savedPlaces.filter((id): id is string => typeof id === "string"),
      savedResearch: Array.isArray(state.savedResearch)
        ? state.savedResearch.filter(isDiscoveryRecord).slice(0, 100)
        : [],
      researchInterests: Array.isArray(state.researchInterests)
        ? state.researchInterests
          .filter((interest): interest is string => typeof interest === "string")
          .map((interest) => interest.slice(0, 40))
          .slice(0, 20)
        : [],
      reminders: Object.fromEntries(
        Object.entries(state.reminders).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      ),
      dismissedNotice: Boolean(state.dismissedNotice),
      updatedAt: typeof state.updatedAt === "string" ? state.updatedAt : new Date(0).toISOString(),
    };
  } catch (error) {
    console.error("Could not read saved UofG Life settings.", error);
    return null;
  }
}

export async function writeSavedState(state: SavedState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export type CampusDataSource = {
  timetable: typeof sampleClasses;
  places: typeof campusPlaces;
  studySpaces: typeof studySpaces;
  events: typeof campusEvents;
  isSample: boolean;
};

export function createSampleDataSource(): CampusDataSource {
  // Replace this adapter with an approved University service when one is available.
  return {
    timetable: sampleClasses,
    places: campusPlaces,
    studySpaces,
    events: campusEvents,
    isSample: true,
  };
}
