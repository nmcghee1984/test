import { StatusBar } from "expo-status-bar";
import { useMemo, useState, type ReactNode } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CampusEvent,
  CampusPlace,
  ClassItem,
  campusEvents,
  campusPlaces,
  sampleClasses,
  studySpaces,
} from "./src/data/mockData";

type Tab = "Home" | "Timetable" | "Map" | "Study" | "Events";
type PlaceFilter = "All" | CampusPlace["category"];

const palette = {
  ink: "#172421",
  muted: "#77827E",
  green: "#0E6B4D",
  deepGreen: "#094E3B",
  mint: "#E8F3ED",
  paper: "#F5F7F4",
  white: "#FFFFFF",
  line: "#E8ECE8",
  orange: "#D88342",
  blue: "#477DA2",
};

const tabs: { name: Tab; icon: string }[] = [
  { name: "Home", icon: "⌂" },
  { name: "Timetable", icon: "▦" },
  { name: "Map", icon: "⌖" },
  { name: "Study", icon: "▤" },
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
      <Text style={styles.sectionTitle}>{title}</Text>
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
      style={[styles.actionButton, selected && styles.actionButtonSelected]}
    >
      <Text style={[styles.actionButtonText, selected && styles.actionButtonTextSelected]}>{title}</Text>
    </Pressable>
  );
}

function ClassCard({ item, compact = false }: { item: ClassItem; compact?: boolean }) {
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
        <Text style={styles.bodyMuted}>{item.place}</Text>
        {!compact ? <Text style={styles.classDetail}>{item.detail}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </View>
  );
}

