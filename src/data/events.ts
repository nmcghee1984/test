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

// No feed for the central listings has yet been verified for app reuse.
// Do not replace this with HTML scraping or bundled snapshots of public pages.
export const universityEvents = {
  mode: "UNAVAILABLE" as const,
  events: [] as CampusEvent[],
  listingsUrl: "https://www.gla.ac.uk/events/listings/",
  message: "University event listings are not connected to this app yet. Browse the official website for current events.",
};
