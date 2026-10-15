import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Pressable as NativePressable,
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  View,
  type TextProps,
  type PressableProps,
  type TextInputProps,
} from "react-native";
import {
  DiscoveryPage,
  DiscoveryRecord,
  DiscoverySource,
  DataMode,
  fetchDiscoveryPage,
  fetchDiscoveryStatus,
  isSafeRepositoryRecordUrl,
} from "../data/discovery";

const COLORS = {
  blue: "#011451",
  turquoise: "#4DBBC6",
  paper: "#F3F6F9",
  white: "#FFFFFF",
  ink: "#173047",
  muted: "#526777",
  border: "#E1E8EE",
  pale: "#E8F3F8",
  gold: "#F2D25C",
};
const SUGGESTIONS = ["climate", "health", "history", "data science", "education", "Glasgow"];
const AccessibilityContext = createContext({ scale: 1, highContrast: false });

function Text({ style, ...props }: TextProps) {
  const accessibility = useContext(AccessibilityContext);
  const flattened = StyleSheet.flatten(style);
  const mutedColors = ["#687B8B", "#9AA39E", "#9AA59E", "#929C95", "#8C9691", "#829087", "#718493", "#85948A", "#8B9991"];
  const color = accessibility.highContrast && typeof flattened?.color === "string"
    && (flattened.color.toUpperCase() === COLORS.muted || mutedColors.includes(flattened.color.toUpperCase()))
    ? COLORS.ink
    : undefined;
  const fontSize = typeof flattened?.fontSize === "number"
    ? Math.max(11, flattened.fontSize) * accessibility.scale
    : undefined;
  return (
    <NativeText
      {...props}
      accessibilityRole={props.accessibilityRole
        ?? (typeof flattened?.fontSize === "number" && flattened.fontSize >= 25 ? "header" : undefined)}
      style={[
        style,
        {
          ...(fontSize ? { fontSize } : {}),
          ...(color ? { color } : {}),
        },
      ]}
    />
  );
}

function Pressable(props: PressableProps) {
  return <NativePressable hitSlop={8} {...props} />;
}

function TextInput({ style, ...props }: TextInputProps) {
  const accessibility = useContext(AccessibilityContext);
  const inputStyle = StyleSheet.flatten(style);
  const fontSize = typeof inputStyle?.fontSize === "number"
    ? Math.max(16, inputStyle.fontSize) * accessibility.scale
    : undefined;
  return (
    <NativeTextInput
      {...props}
      style={[style, ...(fontSize ? [{ fontSize }] : [])]}
    />
  );
}

function ModeTag({ mode }: { mode: DataMode }) {
  return (
    <View style={[styles.modeTag, mode === "LIVE" ? styles.liveTag : mode === "CACHED" ? styles.cachedTag : styles.unavailableTag]}>
      <Text style={styles.modeText}>{mode}</Text>
    </View>
  );
}

function rankRecommendations(records: DiscoveryRecord[], interests: string[]) {
  const normalizedInterests = interests.map((interest) => interest.trim().toLocaleLowerCase()).filter(Boolean);
  if (!normalizedInterests.length) return [];
  return records
    .map((record) => {
      const searchable = [record.title, ...record.creators, ...record.subjects, record.description ?? ""]
        .join(" ").toLocaleLowerCase();
      const matches = normalizedInterests.filter((interest) => searchable.includes(interest));
      return { record, matches };
    })
    .filter((item) => item.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length)
    .slice(0, 3);
}

