import "leaflet/dist/leaflet.css";
import "./CampusMap.web.css";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { CampusPlace } from "../data/mockData";

type CampusMapProps = {
  places: CampusPlace[];
  selectedPlaceId: string;
  onSelectPlace: (place: CampusPlace) => void;
  reducedMotion: boolean;
};

function MapBounds({ places, reducedMotion }: { places: CampusPlace[]; reducedMotion: boolean }) {
  const map = useMap();
  const boundsKey = places
    .map((place) => `${place.latitude},${place.longitude}`)
    .join("|");

  useEffect(() => {
    if (places.length === 0) return;
    map.fitBounds(
      places.map((place) => [place.latitude, place.longitude]),
      { padding: [32, 32], maxZoom: 17, animate: !reducedMotion },
    );
  }, [boundsKey, map, reducedMotion]);

  return null;
}

function AccessibleMarkers({
  places,
  selectedPlaceId,
  onSelectPlace,
}: {
  places: CampusPlace[];
  selectedPlaceId: string;
  onSelectPlace: (place: CampusPlace) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const paths = map.getContainer().querySelectorAll<SVGPathElement>("path.leaflet-interactive");
    const removeListeners = Array.from(paths).map((path, index) => {
      const place = places[index];
      if (!place) return () => {};
      path.setAttribute("role", "button");
      path.setAttribute("tabindex", "0");
      path.setAttribute("aria-label", `${place.name}${place.lifts ? ", sample listing indicates lift access" : ""}`);
      path.setAttribute("aria-pressed", String(selectedPlaceId === place.id));
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelectPlace(place);
      };
      path.addEventListener("keydown", onKeyDown);
      return () => path.removeEventListener("keydown", onKeyDown);
    });
    return () => removeListeners.forEach((remove) => remove());
  }, [map, onSelectPlace, places, selectedPlaceId]);

  return places.map((place) => {
    const selected = selectedPlaceId === place.id;
    return (
      <CircleMarker
        key={place.id}
        center={[place.latitude, place.longitude]}
        radius={selected ? 10 : 7}
        pathOptions={{
          color: selected ? "#4DBBC6" : "#FFFFFF",
          fillColor: selected ? "#011451" : "#526777",
          fillOpacity: 1,
          weight: 3,
        }}
        eventHandlers={{ click: () => onSelectPlace(place) }}
      >
        <Tooltip direction="top" offset={[0, -8]} opacity={1}>
          {place.name}
        </Tooltip>
      </CircleMarker>
    );
  });
}

export default function CampusMap({
  places,
  selectedPlaceId,
  onSelectPlace,
  reducedMotion,
}: CampusMapProps) {
  return (
    <View style={styles.map} accessibilityLabel="Interactive OpenStreetMap of Gilmorehill campus. Use the campus directory below to select a place without using the map.">
      <MapContainer
        center={[55.8725, -4.289]}
        zoom={16}
        scrollWheelZoom={false}
        zoomAnimation={!reducedMotion}
        fadeAnimation={!reducedMotion}
        markerZoomAnimation={!reducedMotion}
        style={styles.leafletMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds places={places} reducedMotion={reducedMotion} />
        <AccessibleMarkers
          places={places}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={onSelectPlace}
        />
      </MapContainer>
    </View>
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
  leafletMap: {
    height: "100%",
    width: "100%",
  },
});