function CapacityBar({ available, total }: { available: number; total: number }) {
  const ratio = Math.max(0, Math.min(1, available / total));
  const color = ratio > 0.35 ? palette.green : ratio > 0.15 ? palette.orange : "#B6534D";
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
  onSave,
}: {
  event: CampusEvent;
  saved: boolean;
  onSave: () => void;
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
          accessibilityState={{ selected: saved }}
          style={[styles.smallButton, saved && styles.smallButtonSelected]}
        >
          <Text style={[styles.smallButtonText, saved && styles.smallButtonTextSelected]}>
            {saved ? "✓  Saved" : "＋  Save event"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function App() {
  const today = useMemo(() => new Date(), []);
  const todayKey = weekdayKeys[today.getDay()];
  const monday = useMemo(() => {
    const date = new Date(today);
    date.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return date;
  }, [today]);
  const [tab, setTab] = useState<Tab>("Home");
  const [selectedDay, setSelectedDay] = useState(weekDays.includes(todayKey) ? todayKey : "Mon");
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>("All");
  const [studyFilter, setStudyFilter] = useState<"All" | "Quiet" | "Group">("All");
  const [selectedPlace, setSelectedPlace] = useState<CampusPlace>(campusPlaces[0]);
  const [savedSpaces, setSavedSpaces] = useState<string[]>([]);
  const [savedEvents, setSavedEvents] = useState<string[]>([]);
  const [noticeVisible, setNoticeVisible] = useState(true);

  const classes = sampleClasses[selectedDay] ?? [];
  const todayClasses = sampleClasses[todayKey] ?? [];
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const nextClass = todayClasses.find((item) => {
    const [hours, minutes] = item.start.split(":").map(Number);
    return hours * 60 + minutes > nowMinutes;
  });
  const selectedDate = new Date(monday);
  selectedDate.setDate(monday.getDate() + weekDays.indexOf(selectedDay));
  const displayedPlaces = placeFilter === "All"
    ? campusPlaces
    : campusPlaces.filter((place) => place.category === placeFilter);
  const displayedStudySpaces = studyFilter === "All"
    ? studySpaces
    : studySpaces.filter((space) => studyFilter === "Quiet" ? space.quiet : !space.quiet);

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
            <Text style={styles.greeting}>Morning, Alex <Text style={styles.wave}>✳</Text></Text>
            <Text style={styles.dateText}>{formatDate(today)}</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View>
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
          <Pressable style={styles.quickAction} onPress={() => goTo("Timetable")} accessibilityRole="button">
            <View style={[styles.quickIcon, { backgroundColor: "#EAF2F6" }]}><Text style={styles.quickGlyph}>▦</Text></View>
            <Text style={styles.quickLabel}>Timetable</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => goTo("Map")} accessibilityRole="button">
            <View style={[styles.quickIcon, { backgroundColor: "#F9EFE4" }]}><Text style={[styles.quickGlyph, { color: "#B56B31" }]}>⌖</Text></View>
            <Text style={styles.quickLabel}>Campus map</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => goTo("Study")} accessibilityRole="button">
            <View style={[styles.quickIcon, { backgroundColor: "#E8F2EA" }]}><Text style={styles.quickGlyph}>▤</Text></View>
            <Text style={styles.quickLabel}>Study spaces</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => goTo("Events")} accessibilityRole="button">
            <View style={[styles.quickIcon, { backgroundColor: "#F2EAF4" }]}><Text style={[styles.quickGlyph, { color: "#80588A" }]}>✳</Text></View>
            <Text style={styles.quickLabel}>What's on</Text>
          </Pressable>
        </View>

        {noticeVisible ? (
          <View style={styles.inlineNotice}>
            <Text style={styles.noticeIcon}>i</Text>
            <Text style={styles.noticeText}>A lighter way to find your place at UofG.</Text>
            <Pressable onPress={() => setNoticeVisible(false)} accessibilityRole="button" accessibilityLabel="Dismiss message">
              <Text style={styles.noticeDismiss}>×</Text>
            </Pressable>
          </View>
        ) : null}

        <SectionTitle title="Your day" action="Full timetable" onAction={() => goTo("Timetable")} />
        {todayClasses.length ? (
          todayClasses.slice(0, 2).map((item) => <ClassCard key={item.id} item={item} compact />)
        ) : (
          <View style={styles.emptyCard}><Text style={styles.bodyMuted}>Nothing scheduled today. Enjoy the breathing room.</Text></View>
        )}

        <SectionTitle title="Study nearby" action="See spaces" onAction={() => goTo("Study")} />
        <Pressable style={styles.nearbyCard} onPress={() => goTo("Study")} accessibilityRole="button">
          <View style={styles.nearbyIcon}><Text style={styles.nearbyGlyph}>▤</Text></View>
          <View style={styles.nearbyText}>
            <Text style={styles.nearbyTitle}>University Library</Text>
            <Text style={styles.bodyMuted}>Learning Hub · 2 min walk</Text>
          </View>
          <View style={styles.availableBadge}><Text style={styles.availableCount}>42</Text><Text style={styles.availableLabel}>free</Text></View>
        </Pressable>

        <View style={styles.disclaimer}><Text style={styles.disclaimerText}>This preview uses sample campus information.</Text></View>
      </>
    );
  }

  function renderTimetable() {
    return (
      <>
        <View style={styles.pageIntro}>
          <Label>YOUR WEEK</Label>
          <Text style={styles.pageTitle}>Timetable</Text>
          <Text style={styles.pageSubtitle}>A clear view of what’s coming up.</Text>
        </View>
        <View style={styles.dayPicker}>
          {weekDays.map((day, index) => {
            const active = selectedDay === day;
            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.dayItem, active && styles.dayItemActive]}
              >
                <Text style={[styles.dayLetter, active && styles.dayTextActive]}>{dayLetters[index]}</Text>
                <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index).getDate()}</Text>
                {sampleClasses[day]?.length ? <View style={[styles.dayDot, active && styles.dayDotActive]} /> : <View style={styles.dayDotSpacer} />}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.dayTitleRow}>
          <Text style={styles.sectionTitle}>{selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</Text>
          <Text style={styles.bodyMuted}>{classes.length} {classes.length === 1 ? "class" : "classes"}</Text>
        </View>
        {classes.length ? (
          classes.map((item) => <ClassCard key={item.id} item={item} />)
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
          <Text style={styles.pageTitle}>Campus map</Text>
          <Text style={styles.pageSubtitle}>Find your next stop around campus.</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapFilters}>
          {(["All", "Study", "Library", "Food", "Access"] as PlaceFilter[]).map((filter) => (
            <ActionButton
              key={filter}
              title={filter === "All" ? "All places" : filter}
              selected={placeFilter === filter}
              onPress={() => {
                setPlaceFilter(filter);
                if (filter !== "All") {
                  const firstMatch = campusPlaces.find((place) => place.category === filter);
                  if (firstMatch) setSelectedPlace(firstMatch);
                }
              }}
            />
          ))}
        </ScrollView>
        <View style={styles.mapCanvas} accessibilityLabel="Illustrated sample map of Gilmorehill campus">
          <View style={[styles.mapBlock, styles.mapBlockOne]} />
          <View style={[styles.mapBlock, styles.mapBlockTwo]} />
          <View style={[styles.mapBlock, styles.mapBlockThree]} />
          <View style={[styles.mapBlock, styles.mapBlockFour]} />
          <View style={styles.mapPathH} />
          <View style={styles.mapPathV} />
          <View style={styles.mapPathDiagonal} />
          <Text style={[styles.mapAreaLabel, { left: "8%", top: "10%" }]}>GILMOREHILL</Text>
          <Text style={[styles.mapAreaLabel, { left: "62%", top: "78%" }]}>UNIVERSITY AVE</Text>
          {displayedPlaces.map((place) => {
            const active = selectedPlace.id === place.id;
            return (
              <Pressable
                key={place.id}
                onPress={() => setSelectedPlace(place)}
                accessibilityRole="button"
                accessibilityLabel={`${place.name}${place.lifts ? ", lift access" : ""}`}
                style={[
                  styles.mapPin,
                  active && styles.mapPinActive,
                  { left: `${place.x}%`, top: `${place.y}%` },
                ]}
              >
                <Text style={[styles.mapPinText, active && styles.mapPinTextActive]}>{place.category === "Food" ? "F" : place.category === "Library" ? "L" : place.category === "Access" ? "↗" : "S"}</Text>
              </Pressable>
            );
          })}
          <View style={styles.mapCompass}><Text style={styles.compassArrow}>↑</Text><Text style={styles.compassN}>N</Text></View>
        </View>
        <View style={styles.mapLegend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: palette.green }]} /><Text style={styles.legendText}>Selected</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "#B9CDBE" }]} /><Text style={styles.legendText}>Campus places</Text></View>
          <Text style={styles.sampleTagLight}>ILLUSTRATIVE</Text>
        </View>
        <View style={styles.placeCard}>
          <View style={styles.placeIcon}><Text style={styles.placeIconText}>{selectedPlace.category === "Food" ? "F" : selectedPlace.category === "Library" ? "L" : selectedPlace.category === "Access" ? "↗" : "S"}</Text></View>
          <View style={styles.placeCopy}>
            <Text style={styles.eventCategory}>{selectedPlace.category.toUpperCase()}</Text>
            <Text style={styles.placeTitle}>{selectedPlace.name}</Text>
            <Text style={styles.bodyMuted}>{selectedPlace.detail}</Text>
            {selectedPlace.lifts ? <Text style={styles.liftText}>↕  Lift access shown in sample listing</Text> : null}
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
        <View style={styles.disclaimer}><Text style={styles.disclaimerText}>Illustrative map only · verify routes and lift status on campus.</Text></View>
      </>
    );
  }

  function renderStudy() {
    return (
      <>
        <View style={styles.pageIntro}>
          <Label>MAKE ROOM TO THINK</Label>
          <Text style={styles.pageTitle}>Study spaces</Text>
          <Text style={styles.pageSubtitle}>Find a spot that suits the way you work.</Text>
        </View>
        <View style={styles.capacitySummary}>
          <View style={styles.summaryIcon}><Text style={styles.summaryIconText}>◉</Text></View>
          <View style={styles.summaryCopy}><Text style={styles.summaryTitle}>Campus study spaces</Text><Text style={styles.summarySubtitle}>Sample counts · not live</Text></View>
          <View style={styles.summaryCount}><Text style={styles.summaryNumber}>75</Text><Text style={styles.summarySmall}>spots</Text></View>
        </View>
        <View style={styles.filterRow}>
          {(["All", "Quiet", "Group"] as const).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setStudyFilter(filter)}
              accessibilityRole="button"
              accessibilityState={{ selected: studyFilter === filter }}
              style={[styles.studyFilterButton, studyFilter === filter && styles.studyFilterButtonActive]}
            >
              <Text style={[styles.filterTextMuted, studyFilter === filter && styles.studyFilterTextActive]}>
                {filter === "All" ? "All spaces" : filter}
              </Text>
            </Pressable>
          ))}
        </View>
        {displayedStudySpaces.map((space) => {
          const saved = savedSpaces.includes(space.id);
          return (
            <View key={space.id} style={styles.spaceCard}>
              <View style={styles.spaceCardTop}>
                <View style={styles.spaceSymbol}><Text style={styles.spaceSymbolText}>▤</Text></View>
                <View style={styles.spaceCopy}>
                  <Text style={styles.spaceBuilding}>{space.building.toUpperCase()}</Text>
                  <Text style={styles.spaceName}>{space.name}</Text>
                  <Text style={styles.bodyMuted}>{space.level} · {space.walk} walk</Text>
                </View>
                <Pressable
                  onPress={() => toggleValue(savedSpaces, space.id, setSavedSpaces)}
                  accessibilityRole="button"
                  accessibilityLabel={saved ? "Remove saved study space" : "Save study space"}
                  accessibilityState={{ selected: saved }}
                  style={styles.bookmarkButton}
                >
                  <Text style={[styles.bookmark, saved && styles.bookmarkActive]}>{saved ? "♥" : "♡"}</Text>
                </Pressable>
              </View>
              <View style={styles.spaceCapacityRow}>
                <Text style={styles.spaceAvailable}>{space.available} <Text style={styles.spaceAvailableSuffix}>available</Text></Text>
                <Text style={styles.spaceQuiet}>{space.quiet ? "QUIET" : "COLLABORATIVE"}</Text>
              </View>
              <CapacityBar available={space.available} total={space.total} />
            </View>
          );
        })}
        <View style={styles.tipCard}><Text style={styles.tipTitle}>A note on availability</Text><Text style={styles.tipBody}>Capacity figures are sample data for this prototype, not live occupancy or a seat reservation.</Text></View>
      </>
    );
  }

  function renderEvents() {
    return (
      <>
        <View style={styles.pageIntro}>
          <Label>THERE’S ALWAYS SOMETHING ON</Label>
          <Text style={styles.pageTitle}>Events</Text>
          <Text style={styles.pageSubtitle}>Find your people, try something new.</Text>
        </View>
        <View style={styles.eventHero}>
          <Text style={styles.eventHeroEyebrow}>MAKE THE MOST OF UofG</Text>
          <Text style={styles.eventHeroTitle}>Your next favourite thing is out there.</Text>
          <Text style={styles.eventHeroBody}>Explore student life, careers and wellbeing across campus.</Text>
          <View style={styles.eventHeroShape} />
        </View>
        <View style={styles.eventListHeading}>
          <Text style={styles.sectionTitle}>Coming up</Text>
          <Text style={styles.eventCount}>{campusEvents.length} EVENTS</Text>
        </View>
        {campusEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            saved={savedEvents.includes(event.id)}
            onSave={() => toggleValue(savedEvents, event.id, setSavedEvents)}
          />
        ))}
        <View style={styles.disclaimer}><Text style={styles.disclaimerText}>Sample events · check official UofG channels for details.</Text></View>
      </>
    );
  }

  let content: ReactNode;
  switch (tab) {
    case "Timetable": content = renderTimetable(); break;
    case "Map": content = renderMap(); break;
    case "Study": content = renderStudy(); break;
    case "Events": content = renderEvents(); break;
    default: content = renderHome();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appHeader}>
        <Pressable style={styles.brand} onPress={() => goTo("Home")} accessibilityRole="button" accessibilityLabel="UofG Life home">
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>U</Text></View>
          <View><Text style={styles.brandName}>UofG <Text style={styles.brandLife}>LIFE</Text></Text><Text style={styles.brandSub}>UNIVERSITY OF GLASGOW</Text></View>
        </Pressable>
        <Pressable style={styles.headerButton} onPress={() => goTo("Events")} accessibilityRole="button" accessibilityLabel="See campus events">
          <Text style={styles.headerBell}>◌</Text>
          <View style={styles.headerBadge} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {content}
      </ScrollView>
      <View style={styles.tabBar}>
        {tabs.map((item) => {
          const active = tab === item.name;
          return (
            <Pressable
              key={item.name}
              onPress={() => goTo(item.name)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.name}
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
  appHeader: { height: 64, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: palette.paper },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 35, height: 35, borderRadius: 12, backgroundColor: palette.green, alignItems: "center", justifyContent: "center" },
  brandMarkText: { color: palette.white, fontSize: 22, fontWeight: "800", fontStyle: "italic" },
  brandName: { color: palette.ink, fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
  brandLife: { color: palette.green, fontSize: 12, letterSpacing: 1.5 },
  brandSub: { color: palette.muted, fontSize: 8, fontWeight: "700", letterSpacing: 1.05, marginTop: 1 },
  headerButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.line },
  headerBell: { fontSize: 23, color: palette.ink, lineHeight: 28 },
  headerBadge: { position: "absolute", right: 8, top: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: palette.orange, borderWidth: 1, borderColor: palette.white },
  scrollContent: { paddingHorizontal: 21, paddingTop: 18, paddingBottom: 34 },
  greetingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 21 },
  greeting: { color: palette.ink, fontSize: 25, fontWeight: "700", letterSpacing: -0.7 },
  wave: { color: palette.orange, fontSize: 18 },
  dateText: { marginTop: 4, color: palette.muted, fontSize: 13 },
  avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#DDE9E3", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, color: palette.deepGreen, fontWeight: "700" },
  heroCard: { overflow: "hidden", borderRadius: 22, backgroundColor: palette.deepGreen, minHeight: 223, padding: 20, marginBottom: 19 },
  heroTopline: { flexDirection: "row", alignItems: "center", marginBottom: 23 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#89CFAE", marginRight: 7 },
  heroEyebrow: { color: "#C3DED1", fontSize: 9, fontWeight: "700", letterSpacing: 1.25 },
  sampleTag: { marginLeft: "auto", color: "#DAE9E1", fontSize: 8, letterSpacing: 1, fontWeight: "700", borderColor: "#559078", borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  heroCaption: { color: "#9ECBB4", fontSize: 9, fontWeight: "700", letterSpacing: 1.4, marginBottom: 6 },
  heroTitle: { color: palette.white, fontSize: 21, fontWeight: "700", letterSpacing: -0.35, maxWidth: "88%" },
  heroLocationRow: { flexDirection: "row", alignItems: "center", marginTop: 9 },
  heroPin: { color: "#AED7C3", fontSize: 17, marginRight: 6 },
  heroLocation: { color: "#D1E3D9", fontSize: 12, maxWidth: "88%" },
  directionsButton: { alignSelf: "flex-start", backgroundColor: "#F1F6F2", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9, marginTop: 16 },
  directionsText: { color: palette.deepGreen, fontSize: 11, fontWeight: "700" },
  buttonArrow: { color: palette.green, fontSize: 15 },
  heroDecorOne: { position: "absolute", width: 180, height: 180, borderRadius: 90, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", right: -77, bottom: -112 },
  heroDecorTwo: { position: "absolute", width: 124, height: 124, borderRadius: 62, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", right: -49, bottom: -83 },
  quickActions: { flexDirection: "row", justifyContent: "space-between", marginBottom: 19 },
  quickAction: { alignItems: "center", width: "24%" },
  quickIcon: { width: 51, height: 51, borderRadius: 17, alignItems: "center", justifyContent: "center", marginBottom: 7 },
  quickGlyph: { color: palette.green, fontSize: 24, fontWeight: "600" },
  quickLabel: { color: "#4B5752", fontSize: 10, fontWeight: "600", textAlign: "center" },
  inlineNotice: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 11, borderRadius: 11, backgroundColor: "#EBF0EC", marginBottom: 24 },
  noticeIcon: { width: 17, height: 17, borderRadius: 9, textAlign: "center", color: palette.green, backgroundColor: "#D4E5DA", fontSize: 12, fontWeight: "700", marginRight: 8, overflow: "hidden" },
  noticeText: { color: "#51625A", fontSize: 10, flex: 1 },
  noticeDismiss: { color: "#84938A", fontSize: 18 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11, marginTop: 1 },
  sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: "700", letterSpacing: -0.2 },
  link: { color: palette.green, fontSize: 11, fontWeight: "700" },
  classCard: { flexDirection: "row", alignItems: "center", padding: 15, backgroundColor: palette.white, borderRadius: 14, borderWidth: 1, borderColor: palette.line, marginBottom: 10 },
  classCardCompact: { paddingVertical: 12 },
  classTime: { alignItems: "flex-start", width: 47 },
  classStart: { color: palette.ink, fontWeight: "700", fontSize: 13 },
  classEnd: { color: palette.muted, fontSize: 10, marginTop: 4 },
  classDivider: { width: 2, height: 42, backgroundColor: "#D7E7DD", borderRadius: 1, marginHorizontal: 12 },
  classInfo: { flex: 1 },
  classKind: { color: palette.green, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  className: { color: palette.ink, fontSize: 12, fontWeight: "700", marginTop: 3 },
  bodyMuted: { color: palette.muted, fontSize: 10, marginTop: 4 },
  classDetail: { color: "#8C9691", fontSize: 10, marginTop: 3 },
  chevron: { color: "#A6B0AA", fontSize: 24, marginLeft: 8 },
  emptyCard: { padding: 16, borderRadius: 13, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, marginBottom: 19 },
  nearbyCard: { flexDirection: "row", alignItems: "center", backgroundColor: palette.white, borderRadius: 15, borderWidth: 1, borderColor: palette.line, padding: 12, marginBottom: 18 },
  nearbyIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: palette.mint, alignItems: "center", justifyContent: "center", marginRight: 11 },
  nearbyGlyph: { color: palette.green, fontSize: 20 },
  nearbyText: { flex: 1 },
  nearbyTitle: { color: palette.ink, fontSize: 12, fontWeight: "700" },
  availableBadge: { alignItems: "center", backgroundColor: "#EFF6F1", borderRadius: 10, minWidth: 44, paddingHorizontal: 7, paddingVertical: 5 },
  availableCount: { color: palette.green, fontSize: 14, fontWeight: "800" },
  availableLabel: { color: palette.green, fontSize: 8, fontWeight: "600" },
  disclaimer: { alignItems: "center", paddingVertical: 11 },
  disclaimerText: { color: "#9AA39E", fontSize: 9, textAlign: "center" },
  pageIntro: { marginBottom: 18 },
  label: { color: palette.green, fontSize: 9, fontWeight: "800", letterSpacing: 1.4, marginBottom: 6 },
  pageTitle: { color: palette.ink, fontSize: 27, fontWeight: "700", letterSpacing: -0.7 },
  pageSubtitle: { color: palette.muted, fontSize: 12, marginTop: 5 },
  dayPicker: { flexDirection: "row", backgroundColor: palette.white, borderRadius: 15, borderWidth: 1, borderColor: palette.line, padding: 6, justifyContent: "space-between", marginBottom: 21 },
  dayItem: { width: "19%", minHeight: 67, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  dayItemActive: { backgroundColor: palette.green },
  dayLetter: { color: palette.muted, fontSize: 10, fontWeight: "600" },
  dayNumber: { color: palette.ink, fontSize: 16, fontWeight: "700", marginTop: 5 },
  dayTextActive: { color: palette.white },
  dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: palette.green, marginTop: 4 },
  dayDotActive: { backgroundColor: "#B9E2CB" },
  dayDotSpacer: { height: 8 },
  dayTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11 },
  emptyState: { backgroundColor: palette.white, borderRadius: 16, borderWidth: 1, borderColor: palette.line, paddingVertical: 37, alignItems: "center", marginTop: 3 },
  emptyIcon: { fontSize: 29, color: palette.orange, marginBottom: 7 },
  emptyTitle: { color: palette.ink, fontSize: 16, fontWeight: "700" },
  tipCard: { padding: 15, borderRadius: 14, backgroundColor: "#EAF1EC", marginTop: 15 },
  tipTitle: { color: palette.deepGreen, fontSize: 12, fontWeight: "700", marginBottom: 5 },
  tipBody: { color: "#63746A", fontSize: 10, lineHeight: 16 },
  mapFilters: { flexDirection: "row", gap: 7, marginBottom: 13 },
  actionButton: { borderWidth: 1, borderColor: "#E2E8E3", backgroundColor: palette.white, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7 },
  actionButtonSelected: { backgroundColor: palette.deepGreen, borderColor: palette.deepGreen },
  actionButtonText: { color: "#68736D", fontSize: 9, fontWeight: "600" },
  actionButtonTextSelected: { color: palette.white },
  mapCanvas: { height: 320, borderRadius: 19, overflow: "hidden", backgroundColor: "#EAF0E5", borderWidth: 1, borderColor: "#E0E8DC", position: "relative" },
  mapBlock: { position: "absolute", backgroundColor: "#D4E1D0", borderRadius: 12 },
  mapBlockOne: { width: "28%", height: "26%", left: "7%", top: "16%", transform: [{ rotate: "-8deg" }] },
  mapBlockTwo: { width: "26%", height: "26%", left: "39%", top: "10%", transform: [{ rotate: "6deg" }] },
  mapBlockThree: { width: "28%", height: "31%", right: "5%", top: "44%", transform: [{ rotate: "-6deg" }] },
  mapBlockFour: { width: "29%", height: "24%", left: "14%", bottom: "7%", transform: [{ rotate: "5deg" }] },
  mapPathH: { position: "absolute", height: 18, width: "110%", backgroundColor: "#F8F8EF", left: "-4%", top: "47%", transform: [{ rotate: "-12deg" }] },
  mapPathV: { position: "absolute", width: 15, height: "120%", backgroundColor: "#F8F8EF", left: "51%", top: "-10%", transform: [{ rotate: "24deg" }] },
  mapPathDiagonal: { position: "absolute", height: 10, width: "83%", backgroundColor: "#F8F8EF", left: "12%", top: "63%", transform: [{ rotate: "26deg" }] },
  mapAreaLabel: { position: "absolute", color: "#98A692", fontSize: 7, fontWeight: "800", letterSpacing: 1 },
  mapPin: { position: "absolute", width: 30, height: 30, borderRadius: 15, backgroundColor: "#B9CDBE", borderWidth: 2, borderColor: "#F8FBF6", alignItems: "center", justifyContent: "center", transform: [{ translateX: -15 }, { translateY: -15 }] },
  mapPinActive: { width: 37, height: 37, borderRadius: 19, backgroundColor: palette.green, borderColor: "#D8EADF", zIndex: 2, transform: [{ translateX: -18 }, { translateY: -18 }] },
  mapPinText: { color: palette.deepGreen, fontSize: 10, fontWeight: "800" },
  mapPinTextActive: { color: palette.white, fontSize: 12 },
  mapCompass: { position: "absolute", right: 12, top: 12, width: 31, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.8)" },
  compassArrow: { color: palette.green, fontSize: 18, lineHeight: 18, fontWeight: "800" },
  compassN: { color: "#718076", fontSize: 7, fontWeight: "700" },
  mapLegend: { flexDirection: "row", alignItems: "center", gap: 13, marginVertical: 11 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: palette.muted, fontSize: 9 },
  sampleTagLight: { color: "#85948A", fontSize: 7, fontWeight: "800", letterSpacing: 0.8, marginLeft: "auto" },
  placeCard: { flexDirection: "row", alignItems: "center", backgroundColor: palette.white, borderRadius: 15, borderWidth: 1, borderColor: palette.line, padding: 13 },
  placeIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: palette.mint, alignItems: "center", justifyContent: "center", marginRight: 11 },
  placeIconText: { color: palette.green, fontSize: 16, fontWeight: "800" },
  placeCopy: { flex: 1 },
  placeTitle: { color: palette.ink, fontSize: 13, fontWeight: "700", marginTop: 2 },
  liftText: { color: palette.green, fontSize: 9, fontWeight: "600", marginTop: 7 },
  capacitySummary: { backgroundColor: palette.deepGreen, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 17 },
  summaryIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.13)", alignItems: "center", justifyContent: "center", marginRight: 11 },
  summaryIconText: { color: "#C6E3D2", fontSize: 20 },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: palette.white, fontSize: 12, fontWeight: "700" },
  summarySubtitle: { color: "#B8D1C3", fontSize: 9, marginTop: 4 },
  summaryCount: { alignItems: "center", paddingLeft: 9 },
  summaryNumber: { color: palette.white, fontSize: 20, fontWeight: "800" },
  summarySmall: { color: "#C0D9CB", fontSize: 8 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  filterTextMuted: { color: palette.muted, fontSize: 10 },
  studyFilterButton: { borderRadius: 16, borderWidth: 1, borderColor: "#E2E8E3", backgroundColor: palette.white, paddingHorizontal: 11, paddingVertical: 7 },
  studyFilterButtonActive: { backgroundColor: "#EAF3ED", borderColor: "#C7DDCE" },
  studyFilterTextActive: { color: palette.green, fontWeight: "700" },
  spaceCard: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 15, padding: 14, marginBottom: 10 },
  spaceCardTop: { flexDirection: "row", alignItems: "center" },
  spaceSymbol: { width: 41, height: 41, borderRadius: 13, backgroundColor: "#ECF3EE", alignItems: "center", justifyContent: "center", marginRight: 10 },
  spaceSymbolText: { color: palette.green, fontSize: 20 },
  spaceCopy: { flex: 1 },
  spaceBuilding: { color: palette.green, fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  spaceName: { color: palette.ink, fontSize: 13, fontWeight: "700", marginTop: 3 },
  bookmarkButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  bookmark: { color: "#8B9991", fontSize: 23 },
  bookmarkActive: { color: "#B6534D" },
  spaceCapacityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 8 },
  spaceAvailable: { color: palette.ink, fontSize: 12, fontWeight: "800" },
  spaceAvailableSuffix: { color: palette.muted, fontSize: 10, fontWeight: "400" },
  spaceQuiet: { color: "#829087", fontSize: 7, fontWeight: "800", letterSpacing: 0.8, backgroundColor: "#F1F4F1", paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5 },
  capacityTrack: { height: 5, backgroundColor: "#EDF0ED", borderRadius: 4, overflow: "hidden" },
  capacityFill: { height: "100%", borderRadius: 4 },
  eventHero: { backgroundColor: "#F0EAE1", borderRadius: 18, padding: 18, marginBottom: 22, minHeight: 150, overflow: "hidden" },
  eventHeroEyebrow: { color: "#A2693B", fontSize: 8, fontWeight: "800", letterSpacing: 1.3 },
  eventHeroTitle: { color: "#433D35", fontSize: 20, fontWeight: "700", maxWidth: "77%", marginTop: 9, letterSpacing: -0.3 },
  eventHeroBody: { color: "#7B7368", fontSize: 10, lineHeight: 15, maxWidth: "75%", marginTop: 6 },
  eventHeroShape: { position: "absolute", width: 103, height: 103, borderRadius: 52, borderWidth: 17, borderColor: "rgba(190,139,91,0.17)", right: -24, bottom: -30 },
  eventListHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11 },
  eventCount: { color: "#9AA39E", fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  eventCard: { flexDirection: "row", backgroundColor: palette.white, borderRadius: 15, borderWidth: 1, borderColor: palette.line, padding: 13, marginBottom: 10 },
  eventDate: { width: 47, height: 54, borderRadius: 12, backgroundColor: "#EFF5F0", alignItems: "center", justifyContent: "center", marginRight: 11 },
  eventDay: { color: palette.deepGreen, fontSize: 19, fontWeight: "800" },
  eventMonth: { color: palette.green, fontSize: 7, fontWeight: "800", letterSpacing: 1 },
  eventCopy: { flex: 1 },
  eventCategory: { color: palette.green, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  eventTitle: { color: palette.ink, fontSize: 13, fontWeight: "700", marginTop: 3 },
  eventDescription: { color: "#69746D", fontSize: 10, lineHeight: 15, marginTop: 7 },
  smallButton: { alignSelf: "flex-start", borderWidth: 1, borderColor: "#DCE7DF", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, marginTop: 9 },
  smallButtonSelected: { backgroundColor: "#EAF3ED", borderColor: "#C7DDCE" },
  smallButtonText: { color: palette.green, fontSize: 9, fontWeight: "700" },
  smallButtonTextSelected: { color: palette.deepGreen },
  tabBar: { minHeight: 65, flexDirection: "row", backgroundColor: palette.white, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 7, paddingBottom: 4 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  tabIcon: { color: "#9AA59E", fontSize: 19, lineHeight: 22 },
  tabIconActive: { color: palette.green },
  tabLabel: { color: "#929C95", fontSize: 8, marginTop: 3, fontWeight: "600" },
  tabLabelActive: { color: palette.green, fontWeight: "800" },
  tabIndicator: { position: "absolute", top: -7, width: 21, height: 2, backgroundColor: palette.green, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
});
