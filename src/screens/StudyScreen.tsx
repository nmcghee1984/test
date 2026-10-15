import type { Dispatch, SetStateAction } from "react";
import { ScrollView, View } from "react-native";
import { CapacityBar, Label } from "../components/CampusCards";
import type { CampusDataSource } from "../data/storage";
import type { StudySpace } from "../domain/campus";
import { Pressable, Text, TextInput } from "../ui/primitives";
import { styles } from "../ui/styles";
import { palette } from "../ui/theme";

type StudyScreenProps = {
  studySearch: string;
  setStudySearch: Dispatch<SetStateAction<string>>;
  setStudyFilter: Dispatch<SetStateAction<"All" | "Quiet" | "Group">>;
  studyFilter: "All" | "Quiet" | "Group";
  setStepFreeOnly: Dispatch<SetStateAction<boolean>>;
  stepFreeOnly: boolean;
  setSavedSpacesOnly: Dispatch<SetStateAction<boolean>>;
  savedSpacesOnly: boolean;
  setOpenSpacesOnly: Dispatch<SetStateAction<boolean>>;
  openSpacesOnly: boolean;
  filteredStudySpaces: StudySpace[];
  savedSpaces: string[];
  toggleValue: (values: string[], id: string, update: (next: string[]) => void) => void;
  setSavedSpaces: Dispatch<SetStateAction<string[]>>;
  campusData: CampusDataSource;
};

export default function StudyScreen({
  studySearch,
  setStudySearch,
  setStudyFilter,
  studyFilter,
  setStepFreeOnly,
  stepFreeOnly,
  setSavedSpacesOnly,
  savedSpacesOnly,
  setOpenSpacesOnly,
  openSpacesOnly,
  filteredStudySpaces,
  savedSpaces,
  toggleValue,
  setSavedSpaces,
  campusData,
}: StudyScreenProps) {
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
