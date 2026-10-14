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
  category: "Study" | "Food" | "Library" | "Access";
  detail: string;
  x: number;
  y: number;
  lifts?: boolean;
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
};

export type CampusEvent = {
  id: string;
  day: string;
  month: string;
  time: string;
  title: string;
  place: string;
  category: string;
  description: string;
};

export const sampleClasses: Record<string, ClassItem[]> = {
  Mon: [
    { id: "mon-1", start: "09:00", end: "10:00", title: "Human Computer Interaction", detail: "Lecture · Dr A. MacLeod", place: "Boyd Orr, Lecture Theatre 1", kind: "Lecture" },
    { id: "mon-2", start: "11:00", end: "12:00", title: "Software Engineering", detail: "Lecture · Prof S. Brown", place: "Sir Alwyn Williams, LT 2", kind: "Lecture" },
    { id: "mon-3", start: "14:00", end: "16:00", title: "Interaction Design Studio", detail: "Practical · Lab group B", place: "James Watt South, 373", kind: "Lab" },
  ],
  Tue: [
    { id: "tue-1", start: "10:00", end: "11:00", title: "Data Structures & Algorithms", detail: "Lecture · Dr R. Khan", place: "Boyd Orr, Lecture Theatre 2", kind: "Lecture" },
    { id: "tue-2", start: "13:00", end: "14:00", title: "Research Methods", detail: "Seminar · Group 4", place: "Gilmorehill Halls, 208", kind: "Seminar" },
  ],
  Wed: [
    { id: "wed-1", start: "09:00", end: "11:00", title: "Database Systems", detail: "Lab · Lab group A", place: "Boyd Orr, 408", kind: "Lab" },
    { id: "wed-2", start: "12:00", end: "13:00", title: "Human Computer Interaction", detail: "Seminar · Group 2", place: "Computing Science, 213", kind: "Seminar" },
  ],
  Thu: [
    { id: "thu-1", start: "11:00", end: "12:00", title: "Software Engineering", detail: "Tutorial · Group 1", place: "Sir Alwyn Williams, 225", kind: "Seminar" },
    { id: "thu-2", start: "14:00", end: "16:00", title: "Data Structures & Algorithms", detail: "Lab · Lab group C", place: "Boyd Orr, 407", kind: "Lab" },
  ],
  Fri: [
    { id: "fri-1", start: "10:00", end: "11:00", title: "Research Methods", detail: "Lecture · Dr E. Stewart", place: "Graham Kerr, Lecture Theatre", kind: "Lecture" },
  ],
};

export const campusPlaces: CampusPlace[] = [
  { id: "library", name: "University Library", category: "Library", detail: "Main entrance · 2 min walk", x: 48, y: 43, lifts: true },
  { id: "boyd", name: "Boyd Orr Building", category: "Study", detail: "Lecture theatres · 4 min walk", x: 70, y: 31, lifts: true },
  { id: "union", name: "Students' Representative Council", category: "Food", detail: "Cafe and student services · 3 min walk", x: 29, y: 62 },
  { id: "main", name: "Main Building", category: "Access", detail: "Visitor entrance · 5 min walk", x: 51, y: 17, lifts: true },
  { id: "james", name: "James Watt South", category: "Study", detail: "Study rooms · 6 min walk", x: 77, y: 63, lifts: true },
];

export const studySpaces: StudySpace[] = [
  { id: "library-3", name: "Silent Study", building: "University Library", level: "Level 3", available: 18, total: 80, walk: "2 min", quiet: true },
  { id: "library-ground", name: "Learning Hub", building: "University Library", level: "Ground floor", available: 42, total: 120, walk: "2 min", quiet: false },
  { id: "boyd-4", name: "Study Zone", building: "Boyd Orr Building", level: "Level 4", available: 9, total: 36, walk: "4 min", quiet: true },
  { id: "james-2", name: "Group Study", building: "James Watt South", level: "Level 2", available: 6, total: 24, walk: "6 min", quiet: false },
];

export const campusEvents: CampusEvent[] = [
  { id: "freshers", day: "18", month: "OCT", time: "18:00", title: "Gilmorehill After Hours", place: "Gilmorehill Campus", category: "SOCIAL", description: "An evening of music, food and campus activities." },
  { id: "careers", day: "20", month: "OCT", time: "12:30", title: "Tech & Innovation Careers Fair", place: "James McCune Smith Learning Hub", category: "CAREERS", description: "Meet employers and discover graduate opportunities." },
  { id: "wellbeing", day: "22", month: "OCT", time: "10:00", title: "Mindful Campus Walk", place: "Meet at the Main Gate", category: "WELLBEING", description: "A relaxed guided walk around the West End." },
];
