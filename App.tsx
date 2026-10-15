import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Alert,
  Linking,
  Platform,
  Pressable as NativePressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Image,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextProps,
  type PressableProps,
  type TextInputProps,
  View,
} from "react-native";
import { NotoSans_400Regular } from "@expo-google-fonts/noto-sans/400Regular";
import { NotoSans_500Medium } from "@expo-google-fonts/noto-sans/500Medium";
import { NotoSans_700Bold } from "@expo-google-fonts/noto-sans/700Bold";
import { NotoSerif_700Bold } from "@expo-google-fonts/noto-serif/700Bold";
import CampusMap from "./src/components/CampusMap";
import AskUofGScreen from "./src/components/AskUofGScreen";
import DiscoverScreen from "./src/components/DiscoverScreen";
import { universityEvents, type CampusEvent } from "./src/data/events";
import type { DiscoveryRecord } from "./src/data/discovery";
import {
  CampusPlace,
  ClassItem,
} from "./src/data/mockData";
import {
  AppPreferences,
  HomeSection,
  SavedState,
  createSampleDataSource,
  defaultPreferences,
  readSavedState,
  writeSavedState,
} from "./src/data/storage";
import { cancelReminder, scheduleReminder } from "./src/data/reminders";

type Tab = "Home" | "Timetable" | "Map" | "Study" | "Discover" | "Ask" | "Events" | "Settings";
type PlaceFilter = "All" | CampusPlace["category"];
const campusData = createSampleDataSource();
let textScale = 1;
let highContrastText = false;

const palette = {
  ink: "#173047",
  muted: "#526777",
  universityBlue: "#011451",
  navy: "#011451",
  paleBlue: "#E8F3F8",
  paper: "#F3F6F9",
  white: "#FFFFFF",
  line: "#E1E8EE",
  gold: "#F2D25C",
  sky: "#4DBBC6",
  mapPale: "#EAF0E9",
};

const fontFamilies: Record<string, string> = {
  normal: "NotoSans_400Regular",
  "400": "NotoSans_400Regular",
  "500": "NotoSans_500Medium",
  bold: "NotoSans_700Bold",
  "700": "NotoSans_700Bold",
  "600": "NotoSans_700Bold",
  "800": "NotoSans_700Bold",
  "900": "NotoSans_700Bold",
};

function Text({ style, ...props }: TextProps) {
  const textStyle = StyleSheet.flatten(style);
  const fontFamily = textStyle?.fontFamily
    ?? fontFamilies[textStyle?.fontWeight ?? "normal"]
    ?? fontFamilies.normal;
  const textColor = textStyle?.color;
  const improvedColor = highContrastText && typeof textColor === "string"
    && (textColor.toUpperCase() === palette.muted
      || ["#687B8B", "#9AA39E", "#9AA59E", "#929C95", "#8C9691", "#829087", "#718493", "#68736D", "#85948A", "#8B9991", "#69746D"]
      .includes(textColor.toUpperCase())
    )
    ? palette.ink
    : textColor;
  const fontSize = typeof textStyle?.fontSize === "number"
    ? Math.max(11, textStyle.fontSize) * textScale
    : undefined;

  return (
    <NativeText
      {...props}
      accessibilityRole={props.accessibilityRole
        ?? (typeof textStyle?.fontSize === "number" && textStyle.fontSize >= 25 ? "header" : undefined)}
      style={[
        style,
        {
          fontFamily,
          fontWeight: "normal",
          ...(fontSize ? { fontSize } : {}),
          ...(improvedColor ? { color: improvedColor } : {}),
        },
      ]}
    />
  );
}

function Pressable(props: PressableProps) {
  return <NativePressable hitSlop={8} {...props} />;
}

function TextInput({ style, ...props }: TextInputProps) {
  const inputStyle = StyleSheet.flatten(style);
  const fontSize = typeof inputStyle?.fontSize === "number"
    ? Math.max(16, inputStyle.fontSize) * textScale
    : undefined;
  return (
    <NativeTextInput
      {...props}
      style={[style, ...(fontSize ? [{ fontSize }] : [])]}
    />
  );
}

const tabs: { name: Tab; icon: string }[] = [
  { name: "Home", icon: "⌂" },
  { name: "Timetable", icon: "▦" },
  { name: "Map", icon: "⌖" },
  { name: "Study", icon: "▤" },
  { name: "Discover", icon: "⌕" },
  { name: "Events", icon: "✳" },
];

const weekdayKeys = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayLetters = ["M", "T", "W", "T", "F"];
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ActionButton({
  title,
  onPress,
  selected = false,
}: {
  title: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      style={[styles.actionButton, selected && styles.actionButtonSelected]}
    >
      <Text style={[styles.actionButtonText, selected && styles.actionButtonTextSelected]}>{title}</Text>
    </Pressable>
  );
}

