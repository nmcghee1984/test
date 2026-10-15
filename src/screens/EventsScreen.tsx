import type { Dispatch, SetStateAction } from "react";
import { View } from "react-native";
import { ActionButton, EventCard, Label } from "../components/CampusCards";
import { universityEvents, type CampusEvent } from "../data/events";
import type { CampusDataSource } from "../data/storage";
import { Pressable, Text, TextInput } from "../ui/primitives";
import { styles } from "../ui/styles";
import { palette } from "../ui/theme";

type EventsScreenProps = {
  openExternal: (url: string) => Promise<void>;
  eventSearch: string;
  setEventSearch: Dispatch<SetStateAction<string>>;
  eventFilter: string;
  setEventFilter: Dispatch<SetStateAction<string>>;
  setEventDateFilter: Dispatch<SetStateAction<"WEEK" | "UPCOMING">>;
  eventDateFilter: "WEEK" | "UPCOMING";
  setSavedEventsOnly: Dispatch<SetStateAction<boolean>>;
  savedEventsOnly: boolean;
  displayedEvents: CampusEvent[];
  savedEvents: string[];
  reminders: Record<string, string>;
  toggleValue: (values: string[], id: string, update: (next: string[]) => void) => void;
  setSavedEvents: Dispatch<SetStateAction<string[]>>;
  toggleEventReminder: (event: CampusEvent) => void;
  addEventToCalendar: (event: CampusEvent) => void;
  campusData: CampusDataSource;
};

export default function EventsScreen({
  openExternal,
  eventSearch,
  setEventSearch,
  eventFilter,
  setEventFilter,
  setEventDateFilter,
  eventDateFilter,
  setSavedEventsOnly,
  savedEventsOnly,
  displayedEvents,
  savedEvents,
  reminders,
  toggleValue,
  setSavedEvents,
  toggleEventReminder,
  addEventToCalendar,
  campusData,
}: EventsScreenProps) {
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
