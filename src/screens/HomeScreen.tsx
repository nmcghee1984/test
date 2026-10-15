import type { Dispatch, SetStateAction } from "react";
import { View } from "react-native";
import { ClassCard, SectionTitle } from "../components/CampusCards";
import type { AppPreferences, CampusDataSource } from "../data/storage";
import type { CampusPlace, ClassItem } from "../domain/campus";
import type { Tab } from "../navigation";
import { Pressable, Text } from "../ui/primitives";
import { styles } from "../ui/styles";
import { formatDate } from "../utils/schedule";

type HomeScreenProps = {
  preferences: AppPreferences;
  today: Date;
  nextClass: ClassItem | undefined;
  goTo: (next: Tab) => void;
  todayClasses: ClassItem[];
  noticeVisible: boolean;
  setNoticeVisible: Dispatch<SetStateAction<boolean>>;
  savedPlaces: string[];
  setSelectedPlace: Dispatch<SetStateAction<CampusPlace>>;
  campusData: CampusDataSource;
};

export default function HomeScreen({
  preferences,
  today,
  nextClass,
  goTo,
  todayClasses,
  noticeVisible,
  setNoticeVisible,
  savedPlaces,
  setSelectedPlace,
  campusData,
}: HomeScreenProps) {
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
