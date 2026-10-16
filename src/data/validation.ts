import type { DiscoveryRecord } from "./discovery";

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isDiscoveryRecord(value: unknown): value is DiscoveryRecord {
  if (!isObject(value)) return false;
  const record = value as Partial<DiscoveryRecord>;
  return typeof record.id === "string"
    && typeof record.source === "string"
    && typeof record.sourceIdentifier === "string"
    && typeof record.sourceName === "string"
    && typeof record.sourceHomepage === "string"
    && typeof record.title === "string"
    && Array.isArray(record.creators) && record.creators.every((item) => typeof item === "string")
    && Array.isArray(record.subjects) && record.subjects.every((item) => typeof item === "string")
    && (record.description === undefined || typeof record.description === "string")
    && (record.publicationDate === undefined || typeof record.publicationDate === "string")
    && (record.datePrecision === undefined || typeof record.datePrecision === "string")
    && (record.accessStatement === undefined || typeof record.accessStatement === "string")
    && typeof record.recordUrl === "string"
    && Array.isArray(record.rights) && record.rights.every((item) => typeof item === "string")
    && typeof record.fetchedAt === "string"
    && ["LIVE", "CACHED", "DEMO", "UNAVAILABLE"].includes(record.mode ?? "");
}

const modes = ["LIVE", "CACHED", "DEMO", "UNAVAILABLE"];
const nullableString = (value: unknown) => value === null || typeof value === "string";
const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
export function isDiscoveryPage(value: unknown): value is import("./discovery").DiscoveryPage {
  return isObject(value) && Array.isArray(value.records) && value.records.every(isDiscoveryRecord)
    && count(value.total) && nullableString(value.nextCursor) && typeof value.query === "string"
    && nullableString(value.source) && typeof value.coverage === "string"
    && nullableString(value.indexUpdatedAt) && modes.includes(value.mode as string);
}
export function isDiscoveryStatus(value: unknown): value is import("./discovery").DiscoveryStatus {
  return isObject(value) && count(value.recordCount) && nullableString(value.indexUpdatedAt)
    && typeof value.coverage === "string" && Array.isArray(value.sources) && value.sources.every((source) =>
      isObject(source) && ["id", "name", "homepage"].every((key) => typeof source[key] === "string")
      && ["enabled", "boundedImport", "hasMore"].every((key) => typeof source[key] === "boolean")
      && ["lastAttemptAt", "lastSuccessAt", "error", "metadataPrefix", "granularity"].every((key) => nullableString(source[key]))
      && count(source.recordCount) && modes.includes(source.mode as string));
}
