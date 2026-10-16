import { NotoSans_400Regular } from "@expo-google-fonts/noto-sans/400Regular";
import { NotoSans_500Medium } from "@expo-google-fonts/noto-sans/500Medium";
import { NotoSans_700Bold } from "@expo-google-fonts/noto-sans/700Bold";
import { NotoSerif_700Bold } from "@expo-google-fonts/noto-serif/700Bold";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Alert,
  Image,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  View,
} from "react-native";
import AskUofGScreen from "./src/components/AskUofGScreen";
import DiscoverScreen from "./src/components/DiscoverScreen";
import type { CampusEvent } from "./src/data/events";
import type {
  CampusPlace,
  ClassItem,
} from "./src/domain/campus";
import { createSampleDataSource } from "./src/data/storage";
import { useSavedCampusState } from "./src/hooks/useSavedCampusState";
import { tabs, type PlaceFilter, type Tab } from "./src/navigation";
import EventsScreen from "./src/screens/EventsScreen";
import HomeScreen from "./src/screens/HomeScreen";
import MapScreen from "./src/screens/MapScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import StudyScreen from "./src/screens/StudyScreen";
import TimetableScreen from "./src/screens/TimetableScreen";
import { AppearanceProvider, Pressable, Text } from "./src/ui/primitives";
import { styles } from "./src/ui/styles";
import { calendarLink, isSampleSpaceOpen, localDateKey, reminderDate, weekdayKeys, weekDays } from "./src/utils/schedule";

const campusData = createSampleDataSource();

export default function App() {
  useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_700Bold,
    NotoSerif_700Bold,
  });

  const today = useMemo(() => new Date(), []);
  const { preferences, updatePreferences, savedSpaces, setSavedSpaces, savedEvents, setSavedEvents,
    savedPlaces, setSavedPlaces, savedResearch, setSavedResearch, researchInterests, setResearchInterests,
    reminders, noticeVisible, setNoticeVisible, storageError, actionMessage, setActionMessage,
    toggleReminder, toggleEventReminderSetting } = useSavedCampusState(campusData);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
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
    if (displayedPlaces.length && !displayedPlaces.some((place) => place.id === selectedPlace.id)) {
      setSelectedPlace(displayedPlaces[0]);
    }
  }, [displayedPlaces, selectedPlace.id]);

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
    case "Timetable": content = <TimetableScreen
      setWeekOffset={setWeekOffset}
      weekStart={weekStart}
      selectedDay={selectedDay}
      setSelectedDay={setSelectedDay}
      selectedDate={selectedDate}
      classes={classes}
      reminders={reminders}
      toggleClassReminder={toggleClassReminder}
      addClassToCalendar={addClassToCalendar}
      setMapSearch={setMapSearch}
      setPlaceFilter={setPlaceFilter}
      goTo={goTo}
      campusData={campusData}
    />; break;
    case "Map": content = <MapScreen
      mapSearch={mapSearch}
      setMapSearch={setMapSearch}
      placeFilter={placeFilter}
      setPlaceFilter={setPlaceFilter}
      setSelectedPlace={setSelectedPlace}
      displayedPlaces={displayedPlaces}
      selectedPlace={selectedPlace}
      preferences={preferences}
      systemReducedMotion={systemReducedMotion}
      toggleValue={toggleValue}
      savedPlaces={savedPlaces}
      setSavedPlaces={setSavedPlaces}
      openExternal={openExternal}
      facilitySearch={facilitySearch}
      setFacilitySearch={setFacilitySearch}
      setDirectoryAccessOnly={setDirectoryAccessOnly}
      directoryAccessOnly={directoryAccessOnly}
      campusData={campusData}
    />; break;
    case "Study": content = <StudyScreen
      studySearch={studySearch}
      setStudySearch={setStudySearch}
      setStudyFilter={setStudyFilter}
      studyFilter={studyFilter}
      setStepFreeOnly={setStepFreeOnly}
      stepFreeOnly={stepFreeOnly}
      setSavedSpacesOnly={setSavedSpacesOnly}
      savedSpacesOnly={savedSpacesOnly}
      setOpenSpacesOnly={setOpenSpacesOnly}
      openSpacesOnly={openSpacesOnly}
      filteredStudySpaces={filteredStudySpaces}
      savedSpaces={savedSpaces}
      toggleValue={toggleValue}
      setSavedSpaces={setSavedSpaces}
      campusData={campusData}
    />; break;
    case "Discover": content = renderDiscover(); break;
    case "Ask": content = renderAsk(); break;
    case "Events": content = <EventsScreen
      openExternal={openExternal}
      eventSearch={eventSearch}
      setEventSearch={setEventSearch}
      eventFilter={eventFilter}
      setEventFilter={setEventFilter}
      setEventDateFilter={setEventDateFilter}
      eventDateFilter={eventDateFilter}
      setSavedEventsOnly={setSavedEventsOnly}
      savedEventsOnly={savedEventsOnly}
      displayedEvents={displayedEvents}
      savedEvents={savedEvents}
      reminders={reminders}
      toggleValue={toggleValue}
      setSavedEvents={setSavedEvents}
      toggleEventReminder={toggleEventReminder}
      addEventToCalendar={addEventToCalendar}
      campusData={campusData}
    />; break;
    case "Settings": content = <SettingsScreen
      preferences={preferences}
      updatePreferences={updatePreferences}
      toggleEventReminderSetting={toggleEventReminderSetting}
    />; break;
    default: content = <HomeScreen
      preferences={preferences}
      today={today}
      nextClass={nextClass}
      goTo={goTo}
      todayClasses={todayClasses}
      noticeVisible={noticeVisible}
      setNoticeVisible={setNoticeVisible}
      savedPlaces={savedPlaces}
      setSelectedPlace={setSelectedPlace}
      campusData={campusData}
    />;
  }

  return (
    <AppearanceProvider value={preferences}>
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
    </AppearanceProvider>
  );
}
