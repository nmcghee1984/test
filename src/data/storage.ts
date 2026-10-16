import { isDiscoveryRecord, isObject } from "./validation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CampusPlace, ClassItem, StudySpace } from "../domain/campus";
import type { DiscoveryRecord } from "./discovery";
import { universityEvents, type CampusEvent } from "./events";
import {
  campusPlaces,
  sampleClasses,
  studySpaces,
} from "./mockData";

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

export function parseSavedState(value: string): SavedState {
  const state: unknown = JSON.parse(value);
  if (!isObject(state)) throw new Error("Saved settings were not an object.");
  const incoming = isObject(state.preferences) ? state.preferences : {};
  const strings = (value: unknown): string[] => Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string") : [];
  const boolean = (key: keyof AppPreferences): boolean => typeof incoming[key] === "boolean"
    ? incoming[key] as boolean : defaultPreferences[key] as boolean;
  return {
    preferences: {
      displayName: typeof incoming.displayName === "string" ? incoming.displayName.slice(0, 32) : defaultPreferences.displayName,
      homeSections: Array.isArray(incoming.homeSections)
        ? [...new Set(strings(incoming.homeSections).filter((section): section is HomeSection =>
          section === "timetable" || section === "study" || section === "saved"))]
        : [...defaultPreferences.homeSections],
      largerText: boolean("largerText"),
      highContrast: boolean("highContrast"),
      reducedMotion: boolean("reducedMotion"),
      eventRemindersEnabled: boolean("eventRemindersEnabled"),
      classReminderMinutes: [5, 10, 15].includes(incoming.classReminderMinutes as number)
        ? incoming.classReminderMinutes as number : defaultPreferences.classReminderMinutes,
    },
    savedSpaces: strings(state.savedSpaces),
    savedEvents: strings(state.savedEvents),
    savedPlaces: strings(state.savedPlaces),
    savedResearch: Array.isArray(state.savedResearch) ? state.savedResearch.filter(isDiscoveryRecord).slice(0, 100) : [],
    researchInterests: strings(state.researchInterests).map((item) => item.slice(0, 40)).slice(0, 20),
    reminders: isObject(state.reminders) ? Object.fromEntries(Object.entries(state.reminders)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0)) : {},
    dismissedNotice: state.dismissedNotice === true,
    updatedAt: typeof state.updatedAt === "string" ? state.updatedAt : new Date(0).toISOString(),
  };
}

export async function readSavedState(): Promise<SavedState | null> {
  const value = await AsyncStorage.getItem(STATE_KEY);
  // Parse failures propagate: the persistence coordinator must not overwrite unreadable data.
  return value === null ? null : parseSavedState(value);
}

export async function writeSavedState(state: SavedState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export type CampusDataSource = {
  timetable: Record<string, ClassItem[]>;
  places: CampusPlace[];
  studySpaces: StudySpace[];
  events: CampusEvent[];
  isSample: boolean;
};

export function createSampleDataSource(): CampusDataSource {
  // Replace this adapter with an approved University service when one is available.
  return {
    timetable: sampleClasses,
    places: campusPlaces,
    studySpaces,
    events: universityEvents.events,
    isSample: true,
  };
}