export default function DiscoverScreen({
  savedResearch,
  interests,
  largerText,
  highContrast,
  onToggleSaved,
  onInterestsChange,
}: {
  savedResearch: DiscoveryRecord[];
  interests: string[];
  largerText: boolean;
  highContrast: boolean;
  onToggleSaved: (record: DiscoveryRecord) => void;
  onInterestsChange: (interests: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [page, setPage] = useState<DiscoveryPage | null>(null);
  const [sources, setSources] = useState<DiscoverySource[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [interestDraft, setInterestDraft] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const pageGeneration = useRef(0);

  async function loadStatus() {
    setStatusLoading(true);
    setStatusError("");
    try {
      const status = await fetchDiscoveryStatus();
      setSources(status.sources);
    } catch (cause) {
      setStatusError(cause instanceof Error ? cause.message : "Source status could not be loaded.");
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    let current = true;
    pageGeneration.current += 1;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      fetchDiscoveryPage(query, sourceFilter).then((result) => {
        if (current) setPage(result);
      }).catch((cause: unknown) => {
        if (current) {
          setPage(null);
          setError(cause instanceof Error ? cause.message : "Research records could not be loaded.");
        }
      }).finally(() => {
        if (current) setLoading(false);
      });
    }, 250);
    return () => {
      current = false;
      pageGeneration.current += 1;
      clearTimeout(timer);
    };
  }, [query, sourceFilter, retryVersion]);

  const recommendations = useMemo(
    () => rankRecommendations(page?.records ?? [], interests),
    [page?.records, interests],
  );
  const records = page?.records ?? [];

  function addInterest(value: string) {
    const interest = value.trim().slice(0, 40);
    if (!interest || interests.some((item) => item.toLocaleLowerCase() === interest.toLocaleLowerCase())) return;
    onInterestsChange([...interests, interest].slice(0, 20));
    setInterestDraft("");
  }

  function removeInterest(interest: string) {
    onInterestsChange(interests.filter((item) => item !== interest));
  }

  async function openRecord(record: DiscoveryRecord) {
    if (!isSafeRepositoryRecordUrl(record)) {
      setError("This saved record has an unsafe or unverified repository link.");
      return;
    }
    try {
      await Linking.openURL(record.recordUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The repository record could not be opened.");
    }
  }

  async function loadMore() {
    if (!page?.nextCursor || loadingMore) return;
    const generation = pageGeneration.current;
    setLoadingMore(true);
    try {
      const next = await fetchDiscoveryPage(query, sourceFilter, page.nextCursor);
      if (generation === pageGeneration.current) setPage({ ...next, records: [...page.records, ...next.records] });
    } catch (cause) {
      if (generation === pageGeneration.current) {
        setError(cause instanceof Error ? cause.message : "More research records could not be loaded.");
      }
    } finally {
      setLoadingMore(false);
    }
  }

  function renderRecord(record: DiscoveryRecord, recommendation?: string) {
    const saved = savedResearch.some((item) => item.id === record.id);
    return (
      <View key={record.id} style={styles.recordCard}>
        <View style={styles.recordTop}>
          <Text style={styles.sourceName}>{record.sourceName.toUpperCase()}</Text>
          <ModeTag mode={record.mode} />
        </View>
        <Pressable onPress={() => void openRecord(record)} accessibilityRole="link" accessibilityLabel={`Open ${record.title} in the repository`}>
          <Text style={styles.recordTitle}>{record.title}</Text>
        </Pressable>
        {record.creators.length ? <Text style={styles.recordMeta}>{record.creators.join(", ")}</Text> : null}
        {record.publicationDate ? <Text style={styles.recordMeta}>Published: {record.publicationDate}</Text> : null}
        {record.description ? <Text style={styles.description} numberOfLines={4}>{record.description}</Text> : null}
        {record.subjects.length ? (
          <View style={styles.subjectList}>
            {record.subjects.slice(0, 4).map((subject) => <Text key={subject} style={styles.subject}>{subject}</Text>)}
          </View>
        ) : null}
        {recommendation ? <Text style={styles.explanation}>Recommended because it matches: {recommendation}</Text> : null}
        <View style={styles.recordActions}>
          <Pressable onPress={() => void openRecord(record)} accessibilityRole="link" accessibilityLabel={`Open ${record.title} in the repository`}>
            <Text style={styles.link}>View in repository ↗</Text>
          </Pressable>
          <Pressable
            onPress={() => onToggleSaved({ ...record, mode: "CACHED" })}
            accessibilityRole="button"
            accessibilityLabel={saved ? `Remove ${record.title} from saved research` : `Save ${record.title}`}
            accessibilityState={{ selected: saved }}
            aria-pressed={saved}
          >
            <Text style={[styles.saveAction, saved && styles.savedAction]}>{saved ? "Saved ♥" : "Save ♡"}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <AccessibilityContext.Provider value={{ scale: largerText ? 1.18 : 1, highContrast }}>
    <>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>PUBLIC UNIVERSITY RESEARCH</Text>
        <Text style={styles.title}>Discover Glasgow</Text>
        <Text style={styles.subtitle}>Search publications and research records from University repositories.</Text>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Public research only</Text>
        <Text style={styles.noticeBody}>This index contains repository metadata, not private student services or full-text content. Search coverage is bounded and may be incomplete.</Text>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search titles, authors and subjects"
        placeholderTextColor={COLORS.muted}
        accessibilityLabel="Search public research records"
        returnKeyType="search"
        style={styles.search}
      />
      <View style={styles.filters}>
        <Pressable onPress={() => setSourceFilter(null)} accessibilityRole="button" accessibilityState={{ selected: sourceFilter === null }} aria-pressed={sourceFilter === null} style={[styles.filter, sourceFilter === null && styles.filterSelected]}>
          <Text style={[styles.filterText, sourceFilter === null && styles.filterTextSelected]}>All sources</Text>
        </Pressable>
        {sources.map((source) => (
          <Pressable
            key={source.id}
            onPress={() => setSourceFilter(source.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: sourceFilter === source.id }}
            aria-pressed={sourceFilter === source.id}
            style={[styles.filter, sourceFilter === source.id && styles.filterSelected]}
          >
            <Text style={[styles.filterText, sourceFilter === source.id && styles.filterTextSelected]}>
              {source.name.replace("Enlighten ", "")}{source.enabled ? "" : " · off"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHead}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Repository status</Text>
          <Pressable onPress={() => void loadStatus()} accessibilityRole="button" accessibilityLabel={statusLoading ? "Checking repository status" : "Refresh repository status"}>
          <Text style={styles.link}>{statusLoading ? "Checking…" : "Refresh"}</Text>
        </Pressable>
      </View>
      {sources.map((source) => (
        <View key={source.id} style={styles.statusRow}>
          <View style={styles.statusCopy}>
            <Text style={styles.statusName}>{source.name}</Text>
            <Text style={styles.statusDetails}>
              {source.enabled
                ? `${source.recordCount.toLocaleString()} indexed records${source.lastSuccessAt ? ` · updated ${new Date(source.lastSuccessAt).toLocaleDateString()}` : ""}${source.boundedImport ? " · bounded import" : ""}${source.hasMore ? " · more records not indexed" : ""}`
                : "Not enabled in this prototype"}
            </Text>
            {source.error ? <Text style={styles.statusError}>Last refresh issue: {source.error}</Text> : null}
          </View>
          <ModeTag mode={source.mode} />
        </View>
      ))}
      {statusError ? (
        <View style={styles.statusRow} accessibilityRole="alert">
          <View style={styles.statusCopy}>
            <Text style={styles.statusName}>Discovery service</Text>
            <Text style={styles.statusError}>{statusError}</Text>
          </View>
          <ModeTag mode="UNAVAILABLE" />
        </View>
      ) : null}

      <View style={styles.sectionHead}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Your interests</Text>
        <Text style={styles.localOnly}>Saved on this device</Text>
      </View>
      <View style={styles.interestList}>
        {interests.map((interest) => (
          <Pressable key={interest} onPress={() => removeInterest(interest)} accessibilityRole="button" accessibilityLabel={`Remove interest ${interest}`} style={styles.interestChip}>
            <Text style={styles.interestText}>{interest} ×</Text>
          </Pressable>
        ))}
        {!interests.length ? <Text style={styles.helper}>Add topics to get explainable recommendations from the current result set.</Text> : null}
      </View>
      <View style={styles.addInterestRow}>
        <TextInput
          value={interestDraft}
          onChangeText={setInterestDraft}
          onSubmitEditing={() => addInterest(interestDraft)}
          placeholder="Add a topic"
          placeholderTextColor={COLORS.muted}
          accessibilityLabel="Add a research interest"
          maxLength={40}
          style={[styles.search, styles.interestInput]}
        />
        <Pressable onPress={() => addInterest(interestDraft)} accessibilityRole="button" style={styles.addButton}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>
      <View style={styles.suggestions}>
        {SUGGESTIONS.map((interest) => (
          <Pressable key={interest} onPress={() => addInterest(interest)} accessibilityRole="button" style={styles.suggestionChip}>
            <Text style={styles.suggestionText}>+ {interest}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHead}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {recommendations.length ? "Recommended for you" : query ? "Search results" : "Recent records"}
        </Text>
        <Text style={styles.localOnly}>{page ? `${page.total} found · ${page.mode}` : ""}</Text>
      </View>
      {loading ? <Text accessibilityLiveRegion="polite" aria-live="polite" style={styles.helper}>Searching repository index…</Text> : null}
      {error ? (
        <Pressable onPress={() => setRetryVersion((version) => version + 1)} accessibilityRole="button" accessibilityLabel={`Retry search. ${error}`}>
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error} · Tap to retry</Text>
            <ModeTag mode="UNAVAILABLE" />
          </View>
        </Pressable>
      ) : null}
      {!loading && page && records.length === 0 ? <Text style={styles.helper}>No matching public records found.</Text> : null}
      {records.map((record) => {
        const recommendation = recommendations.find((item) => item.record.id === record.id);
        return renderRecord(record, recommendation?.matches.join(", "));
      })}
      {page?.nextCursor ? (
        <Pressable onPress={() => void loadMore()} disabled={loadingMore} accessibilityRole="button" style={styles.moreButton}>
          <Text style={styles.moreButtonText}>{loadingMore ? "Loading…" : "Load more records"}</Text>
        </Pressable>
      ) : null}

      <View style={styles.sectionHead}><Text accessibilityRole="header" style={styles.sectionTitle}>Saved research</Text></View>
      {savedResearch.length
        ? savedResearch.map((record) => renderRecord(record))
        : <Text style={styles.helper}>Saved records stay on this device. Bookmark a result to keep it here.</Text>}
      <Text style={styles.coverage}>{page?.coverage ?? "Repository search requires the local public discovery API."}</Text>
    </>
    </AccessibilityContext.Provider>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 17 },
  eyebrow: { color: COLORS.blue, fontSize: 9, fontWeight: "800", letterSpacing: 1.3, marginBottom: 6 },
  title: { color: COLORS.ink, fontSize: 27, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  notice: { backgroundColor: COLORS.pale, borderLeftWidth: 3, borderLeftColor: COLORS.turquoise, borderRadius: 12, padding: 13, marginBottom: 14 },
  noticeTitle: { color: COLORS.blue, fontSize: 11, fontWeight: "800", marginBottom: 4 },
  noticeBody: { color: COLORS.ink, fontSize: 10, lineHeight: 15 },
  search: { minHeight: 44, borderRadius: 12, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.ink, fontSize: 12, marginBottom: 11 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 18 },
  filter: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7 },
  filterSelected: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  filterText: { color: COLORS.muted, fontSize: 9, fontWeight: "600" },
  filterTextSelected: { color: COLORS.white },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 9 },
  sectionTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800" },
  link: { color: COLORS.blue, fontSize: 10, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, padding: 11, marginBottom: 7 },
  statusCopy: { flex: 1, paddingRight: 8 },
  statusName: { color: COLORS.ink, fontSize: 10, fontWeight: "700" },
  statusDetails: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
  statusError: { color: "#8C2020", fontSize: 9, marginTop: 4 },
  modeTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, alignSelf: "flex-start" },
  liveTag: { backgroundColor: "#E0F2E8" },
  cachedTag: { backgroundColor: "#FFF3D6" },
  unavailableTag: { backgroundColor: "#ECEFF2" },
  modeText: { color: COLORS.ink, fontSize: 8, fontWeight: "800", letterSpacing: 0.3 },
  errorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, backgroundColor: "#FCE8E8", padding: 10, borderRadius: 9, marginBottom: 9 },
  errorText: { color: "#8C2020", fontSize: 10, flex: 1 },
  localOnly: { color: COLORS.muted, fontSize: 8 },
  interestList: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  interestChip: { backgroundColor: COLORS.blue, borderRadius: 15, paddingHorizontal: 10, paddingVertical: 6 },
  interestText: { color: COLORS.white, fontSize: 9, fontWeight: "700" },
  helper: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginBottom: 9 },
  addInterestRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  interestInput: { flex: 1, marginBottom: 0 },
  addButton: { minHeight: 44, justifyContent: "center", backgroundColor: COLORS.blue, borderRadius: 11, paddingVertical: 12, paddingHorizontal: 16 },
  addButtonText: { color: COLORS.white, fontSize: 10, fontWeight: "800" },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8, marginBottom: 16 },
  suggestionChip: { minHeight: 44, justifyContent: "center", borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 5, paddingHorizontal: 8 },
  suggestionText: { color: COLORS.muted, fontSize: 8 },
  recordCard: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, padding: 13, marginBottom: 9 },
  recordTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sourceName: { color: COLORS.blue, fontSize: 8, fontWeight: "800", letterSpacing: 0.7, flex: 1, paddingRight: 8 },
  recordTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "800", lineHeight: 19 },
  recordMeta: { color: COLORS.muted, fontSize: 9, lineHeight: 14, marginTop: 5 },
  description: { color: COLORS.ink, fontSize: 10, lineHeight: 15, marginTop: 7 },
  subjectList: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  subject: { backgroundColor: COLORS.paper, color: COLORS.muted, fontSize: 8, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 },
  explanation: { color: COLORS.blue, backgroundColor: COLORS.pale, borderRadius: 8, padding: 7, marginTop: 8, fontSize: 9, lineHeight: 14 },
  recordActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 11, paddingTop: 9, borderTopWidth: 1, borderTopColor: COLORS.border },
  saveAction: { color: COLORS.muted, fontSize: 10, fontWeight: "700" },
  savedAction: { color: "#A33C53" },
  moreButton: { minHeight: 44, borderWidth: 1, borderColor: COLORS.blue, borderRadius: 11, alignItems: "center", justifyContent: "center", padding: 12, marginVertical: 7 },
  moreButtonText: { color: COLORS.blue, fontSize: 10, fontWeight: "800" },
  coverage: { color: COLORS.muted, fontSize: 9, lineHeight: 14, marginTop: 11, marginBottom: 12 },
});
