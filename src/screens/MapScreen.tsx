import type { Dispatch, SetStateAction } from "react";
import { Platform, ScrollView, View } from "react-native";
import { ActionButton, Label, SectionTitle } from "../components/CampusCards";
import CampusMap from "../components/CampusMap";
import type { AppPreferences, CampusDataSource } from "../data/storage";
import type { CampusPlace } from "../domain/campus";
import type { PlaceFilter } from "../navigation";
import { Pressable, Text, TextInput } from "../ui/primitives";
import { styles } from "../ui/styles";
import { palette } from "../ui/theme";

type MapScreenProps = {
  mapSearch: string;
  setMapSearch: Dispatch<SetStateAction<string>>;
  placeFilter: PlaceFilter;
  setPlaceFilter: Dispatch<SetStateAction<PlaceFilter>>;
  setSelectedPlace: Dispatch<SetStateAction<CampusPlace>>;
  displayedPlaces: CampusPlace[];
  selectedPlace: CampusPlace;
  preferences: AppPreferences;
  systemReducedMotion: boolean;
  toggleValue: (values: string[], id: string, update: (next: string[]) => void) => void;
  savedPlaces: string[];
  setSavedPlaces: Dispatch<SetStateAction<string[]>>;
  openExternal: (url: string) => Promise<void>;
  facilitySearch: string;
  setFacilitySearch: Dispatch<SetStateAction<string>>;
  setDirectoryAccessOnly: Dispatch<SetStateAction<boolean>>;
  directoryAccessOnly: boolean;
  campusData: CampusDataSource;
};

export default function MapScreen({
  mapSearch,
  setMapSearch,
  placeFilter,
  setPlaceFilter,
  setSelectedPlace,
  displayedPlaces,
  selectedPlace,
  preferences,
  systemReducedMotion,
  toggleValue,
  savedPlaces,
  setSavedPlaces,
  openExternal,
  facilitySearch,
  setFacilitySearch,
  setDirectoryAccessOnly,
  directoryAccessOnly,
  campusData,
}: MapScreenProps) {
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
