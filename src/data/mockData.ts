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

export type CampusEvent = {
  id: string;
  date: string;
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
  { id: "library", name: "University Library", category: "Library", detail: "Main entrance · 2 min walk", x: 48, y: 43, latitude: 55.8734142, longitude: -4.289018, lifts: true, openingHours: "Sample hours · check with the venue", accessibility: "Lift access listed in sample data", facilities: ["Study spaces", "Accessible entrance", "Printing"] },
  { id: "boyd", name: "Boyd Orr Building", category: "Study", detail: "Lecture theatres · 4 min walk", x: 70, y: 31, latitude: 55.8735911, longitude: -4.2927261, lifts: true, openingHours: "Sample hours · check with the venue", accessibility: "Step-free access listed in sample data", facilities: ["Study spaces", "Lecture theatres", "Accessible entrance"] },
  { id: "union", name: "Glasgow University Union", category: "Food", detail: "Cafe and social spaces · 3 min walk", x: 29, y: 62, latitude: 55.8724503, longitude: -4.2850094, openingHours: "Sample hours · check with the venue", accessibility: "Confirm access arrangements with the venue", facilities: ["Cafe", "Social space", "Student support"] },
  { id: "main", name: "Main Building", category: "Access", detail: "Visitor entrance · 5 min walk", x: 51, y: 17, latitude: 55.8723, longitude: -4.2895, lifts: true, openingHours: "Sample hours · check with the venue", accessibility: "Lift access listed in sample data", facilities: ["Accessible entrance", "Visitor information"] },
  { id: "james", name: "James Watt South", category: "Study", detail: "Study rooms · 6 min walk", x: 77, y: 63, latitude: 55.87115, longitude: -4.2896, lifts: true, openingHours: "Sample hours · check with the venue", accessibility: "Step-free access listed in sample data", facilities: ["Study spaces", "Group rooms", "Accessible entrance"] },
  { id: "learning-hub", name: "James McCune Smith Learning Hub", category: "Study", detail: "Study and student services · 7 min walk", x: 37, y: 77, latitude: 55.87026, longitude: -4.2883, lifts: true, openingHours: "Sample hours · check with the venue", accessibility: "Step-free access listed in sample data", facilities: ["Study spaces", "Cafe", "Accessible entrance", "Printing"] },
  { id: "student-support", name: "Student support", category: "Support", detail: "Ask for help and advice · 5 min walk", x: 45, y: 28, latitude: 55.8729, longitude: -4.2908, openingHours: "Sample hours · check with the service", accessibility: "Contact the service to discuss access needs", facilities: ["Student advice", "Wellbeing support"] },
  { id: "prayer-room", name: "Prayer and reflection space", category: "Support", detail: "Quiet space · 6 min walk", x: 57, y: 55, latitude: 55.8719, longitude: -4.2916, openingHours: "Sample hours · check with the venue", accessibility: "Confirm step-free access with the venue", facilities: ["Quiet space", "Prayer space"] },
  { id: "bike-parking", name: "Cycle parking", category: "Facilities", detail: "Campus cycle parking · 4 min walk", x: 18, y: 47, latitude: 55.8731, longitude: -4.2865, openingHours: "Outdoor facility", accessibility: "Outdoor route conditions may vary", facilities: ["Cycle parking"] },
  { id: "accessible-toilet", name: "Accessible facilities", category: "Access", detail: "Ask venue staff to confirm location · 3 min walk", x: 62, y: 39, latitude: 55.8727, longitude: -4.2877, openingHours: "Sample listing · confirm with venue", accessibility: "Details not verified; contact venue before travelling", facilities: ["Accessible toilet · sample listing"] },
  { id: "computing-science", name: "Computing Science", category: "Study", detail: "Teaching and research · campus", x: 57, y: 26, latitude: 55.8725, longitude: -4.2899, openingHours: "Sample hours · check with the venue", accessibility: "Confirm access arrangements with the venue", facilities: ["Teaching rooms", "Research facilities"] },
  { id: "sir-alwyn-williams", name: "Sir Alwyn Williams Building", category: "Study", detail: "Teaching rooms · campus", x: 74, y: 25, latitude: 55.8725, longitude: -4.292, openingHours: "Sample hours · check with the venue", accessibility: "Confirm access arrangements with the venue", facilities: ["Teaching rooms", "Study spaces"] },
  { id: "gilmorehill-halls", name: "Gilmorehill Halls", category: "Study", detail: "Teaching rooms · campus", x: 83, y: 39, latitude: 55.8742, longitude: -4.291, openingHours: "Sample hours · check with the venue", accessibility: "Confirm access arrangements with the venue", facilities: ["Teaching rooms"] },
  { id: "graham-kerr", name: "Graham Kerr Building", category: "Study", detail: "Teaching rooms · campus", x: 22, y: 28, latitude: 55.8721, longitude: -4.2877, openingHours: "Sample hours · check with the venue", accessibility: "Confirm access arrangements with the venue", facilities: ["Teaching rooms", "Lecture theatres"] },
];

export const studySpaces: StudySpace[] = [
  { id: "library-3", name: "Silent Study", building: "University Library", level: "Level 3", available: 18, total: 80, walk: "2 min", quiet: true, openingHours: "Daily 08:00–22:00 · sample", openFrom: "08:00", openUntil: "22:00", openWeekends: true, stepFree: true, facilities: ["Power sockets", "Quiet study", "Accessible route"] },
  { id: "library-ground", name: "Learning Hub", building: "University Library", level: "Ground floor", available: 42, total: 120, walk: "2 min", quiet: false, openingHours: "Daily 08:00–22:00 · sample", openFrom: "08:00", openUntil: "22:00", openWeekends: true, stepFree: true, facilities: ["Power sockets", "Cafe nearby", "Accessible route"] },
  { id: "boyd-4", name: "Study Zone", building: "Boyd Orr Building", level: "Level 4", available: 9, total: 36, walk: "4 min", quiet: true, openingHours: "Weekdays 08:00–20:00 · sample", openFrom: "08:00", openUntil: "20:00", openWeekends: false, stepFree: true, facilities: ["Power sockets", "Quiet study", "Lift access"] },
  { id: "james-2", name: "Group Study", building: "James Watt South", level: "Level 2", available: 6, total: 24, walk: "6 min", quiet: false, openingHours: "Weekdays 08:00–20:00 · sample", openFrom: "08:00", openUntil: "20:00", openWeekends: false, stepFree: true, facilities: ["Group tables", "Power sockets", "Lift access"] },
];

export const campusEvents: CampusEvent[] = [
  { id: "freshers", date: "2026-10-18", day: "18", month: "OCT", time: "18:00", title: "Gilmorehill After Hours", place: "Gilmorehill Campus", category: "SOCIAL", description: "An evening of music, food and campus activities." },
  { id: "careers", date: "2026-10-20", day: "20", month: "OCT", time: "12:30", title: "Tech & Innovation Careers Fair", place: "James McCune Smith Learning Hub", category: "CAREERS", description: "Meet employers and discover graduate opportunities." },
  { id: "wellbeing", date: "2026-10-22", day: "22", month: "OCT", time: "10:00", title: "Mindful Campus Walk", place: "Meet at the Main Gate", category: "WELLBEING", description: "A relaxed guided walk around the West End." },
];
