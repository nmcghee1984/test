import { View } from "react-native";
import type { CampusEvent } from "../data/events";
import type { ClassItem } from "../domain/campus";
import { Pressable, Text } from "../ui/primitives";
import { styles } from "../ui/styles";
import { palette } from "../ui/theme";

export function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ActionButton({
  title,
  onPress,
  selected = false,
}: {
  title: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      style={[styles.actionButton, selected && styles.actionButtonSelected]}
    >
      <Text style={[styles.actionButtonText, selected && styles.actionButtonTextSelected]}>{title}</Text>
    </Pressable>
  );
}

export function ClassCard({
  item,
  compact = false,
  reminderEnabled = false,
  onReminder,
  onCalendar,
  onPlace,
}: {
  item: ClassItem;
  compact?: boolean;
  reminderEnabled?: boolean;
  onReminder?: () => void;
  onCalendar?: () => void;
  onPlace?: () => void;
}) {
  return (
    <View style={[styles.classCard, compact && styles.classCardCompact]}>
      <View style={styles.classTime}>
        <Text style={styles.classStart}>{item.start}</Text>
        <Text style={styles.classEnd}>{item.end}</Text>
      </View>
      <View style={styles.classDivider} />
      <View style={styles.classInfo}>
        <Text style={styles.classKind}>{item.kind.toUpperCase()}</Text>
        <Text style={styles.className}>{item.title}</Text>
        {onPlace ? (
          <Pressable onPress={onPlace} accessibilityRole="button" accessibilityLabel={`Show ${item.place} on the campus map`}>
            <Text style={styles.locationLink}>{item.place} · Directions</Text>
          </Pressable>
        ) : <Text style={styles.bodyMuted}>{item.place}</Text>}
        {!compact ? <Text style={styles.classDetail}>{item.detail}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
      {!compact && (onReminder || onCalendar) ? (
        <View style={styles.classActions}>
          {onReminder ? (
            <Pressable
              onPress={onReminder}
              accessibilityRole="button"
              accessibilityLabel={reminderEnabled ? `Remove reminder for ${item.title}` : `Set reminder for ${item.title}`}
              accessibilityState={{ selected: reminderEnabled }}
              aria-pressed={reminderEnabled}
            >
              <Text style={styles.inlineAction}>{reminderEnabled ? "✓ Reminder on" : "◷ Remind me"}</Text>
            </Pressable>
          ) : null}
          {onCalendar ? (
            <Pressable onPress={onCalendar} accessibilityRole="button" accessibilityLabel={`Add ${item.title} to calendar`}>
              <Text style={styles.inlineAction}>＋ Calendar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function CapacityBar({ available, total }: { available: number; total: number }) {
  const ratio = Math.max(0, Math.min(1, available / total));
  const color = ratio > 0.35 ? palette.universityBlue : ratio > 0.15 ? "#876100" : "#B5474D";
  return (
    <View
      style={styles.capacityTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: available }}
      accessibilityLabel={`${available} of ${total} spaces available`}
    >
      <View style={[styles.capacityFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export function EventCard({
  event,
  saved,
  reminderEnabled,
  onSave,
  onReminder,
  onCalendar,
}: {
  event: CampusEvent;
  saved: boolean;
  reminderEnabled: boolean;
  onSave: () => void;
  onReminder: () => void;
  onCalendar: () => void;
}) {
  return (
    <View style={styles.eventCard}>
      <View style={styles.eventDate}>
        <Text style={styles.eventDay}>{event.day}</Text>
        <Text style={styles.eventMonth}>{event.month}</Text>
      </View>
      <View style={styles.eventCopy}>
        <Text style={styles.eventCategory}>{event.category}</Text>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.bodyMuted}>{event.time} · {event.place}</Text>
        <Text style={styles.eventDescription}>{event.description}</Text>
        <Pressable
          onPress={onSave}
          accessibilityRole="button"
          accessibilityLabel={saved ? `Remove ${event.title} from saved events` : `Save ${event.title}`}
          accessibilityState={{ selected: saved }}
          aria-pressed={saved}
          style={[styles.smallButton, saved && styles.smallButtonSelected]}
        >
          <Text style={[styles.smallButtonText, saved && styles.smallButtonTextSelected]}>
            {saved ? "✓  Saved" : "＋  Save event"}
          </Text>
        </Pressable>
        <View style={styles.eventActions}>
          <Pressable
            onPress={onReminder}
            accessibilityRole="button"
            accessibilityLabel={reminderEnabled ? `Remove reminder for ${event.title}` : `Set reminder for ${event.title}`}
            accessibilityState={{ selected: reminderEnabled }}
            aria-pressed={reminderEnabled}
          >
            <Text style={styles.inlineAction}>{reminderEnabled ? "✓ Reminder on" : "◷ Remind me"}</Text>
          </Pressable>
          <Pressable onPress={onCalendar} accessibilityRole="button" accessibilityLabel={`Add ${event.title} to calendar`}>
            <Text style={styles.inlineAction}>＋ Calendar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function SettingToggle({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <Pressable
      onPress={onChange}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      style={styles.settingRow}
    >
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.bodyMuted}>{description}</Text>
      </View>
      <View style={[styles.switchTrack, value && styles.switchTrackActive]}>
        <View style={[styles.switchKnob, value && styles.switchKnobActive]} />
      </View>
    </Pressable>
  );
}
