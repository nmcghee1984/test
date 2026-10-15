import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Platform, StyleSheet } from "react-native";
import type { CampusPlace } from "../data/mockData";

type CampusMapProps = {
  places: CampusPlace[];
  selectedPlaceId: string;
  onSelectPlace: (place: CampusPlace) => void;
  reducedMotion: boolean;
};

export default function CampusMap({
  places,
  selectedPlaceId,
  onSelectPlace,
  reducedMotion,
}: CampusMapProps) {
  return (
    <MapView
      accessibilityLabel="Interactive map of Gilmorehill campus"
      provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
      moveOnMarkerPress={!reducedMotion}
      style={styles.map}
      initialRegion={{
        latitude: 55.8725,
        longitude: -4.289,
        latitudeDelta: 0.0045,
        longitudeDelta: 0.008,
      }}
      showsCompass
      toolbarEnabled
    >
      {places.map((place) => (
        <Marker
          key={place.id}
          coordinate={{ latitude: place.latitude, longitude: place.longitude }}
          title={place.name}
          description={`${place.detail}${place.lifts ? " · Sample listing indicates lift access" : ""}`}
          pinColor={selectedPlaceId === place.id ? "#011451" : undefined}
          onPress={() => onSelectPlace(place)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 320,
    borderRadius: 19,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DCE6E0",
  },
});
