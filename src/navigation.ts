import type { CampusPlace } from "./domain/campus";

export type Tab = "Home" | "Timetable" | "Map" | "Study" | "Discover" | "Ask" | "Events" | "Settings";
export type PlaceFilter = "All" | CampusPlace["category"];

export const tabs: { name: Tab; icon: string }[] = [
  { name: "Home", icon: "⌂" },
  { name: "Timetable", icon: "▦" },
  { name: "Map", icon: "⌖" },
  { name: "Study", icon: "▤" },
  { name: "Discover", icon: "⌕" },
  { name: "Events", icon: "✳" },
];
