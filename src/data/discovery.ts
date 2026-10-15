import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL, apiFetch } from "./apiConnection";
import { isSecureApiUrl } from "./networkPolicy";

export type DataMode = "LIVE" | "CACHED" | "DEMO" | "UNAVAILABLE";

export type DiscoveryRecord = {
  id: string;
  source: string;
  sourceIdentifier: string;
  sourceName: string;
  sourceHomepage: string;
  title: string;
  creators: string[];
  subjects: string[];
  description?: string;
  publicationDate?: string;
  datePrecision?: string;
  recordUrl: string;
  rights: string[];
  accessStatement?: string;
  fetchedAt: string;
  mode: DataMode;
};

export type DiscoverySource = {
  id: string;
  name: string;
  homepage: string;
  enabled: boolean;
  mode: DataMode;
  recordCount: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  error: string | null;
  metadataPrefix: string | null;
  granularity: string | null;
  boundedImport: boolean;
  hasMore: boolean;
};

export type DiscoveryPage = {
  records: DiscoveryRecord[];
  total: number;
  nextCursor: string | null;
  query: string;
  source: string | null;
  coverage: string;
  indexUpdatedAt: string | null;
  mode: DataMode;
};

export type DiscoveryStatus = {
  sources: DiscoverySource[];
  indexUpdatedAt: string | null;
  recordCount: number;
  coverage: string;
};

const CACHE_PREFIX = "uofg-life:discovery-cache:v1:";
const SOURCE_HOSTS: Record<string, string> = {
  "enlighten-publications": "eprints.gla.ac.uk",
  "enlighten-research-data": "researchdata.gla.ac.uk",
  edshare: "edshare.gla.ac.uk",
};

export function isSafeRepositoryRecordUrl(record: DiscoveryRecord): boolean {
  const allowedHost = SOURCE_HOSTS[record.source];
  if (!allowedHost) return false;
  try {
    const url = new URL(record.recordUrl);
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && !url.port
      && (url.hostname === allowedHost || url.hostname.endsWith(`.${allowedHost}`));
  } catch {
    return false;
  }
}

async function getCached<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("Could not read cached discovery data.", error);
    return null;
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  if (!isSecureApiUrl(API_URL)) {
    throw new Error("Refusing to send discovery queries to an insecure API endpoint. Configure HTTPS; plain HTTP is allowed only for localhost development.");
  }
  const response = await apiFetch(path, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Discovery service returned HTTP ${response.status}.`);
  return response.json() as Promise<T>;
}

export async function fetchDiscoveryPage(query: string, source: string | null, cursor = "0"): Promise<DiscoveryPage> {
  const params = new URLSearchParams({ q: query, cursor });
  if (source) params.set("source", source);
  const key = `search:${params.toString()}`;
  try {
    const page = await fetchJson<DiscoveryPage>(`/api/discover?${params.toString()}`);
    try {
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(page));
    } catch (error) {
      console.error("Could not cache public discovery results.", error);
    }
    return page;
  } catch (error) {
    const cached = await getCached<DiscoveryPage>(key);
    if (cached) {
      return {
        ...cached,
        mode: "CACHED",
        records: cached.records.map((record) => ({ ...record, mode: "CACHED" })),
      };
    }
    throw error;
  }
}

export async function fetchDiscoveryStatus(): Promise<DiscoveryStatus> {
  const key = "status";
  try {
    const status = await fetchJson<DiscoveryStatus>("/api/integrations/status");
    try {
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(status));
    } catch (error) {
      console.error("Could not cache public discovery source status.", error);
    }
    return status;
  } catch (error) {
    const cached = await getCached<DiscoveryStatus>(key);
    if (cached) {
      return {
        ...cached,
        sources: cached.sources.map((source) => ({
          ...source,
          mode: source.recordCount ? "CACHED" : "UNAVAILABLE",
        })),
      };
    }
    throw error;
  }
}