function ClassCard({
  item,
  compact = false,
  reminderEnabled = false,
  onReminder,
  onCalendar,
  onPlace,
}: {
  item: ClassItem;
  compact?: boolean;
  reminderEnabled?: boolean;
  onReminder?: () => void;
  onCalendar?: () => void;
  onPlace?: () => void;
}) {
  return (
    <View style={[styles.classCard, compact && styles.classCardCompact]}>
      <View style={styles.classTime}>
        <Text style={styles.classStart}>{item.start}</Text>
        <Text style={styles.classEnd}>{item.end}</Text>
      </View>
      <View style={styles.classDivider} />
      <View style={styles.classInfo}>
        <Text style={styles.classKind}>{item.kind.toUpperCase()}</Text>
        <Text style={styles.className}>{item.title}</Text>
        {onPlace ? (
          <Pressable onPress={onPlace} accessibilityRole="button" accessibilityLabel={`Show ${item.place} on the campus map`}>
            <Text style={styles.locationLink}>{item.place} · Directions</Text>
          </Pressable>
        ) : <Text style={styles.bodyMuted}>{item.place}</Text>}
        {!compact ? <Text style={styles.classDetail}>{item.detail}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
      {!compact && (onReminder || onCalendar) ? (
        <View style={styles.classActions}>
          {onReminder ? (
            <Pressable
              onPress={onReminder}
              accessibilityRole="button"
              accessibilityLabel={reminderEnabled ? `Remove reminder for ${item.title}` : `Set reminder for ${item.title}`}
              accessibilityState={{ selected: reminderEnabled }}
              aria-pressed={reminderEnabled}
            >
              <Text style={styles.inlineAction}>{reminderEnabled ? "✓ Reminder on" : "◷ Remind me"}</Text>
            </Pressable>
          ) : null}
          {onCalendar ? (
            <Pressable onPress={onCalendar} accessibilityRole="button" accessibilityLabel={`Add ${item.title} to calendar`}>
              <Text style={styles.inlineAction}>＋ Calendar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CapacityBar({ available, total }: { available: number; total: number }) {
  const ratio = Math.max(0, Math.min(1, available / total));
  const color = ratio > 0.35 ? palette.universityBlue : ratio > 0.15 ? "#876100" : "#B5474D";
  return (
    <View
      style={styles.capacityTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: available }}
      accessibilityLabel={`${available} of ${total} spaces available`}
    >
      <View style={[styles.capacityFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

function EventCard({
  event,
  saved,
  reminderEnabled,
  onSave,
  onReminder,
  onCalendar,
}: {
  event: CampusEvent;
  saved: boolean;
  reminderEnabled: boolean;
  onSave: () => void;
  onReminder: () => void;
  onCalendar: () => void;
}) {
  return (
    <View style={styles.eventCard}>
      <View style={styles.eventDate}>
        <Text style={styles.eventDay}>{event.day}</Text>
        <Text style={styles.eventMonth}>{event.month}</Text>
      </View>
      <View style={styles.eventCopy}>
        <Text style={styles.eventCategory}>{event.category}</Text>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.bodyMuted}>{event.time} · {event.place}</Text>
        <Text style={styles.eventDescription}>{event.description}</Text>
        <Pressable
          onPress={onSave}
          accessibilityRole="button"
          accessibilityLabel={saved ? `Remove ${event.title} from saved events` : `Save ${event.title}`}
          accessibilityState={{ selected: saved }}
          aria-pressed={saved}
          style={[styles.smallButton, saved && styles.smallButtonSelected]}
        >
          <Text style={[styles.smallButtonText, saved && styles.smallButtonTextSelected]}>
            {saved ? "✓  Saved" : "＋  Save event"}
          </Text>
        </Pressable>
        <View style={styles.eventActions}>
          <Pressable
            onPress={onReminder}
            accessibilityRole="button"
            accessibilityLabel={reminderEnabled ? `Remove reminder for ${event.title}` : `Set reminder for ${event.title}`}
            accessibilityState={{ selected: reminderEnabled }}
            aria-pressed={reminderEnabled}
          >
            <Text style={styles.inlineAction}>{reminderEnabled ? "✓ Reminder on" : "◷ Remind me"}</Text>
          </Pressable>
          <Pressable onPress={onCalendar} accessibilityRole="button" accessibilityLabel={`Add ${event.title} to calendar`}>
            <Text style={styles.inlineAction}>＋ Calendar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SettingToggle({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <Pressable
      onPress={onChange}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      style={styles.settingRow}
    >
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.bodyMuted}>{description}</Text>
      </View>
      <View style={[styles.switchTrack, value && styles.switchTrackActive]}>
        <View style={[styles.switchKnob, value && styles.switchKnobActive]} />
      </View>
    </Pressable>
  );
}

function reminderDate(day: Date, time: string, minutesBefore: number) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(day);
  date.setHours(hours, minutes - minutesBefore, 0, 0);
  return date;
}

function localDateKey(day: Date) {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

function isSampleSpaceOpen(space: (typeof campusData.studySpaces)[number], date: Date) {
  const day = date.getDay();
  if (!space.openWeekends && (day === 0 || day === 6)) return false;
  const [openHour, openMinute] = space.openFrom.split(":").map(Number);
  const [closeHour, closeMinute] = space.openUntil.split(":").map(Number);
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  return nowMinutes >= openHour * 60 + openMinute && nowMinutes < closeHour * 60 + closeMinute;
}

function calendarLink(title: string, date: Date, time: string, durationMinutes: number, details: string, location: string) {
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

export default function App() {
  useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_700Bold,
    NotoSerif_700Bold,
  });

  const today = useMemo(() => new Date(), []);
  const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences);
  const [savedSpaces, setSavedSpaces] = useState<string[]>([]);
  const [savedEvents, setSavedEvents] = useState<string[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<string[]>([]);
  const [savedResearch, setSavedResearch] = useState<DiscoveryRecord[]>([]);
  const [researchInterests, setResearchInterests] = useState<string[]>([]);
  const [reminders, setReminders] = useState<Record<string, string>>({});
  const [noticeVisible, setNoticeVisible] = useState(true);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [stateLoaded, setStateLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const webRemindersRestored = useRef(false);
  const todayKey = weekdayKeys[today.getDay()];
  const monday = useMemo(() => {
    const date = new Date(today);
    date.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return date;
  }, [today]);
  const [tab, setTab] = useState<Tab>("Home");
  const [selectedDay, setSelectedDay] = useState(weekDays.includes(todayKey) ? todayKey : "Mon");
  const [weekOffset, setWeekOffset] = useState(0);
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>("All");
  const [studyFilter, setStudyFilter] = useState<"All" | "Quiet" | "Group">("All");
  const [savedSpacesOnly, setSavedSpacesOnly] = useState(false);
  const [openSpacesOnly, setOpenSpacesOnly] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<CampusPlace>(campusData.places[0]);
  const [mapSearch, setMapSearch] = useState("");
  const [studySearch, setStudySearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [eventDateFilter, setEventDateFilter] = useState<"WEEK" | "UPCOMING">("UPCOMING");
  const [savedEventsOnly, setSavedEventsOnly] = useState(false);
  const [stepFreeOnly, setStepFreeOnly] = useState(false);
  const [directoryAccessOnly, setDirectoryAccessOnly] = useState(false);
  const [facilitySearch, setFacilitySearch] = useState("");

  textScale = preferences.largerText ? 1.18 : 1;
  highContrastText = preferences.highContrast;
  const classes = campusData.timetable[selectedDay] ?? [];
  const todayClasses = campusData.timetable[todayKey] ?? [];
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const nextClass = todayClasses.find((item) => {
    const [hours, minutes] = item.start.split(":").map(Number);
    return hours * 60 + minutes > nowMinutes;
  });
  const weekStart = new Date(monday);
  weekStart.setDate(monday.getDate() + weekOffset * 7);
  const selectedDate = new Date(weekStart);
  selectedDate.setDate(weekStart.getDate() + weekDays.indexOf(selectedDay));
  const normalizedMapSearch = mapSearch.trim().toLocaleLowerCase();
  const displayedPlaces = campusData.places.filter((place) => (
    (placeFilter === "All" || place.category === placeFilter)
    && (!normalizedMapSearch || [
      place.name, place.category, place.detail, place.openingHours,
      place.accessibility, ...place.facilities,
    ].join(" ").toLocaleLowerCase().includes(normalizedMapSearch))
  ));
  const displayedStudySpaces = studyFilter === "All"
    ? campusData.studySpaces
    : campusData.studySpaces.filter((space) => studyFilter === "Quiet" ? space.quiet : !space.quiet);
  const filteredStudySpaces = displayedStudySpaces.filter((space) => (
    (!stepFreeOnly || space.stepFree)
    && (!savedSpacesOnly || savedSpaces.includes(space.id))
    && (!openSpacesOnly || isSampleSpaceOpen(space, new Date()))
    && (!studySearch.trim() || [
      space.name, space.building, space.level, space.openingHours, ...space.facilities,
    ].join(" ").toLocaleLowerCase().includes(studySearch.trim().toLocaleLowerCase()))
  ));
  const displayedEvents = campusData.events.filter((event) => {
    const [year, month, day] = event.date.split("-").map(Number);
    const eventDate = new Date(year, month - 1, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isUpcoming = eventDate >= todayStart;
    const withinWeek = eventDate.getTime() < todayStart.getTime() + 7 * 24 * 60 * 60 * 1000;
    return (eventFilter === "ALL" || event.category === eventFilter)
      && (!savedEventsOnly || savedEvents.includes(event.id))
      && isUpcoming
      && (eventDateFilter !== "WEEK" || withinWeek)
      && (!eventSearch.trim() || [
        event.title, event.category, event.description, event.place,
      ].join(" ").toLocaleLowerCase().includes(eventSearch.trim().toLocaleLowerCase()));
  });

  useEffect(() => {
    readSavedState().then(async (saved) => {
      if (saved) {
        setPreferences({ ...defaultPreferences, ...saved.preferences });
        setSavedSpaces(saved.savedSpaces ?? []);
        setSavedEvents(saved.savedEvents ?? []);
        setSavedPlaces(saved.savedPlaces ?? []);
        setSavedResearch(saved.savedResearch ?? []);
        setResearchInterests(saved.researchInterests ?? []);
        // Retire reminders scheduled from the three removed demonstration events.
        // Keep failed cancellations available for retry through Settings.
        const nextReminders = { ...(saved.reminders ?? {}) };
        for (const id of ["freshers", "careers", "wellbeing"]) {
          const key = `event:${id}`;
          if (!nextReminders[key]) continue;
          try {
            await cancelReminder(key, nextReminders[key]);
            delete nextReminders[key];
          } catch {
            setStorageError("An old sample-event reminder could not be cancelled. Turn off event reminders in Settings to retry.");
          }
        }
        setReminders(nextReminders);
        setNoticeVisible(!saved.dismissedNotice);
      }
    }).catch((error: unknown) => {
      console.error("Could not load saved UofG Life preferences.", error);
      setStorageError("Some saved preferences could not be loaded.");
    }).finally(() => setStateLoaded(true));
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      const update = () => setSystemReducedMotion(media.matches);
      update();
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setSystemReducedMotion(enabled);
    }).catch((error: unknown) => {
      console.error("Could not read the system reduced-motion setting.", error);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setSystemReducedMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!stateLoaded) return;
    const state: SavedState = {
      preferences,
      savedSpaces,
      savedEvents,
      savedPlaces,
      savedResearch,
      researchInterests,
      reminders,
      dismissedNotice: !noticeVisible,
      updatedAt: new Date().toISOString(),
    };
    writeSavedState(state).then(() => setStorageError("")).catch((error: unknown) => {
      console.error("Could not save UofG Life preferences.", error);
      setStorageError("Changes could not be saved on this device.");
    });
  }, [preferences, savedSpaces, savedEvents, savedPlaces, savedResearch, researchInterests, reminders, noticeVisible, stateLoaded]);

  useEffect(() => {
    if (displayedPlaces.length && !displayedPlaces.some((place) => place.id === selectedPlace.id)) {
      setSelectedPlace(displayedPlaces[0]);
    }
  }, [displayedPlaces, selectedPlace.id]);

  useEffect(() => {
    if (!stateLoaded || Platform.OS !== "web" || webRemindersRestored.current) return;
    webRemindersRestored.current = true;
    const pending = Object.entries(reminders).filter(([, id]) => id.startsWith("web:"));
    if (!pending.length) return;
    Promise.all(pending.map(async ([key]) => {
      let title = "";
      let body = "";
      let date: Date | null = null;
      if (key.startsWith("event:")) {
        const event = campusData.events.find((item) => key === `event:${item.id}`);
        if (event) {
          const [year, month, day] = event.date.split("-").map(Number);
          title = event.title;
          body = event.place;
          date = reminderDate(new Date(year, month - 1, day), event.time, 30);
        }
      } else if (key.startsWith("class:")) {
        const [, dateKey, classId] = key.split(":");
        const [year, month, day] = dateKey.split("-").map(Number);
        const item = Object.values(campusData.timetable).flat().find((entry) => entry.id === classId);
        if (item) {
          title = item.title;
          body = `${item.place} · starts at ${item.start}`;
          date = reminderDate(new Date(year, month - 1, day), item.start, preferences.classReminderMinutes);
        }
      }
      if (!date || !title) return { key, identifier: null };
      try {
        const identifier = await scheduleReminder(key, title, body, date, false);
        return { key, identifier };
      } catch (error) {
        console.error("Could not restore a browser reminder.", error);
        return { key, identifier: null };
      }
    })).then((results) => {
      const invalidKeys = new Set(results.filter((result) => !result.identifier).map((result) => result.key));
      setReminders((current) => {
        const next = { ...current };
        for (const result of results) {
          if (result.identifier) next[result.key] = result.identifier;
          else delete next[result.key];
        }
        return next;
      });
      if (invalidKeys.size) setActionMessage("Some old browser reminders expired or could not be restored.");
    });
  }, [stateLoaded]);

  function updatePreferences(update: Partial<AppPreferences>) {
    setPreferences((current) => ({ ...current, ...update }));
  }

  async function toggleReminder(key: string, title: string, body: string, date: Date) {
    const existing = reminders[key];
    try {
      if (existing) {
        await cancelReminder(key, existing);
        setReminders((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
        setActionMessage("Reminder removed.");
        return;
      }
      const identifier = await scheduleReminder(key, title, body, date);
      setReminders((current) => ({ ...current, [key]: identifier }));
      setActionMessage(`Reminder set for ${date.toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The reminder could not be set.";
      setActionMessage(message);
      if (Platform.OS !== "web") Alert.alert("Reminder unavailable", message);
    }
  }

  async function toggleEventReminderSetting() {
    if (!preferences.eventRemindersEnabled) {
      updatePreferences({ eventRemindersEnabled: true });
      return;
    }
    const activeEventReminders = Object.entries(reminders).filter(([key]) => key.startsWith("event:"));
    try {
      await Promise.all(activeEventReminders.map(([key, id]) => cancelReminder(key, id)));
      setReminders((current) => Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith("event:")),
      ));
      updatePreferences({ eventRemindersEnabled: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not cancel event reminders.";
      setActionMessage(message);
      if (Platform.OS !== "web") Alert.alert("Reminder update failed", message);
    }
  }

  async function openExternal(url: string) {
    try {
      await Linking.openURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not open the requested link.";
      setActionMessage(message);
      if (Platform.OS !== "web") Alert.alert("Could not open link", message);
    }
  }

  function addClassToCalendar(item: ClassItem) {
    const [startHour, startMinute] = item.start.split(":").map(Number);
    const [endHour, endMinute] = item.end.split(":").map(Number);
    const duration = endHour * 60 + endMinute - startHour * 60 - startMinute;
    const url = calendarLink(item.title, selectedDate, item.start, duration, item.detail, item.place);
    void openExternal(url);
  }

  function addEventToCalendar(event: CampusEvent) {
    const [year, month, day] = event.date.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    void openExternal(calendarLink(event.title, date, event.time, 60, event.description, event.place));
  }

  function toggleClassReminder(item: ClassItem) {
    const key = `class:${localDateKey(selectedDate)}:${item.id}`;
    void toggleReminder(
      key,
      item.title,
      `${item.place} · starts at ${item.start}`,
      reminderDate(selectedDate, item.start, preferences.classReminderMinutes),
    );
  }

  function toggleEventReminder(event: CampusEvent) {
    const key = `event:${event.id}`;
    if (!reminders[key]) updatePreferences({ eventRemindersEnabled: true });
    const [year, month, day] = event.date.split("-").map(Number);
    const date = reminderDate(new Date(year, month - 1, day), event.time, 30);
    void toggleReminder(key, event.title, event.place, date);
  }

  function toggleValue(values: string[], id: string, update: (next: string[]) => void) {
    update(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  }

  function goTo(next: Tab) {
    setTab(next);
  }

  function renderHome() {
    return (
      <>
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>Hello, {preferences.displayName || "there"} <Text style={styles.wave}>✳</Text></Text>
            <Text style={styles.dateText}>{formatDate(today)}</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(preferences.displayName || "U").slice(0, 1).toUpperCase()}</Text></View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopline}>
            <View style={styles.liveDot} />
            <Text style={styles.heroEyebrow}>YOUR CAMPUS, AT A GLANCE</Text>
            <Text style={styles.sampleTag}>SAMPLE</Text>
          </View>
          {nextClass ? (
            <>
              <Text style={styles.heroCaption}>UP NEXT · {nextClass.start}</Text>
              <Text style={styles.heroTitle}>{nextClass.title}</Text>
              <View style={styles.heroLocationRow}>
                <Text style={styles.heroPin}>⌖</Text>
                <Text style={styles.heroLocation}>{nextClass.place}</Text>
              </View>
              <Pressable style={styles.directionsButton} onPress={() => goTo("Map")} accessibilityRole="button">
                <Text style={styles.directionsText}>Find your way <Text style={styles.buttonArrow}>→</Text></Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.heroCaption}>{todayClasses.length ? "YOU'RE ALL CAUGHT UP" : "A LITTLE SPACE TO BREATHE"}</Text>
              <Text style={styles.heroTitle}>{todayClasses.length ? "No more classes today" : "No classes today"}</Text>
              <Text style={styles.heroLocation}>Explore campus or find a quiet study spot.</Text>
              <Pressable style={styles.directionsButton} onPress={() => goTo(todayClasses.length ? "Timetable" : "Study")} accessibilityRole="button">
                <Text style={styles.directionsText}>{todayClasses.length ? "View today's classes" : "Find a study space"} <Text style={styles.buttonArrow}>→</Text></Text>
              </Pressable>
            </>
          )}
          <View style={styles.heroDecorOne} />
          <View style={styles.heroDecorTwo} />
        </View>

        <View style={styles.quickActions}>
          <Pressable style={styles.quickAction} onPress={() => goTo("Timetable")} accessibilityRole="button" accessibilityLabel="Open timetable">
            <View style={[styles.quickIcon, { backgroundColor: "#E7F1F8" }]}><Text style={styles.quickGlyph}>▦</Text></View>
            <Text style={styles.quickLabel}>Timetable</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => goTo("Map")} accessibilityRole="button" accessibilityLabel="Open campus map">
            <View style={[styles.quickIcon, { backgroundColor: "#E5F7FB" }]}><Text style={styles.quickGlyph}>⌖</Text></View>
            <Text style={styles.quickLabel}>Campus map</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => goTo("Study")} accessibilityRole="button" accessibilityLabel="Open study spaces">
            <View style={[styles.quickIcon, { backgroundColor: "#EDF2F6" }]}><Text style={styles.quickGlyph}>▤</Text></View>
            <Text style={styles.quickLabel}>Study spaces</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => goTo("Events")} accessibilityRole="button" accessibilityLabel="Open events">
            <View style={[styles.quickIcon, { backgroundColor: "#F7F0E0" }]}><Text style={styles.quickGlyph}>✳</Text></View>
            <Text style={styles.quickLabel}>What's on</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.askHomeCard}
          onPress={() => goTo("Ask")}
          accessibilityRole="button"
          accessibilityLabel="Ask UofG about information on the official University website"
        >
          <View style={styles.askHomeCopy}>
            <Text style={styles.askHomeTitle}>Need a hand?</Text>
            <Text style={styles.askHomeDescription}>Try the experimental AI assistant; verify important answers.</Text>
          </View>
          <Text style={styles.askHomeArrow}>Ask UofG →</Text>
        </Pressable>

        {noticeVisible ? (
          <View style={styles.inlineNotice}>
            <Text style={styles.noticeIcon}>i</Text>
            <Text style={styles.noticeText}>A lighter way to find your place at UofG.</Text>
            <Pressable onPress={() => setNoticeVisible(false)} accessibilityRole="button" accessibilityLabel="Dismiss message">
              <Text style={styles.noticeDismiss}>×</Text>
            </Pressable>
          </View>
        ) : null}

        {preferences.homeSections.includes("timetable") ? (
          <>
            <SectionTitle title="Your day" action="Full timetable" onAction={() => goTo("Timetable")} />
            {todayClasses.length ? (
              todayClasses.slice(0, 2).map((item) => <ClassCard key={item.id} item={item} compact />)
            ) : (
              <View style={styles.emptyCard}><Text style={styles.bodyMuted}>Nothing scheduled today. Enjoy the breathing room.</Text></View>
            )}
          </>
        ) : null}

        {preferences.homeSections.includes("study") ? (
          <>
            <SectionTitle title="Study nearby" action="See spaces" onAction={() => goTo("Study")} />
            <Pressable style={styles.nearbyCard} onPress={() => goTo("Study")} accessibilityRole="button">
              <View style={styles.nearbyIcon}><Text style={styles.nearbyGlyph}>▤</Text></View>
              <View style={styles.nearbyText}>
                <Text style={styles.nearbyTitle}>University Library</Text>
                <Text style={styles.bodyMuted}>Learning Hub · 2 min walk</Text>
              </View>
              <View style={styles.availableBadge}><Text style={styles.availableCount}>42</Text><Text style={styles.availableLabel}>sample</Text></View>
            </Pressable>
          </>
        ) : null}

        {preferences.homeSections.includes("saved") ? (
          <>
            <SectionTitle title="Saved places" action="Campus map" onAction={() => goTo("Map")} />
            {savedPlaces.length ? savedPlaces.map((placeId) => {
              const place = campusData.places.find((item) => item.id === placeId);
              return place ? (
                <Pressable key={place.id} style={styles.savedPlaceRow} onPress={() => { setSelectedPlace(place); goTo("Map"); }} accessibilityRole="button">
                  <Text style={styles.savedPlaceName}>{place.name}</Text>
                  <Text style={styles.bodyMuted}>{place.category} · {place.detail}</Text>
                </Pressable>
              ) : null;
            }) : <View style={styles.emptyCard}><Text style={styles.bodyMuted}>Save a place from the campus map to keep it close.</Text></View>}
          </>
        ) : null}

        <View style={styles.disclaimer}><Text style={styles.disclaimerText}>This preview uses sample campus information.</Text></View>
      </>
    );
  }

  function renderTimetable() {
    return (
      <>
        <View style={styles.pageIntro}>
          <Label>YOUR WEEK</Label>
          <Text accessibilityRole="header" style={styles.pageTitle}>Timetable</Text>
          <Text style={styles.pageSubtitle}>A clear view of what’s coming up · sample week</Text>
        </View>
        <View style={styles.weekNavigation}>
          <Pressable onPress={() => setWeekOffset((value) => value - 1)} accessibilityRole="button" accessibilityLabel="Previous week">
            <Text style={styles.weekArrow}>‹</Text>
          </Pressable>
          <Text style={styles.weekLabel}>
            {weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            {" – "}
            {new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 4).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
          <Pressable onPress={() => setWeekOffset((value) => value + 1)} accessibilityRole="button" accessibilityLabel="Next week">
            <Text style={styles.weekArrow}>›</Text>
          </Pressable>
        </View>
        <View style={styles.dayPicker}>
          {weekDays.map((day, index) => {
            const active = selectedDay === day;
            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                accessibilityRole="button"
                accessibilityLabel={new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index)
                  .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                accessibilityState={{ selected: active }}
                aria-pressed={active}
                style={[styles.dayItem, active && styles.dayItemActive]}
              >
                <Text style={[styles.dayLetter, active && styles.dayTextActive]}>{dayLetters[index]}</Text>
                <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index).getDate()}</Text>
                {campusData.timetable[day]?.length ? <View style={[styles.dayDot, active && styles.dayDotActive]} /> : <View style={styles.dayDotSpacer} />}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.dayTitleRow}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</Text>
          <Text style={styles.bodyMuted}>{classes.length} {classes.length === 1 ? "class" : "classes"}</Text>
        </View>
        {classes.length ? (
          classes.map((item) => {
            const reminderKey = `class:${localDateKey(selectedDate)}:${item.id}`;
            return (
              <ClassCard
                key={item.id}
                item={item}
                reminderEnabled={Boolean(reminders[reminderKey])}
                onReminder={() => toggleClassReminder(item)}
                onCalendar={() => addClassToCalendar(item)}
                onPlace={() => {
                  setMapSearch(item.place.split(",")[0]);
                  setPlaceFilter("All");
                  goTo("Map");
                }}
              />
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>☼</Text>
            <Text style={styles.emptyTitle}>A free day</Text>
            <Text style={styles.bodyMuted}>No classes scheduled. Make it yours.</Text>
          </View>
        )}
        <View style={styles.tipCard}><Text style={styles.tipTitle}>Getting around</Text><Text style={styles.tipBody}>Use the campus map to locate buildings and see sample lift information.</Text></View>
        <View style={styles.disclaimer}><Text style={styles.disclaimerText}>Sample timetable · not connected to MyCampus.</Text></View>
      </>
    );
  }

  function renderMap() {
    return (
      <>
        <View style={styles.pageIntro}>
          <Label>GILMOREHILL CAMPUS</Label>
          <Text accessibilityRole="header" style={styles.pageTitle}>Campus map</Text>
          <Text style={styles.pageSubtitle}>Search buildings, facilities and support services.</Text>
        </View>
        <TextInput
          value={mapSearch}
          onChangeText={setMapSearch}
          placeholder="Search places, access or facilities"
          placeholderTextColor={palette.muted}
          accessibilityLabel="Search campus directory"
          style={styles.searchField}
          returnKeyType="search"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapFilters}>
          {(["All", "Study", "Library", "Food", "Access", "Support", "Facilities"] as PlaceFilter[]).map((filter) => (
            <ActionButton
              key={filter}
              title={filter === "All" ? "All places" : filter}
              selected={placeFilter === filter}
              onPress={() => {
                setPlaceFilter(filter);
                if (filter !== "All") {
                  const firstMatch = campusData.places.find((place) => place.category === filter);
                  if (firstMatch) setSelectedPlace(firstMatch);
                }
              }}
            />
          ))}
        </ScrollView>
        {displayedPlaces.length ? (
          <>
            <CampusMap
              places={displayedPlaces}
              selectedPlaceId={selectedPlace.id}
              onSelectPlace={setSelectedPlace}
              reducedMotion={preferences.reducedMotion || systemReducedMotion}
            />
            <View style={styles.mapLegend}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: palette.universityBlue }]} /><Text style={styles.legendText}>Selected</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "#B9CDBE" }]} /><Text style={styles.legendText}>Campus places</Text></View>
              <Text style={styles.sampleTagLight}>{Platform.OS === "web" ? "OPENSTREETMAP" : "APPROX. PINS"}</Text>
            </View>
            <View style={styles.placeCard}>
              <View style={styles.placeIcon}><Text style={styles.placeIconText}>{selectedPlace.category === "Food" ? "F" : selectedPlace.category === "Library" ? "L" : selectedPlace.category === "Access" ? "↗" : "S"}</Text></View>
              <View style={styles.placeCopy}>
                <Text style={styles.eventCategory}>{selectedPlace.category.toUpperCase()}</Text>
                <Text style={styles.placeTitle}>{selectedPlace.name}</Text>
                <Text style={styles.bodyMuted}>{selectedPlace.detail}</Text>
                <Text style={styles.placeInfo}>Hours: {selectedPlace.openingHours}</Text>
                <Text style={styles.placeInfo}>Access: {selectedPlace.accessibility}</Text>
                <Text style={styles.placeInfo}>Facilities: {selectedPlace.facilities.join(" · ")}</Text>
                {selectedPlace.category === "Support" ? <Text style={styles.placeInfo}>Contact: not supplied in this sample listing</Text> : null}
                {selectedPlace.lifts ? <Text style={styles.liftText}>↕  Lift access shown in sample listing</Text> : null}
              </View>
              <Pressable
                onPress={() => toggleValue(savedPlaces, selectedPlace.id, setSavedPlaces)}
                accessibilityRole="button"
                accessibilityLabel={savedPlaces.includes(selectedPlace.id) ? `Remove ${selectedPlace.name} from saved places` : `Save ${selectedPlace.name}`}
                accessibilityState={{ selected: savedPlaces.includes(selectedPlace.id) }}
                aria-pressed={savedPlaces.includes(selectedPlace.id)}
                style={styles.bookmarkButton}
              >
                <Text style={[styles.bookmark, savedPlaces.includes(selectedPlace.id) && styles.bookmarkActive]}>
                  {savedPlaces.includes(selectedPlace.id) ? "♥" : "♡"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open directions to ${selectedPlace.name} in Google Maps`}
                style={styles.directionsLink}
                onPress={() => {
                  const destination = `${selectedPlace.latitude},${selectedPlace.longitude}`;
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
                  void openExternal(url);
                }}
              >
                <Text style={styles.directionsLinkText}>Directions</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}><Text style={styles.bodyMuted}>No campus places match that search and filter.</Text></View>
        )}
        <SectionTitle title="Campus directory" />
        <View style={styles.directoryControls}>
          <TextInput
            value={facilitySearch}
            onChangeText={setFacilitySearch}
            placeholder="Filter directory"
            placeholderTextColor={palette.muted}
            accessibilityLabel="Filter campus directory results"
            style={[styles.searchField, styles.directorySearch]}
          />
          <Pressable
            onPress={() => setDirectoryAccessOnly((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel="Show step-free campus places only"
            accessibilityState={{ selected: directoryAccessOnly }}
            aria-pressed={directoryAccessOnly}
            style={[styles.studyFilterButton, directoryAccessOnly && styles.studyFilterButtonActive]}
          >
            <Text style={[styles.filterTextMuted, directoryAccessOnly && styles.studyFilterTextActive]}>Step-free</Text>
          </Pressable>
        </View>
        {campusData.places.filter((place) => (
          (!directoryAccessOnly || /step-free|lift access/i.test(place.accessibility))
          && (!facilitySearch.trim() || [
            place.name, place.category, place.detail, place.accessibility, ...place.facilities,
          ].join(" ").toLocaleLowerCase().includes(facilitySearch.trim().toLocaleLowerCase()))
        )).map((place) => (
          <Pressable
            key={place.id}
            style={styles.directoryRow}
            onPress={() => {
              setSelectedPlace(place);
              setPlaceFilter("All");
              setMapSearch("");
            }}
            accessibilityRole="button"
            accessibilityHint="Select this place and show its location on the map."
          >
            <View style={styles.directoryCopy}>
              <Text style={styles.directoryName}>{place.name}</Text>
              <Text style={styles.bodyMuted}>{place.category} · {place.detail}</Text>
              <Text style={styles.placeInfo}>{place.facilities.slice(0, 3).join(" · ")}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
        <View style={styles.disclaimer}><Text style={styles.disclaimerText}>{Platform.OS === "web" ? "OpenStreetMap · approximate pins · sample directory information" : `Map tiles by ${Platform.OS === "android" ? "Google Maps" : "Apple Maps"} · approximate pins · sample directory information`} · verify routes, hours and access before travelling.</Text></View>
      </>
    );
  }

  function renderStudy() {
    return (
      <>
        <View style={styles.pageIntro}>
          <Label>MAKE ROOM TO THINK</Label>
          <Text accessibilityRole="header" style={styles.pageTitle}>Study spaces</Text>
          <Text style={styles.pageSubtitle}>Find a spot that suits the way you work.</Text>
        </View>
        <View style={styles.capacitySummary}>
          <View style={styles.summaryIcon}><Text style={styles.summaryIconText}>◉</Text></View>
          <View style={styles.summaryCopy}><Text style={styles.summaryTitle}>Campus study spaces</Text><Text style={styles.summarySubtitle}>Sample counts · not live</Text></View>
          <View style={styles.summaryCount}><Text style={styles.summaryNumber}>{campusData.studySpaces.length}</Text><Text style={styles.summarySmall}>spaces</Text></View>
        </View>
        <TextInput
          value={studySearch}
          onChangeText={setStudySearch}
          placeholder="Search spaces, buildings or facilities"
          placeholderTextColor={palette.muted}
          accessibilityLabel="Search study spaces"
          style={styles.searchField}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(["All", "Quiet", "Group"] as const).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setStudyFilter(filter)}
              accessibilityRole="button"
              accessibilityState={{ selected: studyFilter === filter }}
              aria-pressed={studyFilter === filter}
              style={[styles.studyFilterButton, studyFilter === filter && styles.studyFilterButtonActive]}
            >
              <Text style={[styles.filterTextMuted, studyFilter === filter && styles.studyFilterTextActive]}>
                {filter === "All" ? "All spaces" : filter}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setStepFreeOnly((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ selected: stepFreeOnly }}
            aria-pressed={stepFreeOnly}
            style={[styles.studyFilterButton, stepFreeOnly && styles.studyFilterButtonActive]}
          >
            <Text style={[styles.filterTextMuted, stepFreeOnly && styles.studyFilterTextActive]}>Step-free</Text>
          </Pressable>
          <Pressable
            onPress={() => setSavedSpacesOnly((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ selected: savedSpacesOnly }}
            aria-pressed={savedSpacesOnly}
            style={[styles.studyFilterButton, savedSpacesOnly && styles.studyFilterButtonActive]}
          >
            <Text style={[styles.filterTextMuted, savedSpacesOnly && styles.studyFilterTextActive]}>Saved</Text>
          </Pressable>
          <Pressable
            onPress={() => setOpenSpacesOnly((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ selected: openSpacesOnly }}
            aria-pressed={openSpacesOnly}
            style={[styles.studyFilterButton, openSpacesOnly && styles.studyFilterButtonActive]}
          >
            <Text style={[styles.filterTextMuted, openSpacesOnly && styles.studyFilterTextActive]}>Open now · sample</Text>
          </Pressable>
        </ScrollView>
        {filteredStudySpaces.map((space) => {
          const saved = savedSpaces.includes(space.id);
          return (
            <View key={space.id} style={styles.spaceCard}>
              <View style={styles.spaceCardTop}>
                <View style={styles.spaceSymbol}><Text style={styles.spaceSymbolText}>▤</Text></View>
                <View style={styles.spaceCopy}>
                  <Text style={styles.spaceBuilding}>{space.building.toUpperCase()}</Text>
                  <Text style={styles.spaceName}>{space.name}</Text>
                  <Text style={styles.bodyMuted}>{space.level} · {space.walk} walk</Text>
                  <Text style={styles.placeInfo}>{space.openingHours}</Text>
                </View>
                <Pressable
                  onPress={() => toggleValue(savedSpaces, space.id, setSavedSpaces)}
                  accessibilityRole="button"
                  accessibilityLabel={saved ? `Remove ${space.name} from saved study spaces` : `Save ${space.name}`}
                  accessibilityState={{ selected: saved }}
                  aria-pressed={saved}
                  style={styles.bookmarkButton}
                >
                  <Text style={[styles.bookmark, saved && styles.bookmarkActive]}>{saved ? "♥" : "♡"}</Text>
                </Pressable>
              </View>
              <View style={styles.spaceCapacityRow}>
                <Text style={styles.spaceAvailable}>{space.available} <Text style={styles.spaceAvailableSuffix}>sample available</Text></Text>
                <Text style={styles.spaceQuiet}>{space.quiet ? "QUIET" : "COLLABORATIVE"}</Text>
              </View>
              <Text style={styles.placeInfo}>{space.facilities.join(" · ")}{space.stepFree ? " · Step-free listing" : ""}</Text>
              <CapacityBar available={space.available} total={space.total} />
            </View>
          );
        })}
        {!filteredStudySpaces.length ? <View style={styles.emptyCard}><Text style={styles.bodyMuted}>No sample spaces match those filters.</Text></View> : null}
        <View style={styles.tipCard}><Text style={styles.tipTitle}>Availability and booking</Text><Text style={styles.tipBody}>Capacity, opening times, facilities and access notes are sample listings—not live occupancy, confirmed venue information, bookings or seat reservations. We need an approved University data source before adding real-time booking.</Text></View>
      </>
    );
  }

  function renderEvents() {
    return (
      <>
        <View style={styles.pageIntro}>
          <Label>THERE’S ALWAYS SOMETHING ON</Label>
          <Text accessibilityRole="header" style={styles.pageTitle}>Events</Text>
          <Text style={styles.pageSubtitle}>Find your people, try something new.</Text>
        </View>
        <View style={styles.eventHero}>
          <Text style={styles.eventHeroEyebrow}>MAKE THE MOST OF UofG</Text>
          <Text style={styles.eventHeroTitle}>Your next favourite thing is out there.</Text>
          <Text style={styles.eventHeroBody}>Explore student life, careers and wellbeing across campus.</Text>
          <View style={styles.eventHeroShape} />
        </View>
        <View style={styles.tipCard}>
          <Text accessibilityRole="header" style={styles.tipTitle}>Event data unavailable</Text>
          <Text accessibilityLiveRegion="polite" style={styles.tipBody}>{universityEvents.message}</Text>
          <Text style={styles.tipBody}>No event data is cached. This app does not automatically refresh University listings.</Text>
          <ActionButton title="Browse official University events" onPress={() => void openExternal(universityEvents.listingsUrl)} />
        </View>
        <TextInput
          value={eventSearch}
          onChangeText={setEventSearch}
          placeholder="Search events, topics or places"
          placeholderTextColor={palette.muted}
          accessibilityLabel="Search events"
          style={styles.searchField}
        />
        <View style={styles.eventFilters}>
          {[
            ["ALL", "All"],
            ...Array.from(new Set(campusData.events.map((event) => event.category))).map((category) => [category, category[0] + category.slice(1).toLowerCase()]),
          ].map(([filter, label]) => (
            <ActionButton
              key={filter}
              title={label}
              selected={eventFilter === filter}
              onPress={() => setEventFilter(filter)}
            />
          ))}
        </View>
        <View style={styles.eventOptions}>
          <Pressable
            onPress={() => setEventDateFilter((value) => value === "UPCOMING" ? "WEEK" : "UPCOMING")}
            accessibilityRole="button"
            accessibilityState={{ selected: eventDateFilter === "WEEK" }}
            aria-pressed={eventDateFilter === "WEEK"}
            style={[styles.studyFilterButton, eventDateFilter === "WEEK" && styles.studyFilterButtonActive]}
          >
            <Text style={[styles.filterTextMuted, eventDateFilter === "WEEK" && styles.studyFilterTextActive]}>
              {eventDateFilter === "WEEK" ? "Next 7 days" : "All upcoming"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSavedEventsOnly((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ selected: savedEventsOnly }}
            aria-pressed={savedEventsOnly}
            style={[styles.studyFilterButton, savedEventsOnly && styles.studyFilterButtonActive]}
          >
            <Text style={[styles.filterTextMuted, savedEventsOnly && styles.studyFilterTextActive]}>
              {savedEventsOnly ? "♥ Saved only" : "Saved"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.eventListHeading}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Coming up</Text>
          <Text style={styles.eventCount}>{displayedEvents.length} EVENTS</Text>
        </View>
        {displayedEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            saved={savedEvents.includes(event.id)}
            reminderEnabled={Boolean(reminders[`event:${event.id}`])}
            onSave={() => toggleValue(savedEvents, event.id, setSavedEvents)}
            onReminder={() => toggleEventReminder(event)}
            onCalendar={() => addEventToCalendar(event)}
          />
        ))}
        {!displayedEvents.length ? <View style={styles.emptyCard}><Text style={styles.bodyMuted}>No event listings are connected. Search and saved filters will be available when a source is connected.</Text></View> : null}
        <View style={styles.disclaimer}><Text style={styles.disclaimerText}>University of Glasgow · open the official listings for current dates, venues and booking information.</Text></View>
      </>
    );
  }

  function renderSettings() {
    const homeOptions: { id: HomeSection; title: string; description: string }[] = [
      { id: "timetable", title: "Timetable", description: "Show today’s classes on Home." },
      { id: "study", title: "Study spaces", description: "Show a nearby study suggestion." },
      { id: "saved", title: "Saved places", description: "Keep your bookmarked campus places close." },
    ];

    return (
      <>
        <View style={styles.pageIntro}>
          <Label>YOUR APP, YOUR WAY</Label>
          <Text accessibilityRole="header" style={styles.pageTitle}>Settings</Text>
          <Text style={styles.pageSubtitle}>Preferences are saved on this device.</Text>
        </View>
        <Text accessibilityRole="header" style={styles.settingsSectionTitle}>Your profile</Text>
        <View style={styles.settingsCard}>
          <Text style={styles.settingTitle}>Name shown on Home</Text>
          <TextInput
            value={preferences.displayName}
            onChangeText={(displayName) => updatePreferences({ displayName: displayName.slice(0, 32) })}
            placeholder="Your name"
            placeholderTextColor={palette.muted}
            accessibilityLabel="Name shown on the home screen"
            style={styles.searchField}
            maxLength={32}
          />
          <Text style={styles.settingsHint}>This name stays on this device; no account or sign-in is required.</Text>
        </View>

        <Text accessibilityRole="header" style={styles.settingsSectionTitle}>Home screen</Text>
        <View style={styles.settingsCard}>
          {homeOptions.map((option) => (
            <SettingToggle
              key={option.id}
              title={option.title}
              description={option.description}
              value={preferences.homeSections.includes(option.id)}
              onChange={() => {
                const next = preferences.homeSections.includes(option.id)
                  ? preferences.homeSections.filter((item) => item !== option.id)
                  : [...preferences.homeSections, option.id];
                updatePreferences({ homeSections: next });
              }}
            />
          ))}
          <Text style={styles.settingsHint}>Quick links and your next class remain available on Home.</Text>
        </View>

        <Text accessibilityRole="header" style={styles.settingsSectionTitle}>Accessibility</Text>
        <View style={styles.settingsCard}>
          <SettingToggle
            title="Larger text"
            description="Increase text size across the app."
            value={preferences.largerText}
            onChange={() => updatePreferences({ largerText: !preferences.largerText })}
          />
          <SettingToggle
            title="Higher contrast"
            description="Darken muted text for easier reading."
            value={preferences.highContrast}
            onChange={() => updatePreferences({ highContrast: !preferences.highContrast })}
          />
          <SettingToggle
            title="Reduce motion"
            description="Disable animated map zoom and fitting; your device motion-reduction setting is always respected."
            value={preferences.reducedMotion}
            onChange={() => updatePreferences({ reducedMotion: !preferences.reducedMotion })}
          />
        </View>

        <Text accessibilityRole="header" style={styles.settingsSectionTitle}>Reminders</Text>
        <View style={styles.settingsCard}>
          <Text style={styles.settingTitle}>Class reminder lead time</Text>
          <View style={styles.reminderChoices}>
            {[5, 10, 15].map((minutes) => (
              <ActionButton
                key={minutes}
                title={`${minutes} min`}
                selected={preferences.classReminderMinutes === minutes}
                onPress={() => updatePreferences({ classReminderMinutes: minutes })}
              />
            ))}
          </View>
          <SettingToggle
            title="Event reminders"
            description={Platform.OS === "web"
              ? "Browser reminders work while this tab remains open."
              : "Allow local reminders for events you choose."}
            value={preferences.eventRemindersEnabled}
            onChange={() => { void toggleEventReminderSetting(); }}
          />
          <Text style={styles.settingsHint}>Reminders are scheduled on this device. They do not depend on a UofG account or send data to a server.</Text>
        </View>

        <Text accessibilityRole="header" style={styles.settingsSectionTitle}>Offline and data</Text>
        <View style={styles.settingsCard}>
          <Text style={styles.settingsParagraph}>The sample timetable, campus directory and study listings are bundled with this prototype. Saved preferences stay on this device. OpenStreetMap tiles and external calendar links need an internet connection.</Text>
          <Text style={styles.settingsParagraph}>No approved UofG timetable, occupancy, booking or events API is configured. Live account sign-in, live capacity and real room bookings are not available. The app’s data-source interface is ready for a University-approved integration.</Text>
          <Text style={styles.settingsHint}>Sample hours, capacity and access notes are not verified. Events are unavailable in the app; use the official University listings.</Text>
        </View>
      </>
    );
  }

  function renderDiscover() {
    return (
      <DiscoverScreen
        savedResearch={savedResearch}
        interests={researchInterests}
        largerText={preferences.largerText}
        highContrast={preferences.highContrast}
        onToggleSaved={(record) => setSavedResearch((current) => (
          current.some((item) => item.id === record.id)
            ? current.filter((item) => item.id !== record.id)
            : [record, ...current].slice(0, 100)
        ))}
        onInterestsChange={setResearchInterests}
      />
    );
  }

  function renderAsk() {
    return (
      <AskUofGScreen
        largerText={preferences.largerText}
        highContrast={preferences.highContrast}
        onError={setActionMessage}
      />
    );
  }

  let content: ReactNode;
  switch (tab) {
    case "Timetable": content = renderTimetable(); break;
    case "Map": content = renderMap(); break;
    case "Study": content = renderStudy(); break;
    case "Discover": content = renderDiscover(); break;
    case "Ask": content = renderAsk(); break;
    case "Events": content = renderEvents(); break;
    case "Settings": content = renderSettings(); break;
    default: content = renderHome();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appHeader}>
        <Pressable style={styles.appLogo} onPress={() => goTo("Home")} accessibilityRole="button" accessibilityLabel="University of Glasgow home">
          <Image
            source={require("./assets/branding/uofg-logo-unboxed-blue.png")}
            style={styles.appLogoImage}
            resizeMode="contain"
            accessibilityLabel="University of Glasgow"
          />
        </Pressable>
        <Pressable style={styles.headerAskButton} onPress={() => goTo("Ask")} accessibilityRole="button" accessibilityLabel="Ask UofG AI assistant">
          <Text style={styles.headerAskText}>Ask</Text>
        </Pressable>
        <Pressable style={styles.headerButton} onPress={() => goTo("Settings")} accessibilityRole="button" accessibilityLabel="Open settings">
          <Text style={styles.headerBell}>⚙</Text>
        </Pressable>
      </View>
      <ScrollView
        accessibilityLabel={`${tab} screen content`}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {storageError ? <View style={styles.errorNotice} accessibilityRole="alert"><Text style={styles.errorText}>{storageError}</Text></View> : null}
        {actionMessage ? (
          <View style={styles.inlineNotice} accessibilityRole="alert" accessibilityLiveRegion="polite" aria-live="polite">
            <Text style={styles.noticeText}>{actionMessage}</Text>
            <Pressable onPress={() => setActionMessage("")} accessibilityRole="button" accessibilityLabel="Dismiss notification" style={styles.dismissAction}>
              <Text style={styles.noticeDismiss}>×</Text>
            </Pressable>
          </View>
        ) : null}
        {content}
      </ScrollView>
      <View style={styles.tabBar} accessibilityRole="tablist" accessibilityLabel="Main navigation">
        {tabs.map((item) => {
          const active = tab === item.name;
          return (
            <Pressable
              key={item.name}
              onPress={() => goTo(item.name)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.name}
              aria-selected={active}
              style={styles.tabItem}
            >
              <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{item.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.name}</Text>
              {active ? <View style={styles.tabIndicator} /> : null}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.paper },
  appHeader: { height: 84, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: palette.white, borderBottomWidth: 1, borderBottomColor: palette.line },
  appLogo: { width: 148, height: 80, justifyContent: "center" },
  appLogoImage: { width: 148, height: 80 },
  headerButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.line },
  headerAskButton: { minWidth: 48, height: 44, paddingHorizontal: 8, borderRadius: 14, backgroundColor: palette.paleBlue, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.universityBlue },
  headerAskText: { color: palette.universityBlue, fontSize: 12, fontWeight: "700" },
  headerBell: { fontSize: 23, color: palette.ink, lineHeight: 28 },
  headerBadge: { position: "absolute", right: 8, top: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: palette.gold, borderWidth: 1, borderColor: palette.white },
  scrollContent: { paddingHorizontal: 21, paddingTop: 18, paddingBottom: 34 },
  greetingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 21 },
  greeting: { color: palette.ink, fontFamily: "NotoSerif_700Bold", fontSize: 25, fontWeight: "700", letterSpacing: -0.7 },
  wave: { color: palette.sky, fontSize: 18 },
  dateText: { marginTop: 4, color: palette.muted, fontSize: 13 },
  avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#E1EDF4", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, color: palette.navy, fontWeight: "700" },
  heroCard: { overflow: "hidden", borderRadius: 22, backgroundColor: palette.navy, minHeight: 223, padding: 20, marginBottom: 19, borderTopWidth: 3, borderTopColor: palette.sky },
  heroTopline: { flexDirection: "row", alignItems: "center", marginBottom: 23 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.sky, marginRight: 7 },
  heroEyebrow: { color: "#D4E4EE", fontSize: 9, fontWeight: "700", letterSpacing: 1.25 },
  sampleTag: { marginLeft: "auto", color: "#D4E4EE", fontSize: 8, letterSpacing: 1, fontWeight: "700", borderColor: "#54748B", borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  heroCaption: { color: palette.sky, fontSize: 9, fontWeight: "700", letterSpacing: 1.4, marginBottom: 6 },
  heroTitle: { color: palette.white, fontFamily: "NotoSerif_700Bold", fontSize: 21, fontWeight: "700", letterSpacing: -0.35, maxWidth: "88%" },
  heroLocationRow: { flexDirection: "row", alignItems: "center", marginTop: 9 },
  heroPin: { color: palette.sky, fontSize: 17, marginRight: 6 },
  heroLocation: { color: "#D7E4EC", fontSize: 12, maxWidth: "88%" },
  directionsButton: { alignSelf: "flex-start", backgroundColor: palette.white, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9, marginTop: 16 },
  directionsText: { color: palette.navy, fontSize: 11, fontWeight: "700" },
  buttonArrow: { color: palette.navy, fontSize: 15 },
  heroDecorOne: { position: "absolute", width: 180, height: 180, borderRadius: 90, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", right: -77, bottom: -112 },
  heroDecorTwo: { position: "absolute", width: 124, height: 124, borderRadius: 62, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", right: -49, bottom: -83 },
  quickActions: { flexDirection: "row", justifyContent: "space-between", marginBottom: 19 },
  askHomeCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderLeftWidth: 3, borderLeftColor: palette.sky, borderRadius: 13, marginBottom: 16 },
  askHomeCopy: { flex: 1 },
  askHomeTitle: { color: palette.ink, fontSize: 13, fontWeight: "700" },
  askHomeDescription: { color: palette.muted, fontSize: 11, marginTop: 3 },
  askHomeArrow: { color: palette.universityBlue, fontSize: 11, fontWeight: "700" },
  quickAction: { alignItems: "center", width: "24%" },
  quickIcon: { width: 51, height: 51, borderRadius: 17, alignItems: "center", justifyContent: "center", marginBottom: 7, borderWidth: 1, borderColor: "rgba(1,20,81,0.06)" },
  quickGlyph: { color: palette.universityBlue, fontSize: 24, fontWeight: "600" },
  quickLabel: { color: "#4E6272", fontSize: 10, fontWeight: "600", textAlign: "center" },
  inlineNotice: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 11, borderRadius: 11, backgroundColor: "#E9F1F6", marginBottom: 24 },
  noticeIcon: { width: 17, height: 17, borderRadius: 9, textAlign: "center", color: palette.universityBlue, backgroundColor: "#D5E6F0", fontSize: 12, fontWeight: "700", marginRight: 8, overflow: "hidden" },
  noticeText: { color: "#4E6272", fontSize: 10, flex: 1 },
  noticeDismiss: { color: palette.ink, fontSize: 18 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11, marginTop: 1 },
  sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: "700", letterSpacing: -0.2 },
  link: { color: palette.universityBlue, fontSize: 11, fontWeight: "700" },
  savedPlaceRow: { padding: 13, backgroundColor: palette.white, borderRadius: 13, borderWidth: 1, borderColor: palette.line, marginBottom: 8 },
  savedPlaceName: { color: palette.ink, fontSize: 12, fontWeight: "700" },
  classCard: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", padding: 15, backgroundColor: palette.white, borderRadius: 14, borderWidth: 1, borderColor: palette.line, marginBottom: 10 },
  classCardCompact: { paddingVertical: 12 },
  classTime: { alignItems: "flex-start", width: 47 },
  classStart: { color: palette.ink, fontWeight: "700", fontSize: 13 },
  classEnd: { color: palette.muted, fontSize: 10, marginTop: 4 },
  classDivider: { width: 2, height: 42, backgroundColor: "#A9DDEE", borderRadius: 1, marginHorizontal: 12 },
  classInfo: { flex: 1 },
  classActions: { width: "100%", flexDirection: "row", gap: 18, paddingLeft: 60, marginTop: 10 },
  locationLink: { color: palette.universityBlue, fontSize: 10, marginTop: 4, textDecorationLine: "underline" },
  inlineAction: { color: palette.universityBlue, fontSize: 10, fontWeight: "700" },
  classKind: { color: palette.universityBlue, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  className: { color: palette.ink, fontSize: 12, fontWeight: "700", marginTop: 3 },
  bodyMuted: { color: palette.muted, fontSize: 10, marginTop: 4 },
  classDetail: { color: palette.muted, fontSize: 10, marginTop: 3 },
  chevron: { color: "#A6B0AA", fontSize: 24, marginLeft: 8 },
  emptyCard: { padding: 16, borderRadius: 13, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, marginBottom: 19 },
  nearbyCard: { flexDirection: "row", alignItems: "center", backgroundColor: palette.white, borderRadius: 15, borderWidth: 1, borderColor: palette.line, padding: 12, marginBottom: 18 },
  nearbyIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: palette.paleBlue, alignItems: "center", justifyContent: "center", marginRight: 11 },
  nearbyGlyph: { color: palette.universityBlue, fontSize: 20 },
  nearbyText: { flex: 1 },
  nearbyTitle: { color: palette.ink, fontSize: 12, fontWeight: "700" },
  availableBadge: { alignItems: "center", backgroundColor: palette.paleBlue, borderRadius: 10, minWidth: 44, paddingHorizontal: 7, paddingVertical: 5 },
  availableCount: { color: palette.universityBlue, fontSize: 14, fontWeight: "800" },
  availableLabel: { color: palette.universityBlue, fontSize: 8, fontWeight: "600" },
  disclaimer: { alignItems: "center", paddingVertical: 11 },
  disclaimerText: { color: palette.muted, fontSize: 9, textAlign: "center" },
  pageIntro: { marginBottom: 18 },
  label: { color: palette.universityBlue, fontSize: 9, fontWeight: "800", letterSpacing: 1.4, marginBottom: 6 },
  pageTitle: { color: palette.ink, fontFamily: "NotoSerif_700Bold", fontSize: 27, fontWeight: "700", letterSpacing: -0.7 },
  pageSubtitle: { color: palette.muted, fontSize: 12, marginTop: 5 },
  dayPicker: { flexDirection: "row", backgroundColor: palette.white, borderRadius: 15, borderWidth: 1, borderColor: palette.line, padding: 6, justifyContent: "space-between", marginBottom: 21 },
  weekNavigation: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingHorizontal: 8 },
  weekArrow: { color: palette.universityBlue, fontSize: 28, lineHeight: 32, paddingHorizontal: 12 },
  weekLabel: { color: palette.ink, fontSize: 11, fontWeight: "700" },
  dayItem: { width: "19%", minHeight: 67, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  dayItemActive: { backgroundColor: palette.universityBlue },
  dayLetter: { color: palette.muted, fontSize: 10, fontWeight: "600" },
  dayNumber: { color: palette.ink, fontSize: 16, fontWeight: "700", marginTop: 5 },
  dayTextActive: { color: palette.white },
  dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: palette.sky, marginTop: 4 },
  dayDotActive: { backgroundColor: "#B9EAF5" },
  dayDotSpacer: { height: 8 },
  dayTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11 },
  emptyState: { backgroundColor: palette.white, borderRadius: 16, borderWidth: 1, borderColor: palette.line, paddingVertical: 37, alignItems: "center", marginTop: 3 },
  emptyIcon: { fontSize: 29, color: palette.gold, marginBottom: 7 },
  emptyTitle: { color: palette.ink, fontSize: 16, fontWeight: "700" },
  tipCard: { padding: 15, borderRadius: 14, backgroundColor: "#E9F1F6", marginTop: 15, borderLeftWidth: 3, borderLeftColor: palette.sky },
  tipTitle: { color: palette.navy, fontSize: 12, fontWeight: "700", marginBottom: 5 },
  tipBody: { color: palette.muted, fontSize: 10, lineHeight: 16 },
  mapFilters: { flexDirection: "row", gap: 7, marginBottom: 13 },
  searchField: { minHeight: 43, borderRadius: 12, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 12, paddingVertical: 9, color: palette.ink, fontSize: 11, marginBottom: 12 },
  actionButton: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: "#E2E8E3", backgroundColor: palette.white, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7 },
  actionButtonSelected: { backgroundColor: palette.universityBlue, borderColor: palette.universityBlue },
  actionButtonText: { color: "#526777", fontSize: 11, fontWeight: "600" },
  actionButtonTextSelected: { color: palette.white },
  mapLegend: { flexDirection: "row", alignItems: "center", gap: 13, marginVertical: 11 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: palette.muted, fontSize: 9 },
  sampleTagLight: { color: "#526777", fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginLeft: "auto" },
  placeCard: { flexDirection: "row", alignItems: "center", backgroundColor: palette.white, borderRadius: 15, borderWidth: 1, borderColor: palette.line, padding: 13 },
  directionsLink: { backgroundColor: palette.universityBlue, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, marginLeft: 8 },
  directionsLinkText: { color: palette.white, fontSize: 9, fontWeight: "700" },
  placeIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: palette.paleBlue, alignItems: "center", justifyContent: "center", marginRight: 11 },
  placeIconText: { color: palette.universityBlue, fontSize: 16, fontWeight: "800" },
  placeCopy: { flex: 1 },
  placeInfo: { color: palette.muted, fontSize: 9, lineHeight: 14, marginTop: 4 },
  placeTitle: { color: palette.ink, fontSize: 13, fontWeight: "700", marginTop: 2 },
  directoryControls: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  directorySearch: { flex: 1, marginBottom: 0 },
  directoryRow: { flexDirection: "row", alignItems: "center", backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 12, padding: 12, marginBottom: 8 },
  directoryCopy: { flex: 1 },
  directoryName: { color: palette.ink, fontSize: 12, fontWeight: "700" },
  liftText: { color: palette.universityBlue, fontSize: 9, fontWeight: "600", marginTop: 7 },
  capacitySummary: { backgroundColor: palette.navy, borderTopWidth: 3, borderTopColor: palette.sky, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 17 },
  summaryIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.13)", alignItems: "center", justifyContent: "center", marginRight: 11 },
  summaryIconText: { color: palette.sky, fontSize: 20 },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: palette.white, fontSize: 12, fontWeight: "700" },
  summarySubtitle: { color: "#C6D9E5", fontSize: 9, marginTop: 4 },
  summaryCount: { alignItems: "center", paddingLeft: 9 },
  summaryNumber: { color: palette.white, fontSize: 20, fontWeight: "800" },
  summarySmall: { color: "#C6D9E5", fontSize: 8 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  filterTextMuted: { color: palette.muted, fontSize: 10 },
  studyFilterButton: { minHeight: 44, justifyContent: "center", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8E3", backgroundColor: palette.white, paddingHorizontal: 11, paddingVertical: 7 },
  studyFilterButtonActive: { backgroundColor: "#E7F1F8", borderColor: "#BED6E5" },
  studyFilterTextActive: { color: palette.universityBlue, fontWeight: "700" },
  spaceCard: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 15, padding: 14, marginBottom: 10 },
  spaceCardTop: { flexDirection: "row", alignItems: "center" },
  spaceSymbol: { width: 41, height: 41, borderRadius: 13, backgroundColor: "#E7F1F8", alignItems: "center", justifyContent: "center", marginRight: 10 },
  spaceSymbolText: { color: palette.universityBlue, fontSize: 20 },
  spaceCopy: { flex: 1 },
  spaceBuilding: { color: palette.universityBlue, fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  spaceName: { color: palette.ink, fontSize: 13, fontWeight: "700", marginTop: 3 },
  eventFilters: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 10 },
  eventOptions: { flexDirection: "row", gap: 8, marginBottom: 14 },
  bookmarkButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  bookmark: { color: "#8B9991", fontSize: 23 },
  bookmarkActive: { color: "#B6534D" },
  spaceCapacityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 8 },
  spaceAvailable: { color: palette.ink, fontSize: 12, fontWeight: "800" },
  spaceAvailableSuffix: { color: palette.muted, fontSize: 10, fontWeight: "400" },
  spaceQuiet: { color: palette.muted, fontSize: 7, fontWeight: "800", letterSpacing: 0.8, backgroundColor: "#F1F4F1", paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5 },
  capacityTrack: { height: 5, backgroundColor: "#EDF0ED", borderRadius: 4, overflow: "hidden" },
  capacityFill: { height: "100%", borderRadius: 4 },
  eventHero: { backgroundColor: "#E8F3F8", borderRadius: 18, padding: 18, marginBottom: 22, minHeight: 150, overflow: "hidden", borderLeftWidth: 3, borderLeftColor: palette.sky },
  eventHeroEyebrow: { color: palette.universityBlue, fontSize: 8, fontWeight: "800", letterSpacing: 1.3 },
  eventHeroTitle: { color: palette.navy, fontFamily: "NotoSerif_700Bold", fontSize: 20, fontWeight: "700", maxWidth: "77%", marginTop: 9, letterSpacing: -0.3 },
  eventHeroBody: { color: palette.muted, fontSize: 10, lineHeight: 15, maxWidth: "75%", marginTop: 6 },
  eventHeroShape: { position: "absolute", width: 103, height: 103, borderRadius: 52, borderWidth: 17, borderColor: "rgba(77,187,198,0.15)", right: -24, bottom: -30 },
  eventListHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11 },
  eventCount: { color: palette.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  eventCard: { flexDirection: "row", backgroundColor: palette.white, borderRadius: 15, borderWidth: 1, borderColor: palette.line, padding: 13, marginBottom: 10 },
  eventDate: { width: 47, height: 54, borderRadius: 12, backgroundColor: "#E7F1F8", alignItems: "center", justifyContent: "center", marginRight: 11 },
  eventDay: { color: palette.navy, fontSize: 19, fontWeight: "800" },
  eventMonth: { color: palette.universityBlue, fontSize: 7, fontWeight: "800", letterSpacing: 1 },
  eventCopy: { flex: 1 },
  eventCategory: { color: palette.universityBlue, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  eventTitle: { color: palette.ink, fontSize: 13, fontWeight: "700", marginTop: 3 },
  eventDescription: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 7 },
  eventActions: { flexDirection: "row", gap: 14, marginTop: 11 },
  smallButton: { alignSelf: "flex-start", borderWidth: 1, borderColor: "#D2E0EA", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, marginTop: 9 },
  smallButtonSelected: { backgroundColor: "#E7F1F8", borderColor: "#BED6E5" },
  smallButtonText: { color: palette.universityBlue, fontSize: 9, fontWeight: "700" },
  smallButtonTextSelected: { color: palette.navy },
  settingsSectionTitle: { color: palette.universityBlue, fontSize: 11, fontWeight: "800", letterSpacing: 0.7, marginTop: 13, marginBottom: 8 },
  settingsCard: { padding: 14, backgroundColor: palette.white, borderRadius: 14, borderWidth: 1, borderColor: palette.line, marginBottom: 8 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 56, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#EEF1F3" },
  settingCopy: { flex: 1, paddingRight: 12 },
  settingTitle: { color: palette.ink, fontSize: 12, fontWeight: "700", marginBottom: 3 },
  switchTrack: { width: 42, height: 24, borderRadius: 12, backgroundColor: "#D7E0E6", justifyContent: "center", padding: 3 },
  switchTrackActive: { backgroundColor: palette.universityBlue },
  switchKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: palette.white },
  switchKnobActive: { alignSelf: "flex-end", backgroundColor: palette.sky },
  settingsHint: { color: palette.muted, fontSize: 9, lineHeight: 14, marginTop: 9 },
  settingsParagraph: { color: "#4E6272", fontSize: 10, lineHeight: 16, marginBottom: 10 },
  reminderChoices: { flexDirection: "row", gap: 7, marginTop: 10, marginBottom: 4 },
  errorNotice: { backgroundColor: "#FCE8E8", borderRadius: 10, padding: 10, marginBottom: 10 },
  errorText: { color: "#8C2020", fontSize: 10 },
  tabBar: { minHeight: 65, flexDirection: "row", backgroundColor: palette.white, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 7, paddingBottom: 4 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  tabIcon: { color: palette.muted, fontSize: 19, lineHeight: 22 },
  tabIconActive: { color: palette.universityBlue },
  tabLabel: { color: "#526777", fontSize: 11, marginTop: 3, fontWeight: "600" },
  dismissAction: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  tabLabelActive: { color: palette.universityBlue, fontWeight: "800" },
  tabIndicator: { position: "absolute", top: -7, width: 21, height: 2, backgroundColor: palette.sky, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
});
