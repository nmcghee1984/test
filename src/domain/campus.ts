/** Prototype campus models; not an approved University API contract. */
export type ClassItem = {
  id: string;
  start: string;
  end: string;
  title: string;
  detail: string;
  place: string;
  kind: "Lecture" | "Lab" | "Seminar";
};

export type CampusPlace = {
  id: string;
  name: string;
  category: "Study" | "Food" | "Library" | "Access" | "Support" | "Facilities";
  detail: string;
  x: number;
  y: number;
  latitude: number;
  longitude: number;
  lifts?: boolean;
  openingHours: string;
  accessibility: string;
  facilities: string[];
};

export type StudySpace = {
  id: string;
  name: string;
  building: string;
  level: string;
  available: number;
  total: number;
  walk: string;
  quiet: boolean;
  openingHours: string;
  openFrom: string;
  openUntil: string;
  openWeekends: boolean;
  stepFree: boolean;
  facilities: string[];
};

