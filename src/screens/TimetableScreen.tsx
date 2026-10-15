import type { Dispatch, SetStateAction } from "react";
import { View } from "react-native";
import { ClassCard, Label } from "../components/CampusCards";
import type { CampusDataSource } from "../data/storage";
import type { ClassItem } from "../domain/campus";
import type { PlaceFilter, Tab } from "../navigation";
import { Pressable, Text } from "../ui/primitives";
import { styles } from "../ui/styles";
import { dayLetters, localDateKey, weekDays } from "../utils/schedule";

type TimetableScreenProps = {
  setWeekOffset: Dispatch<SetStateAction<number>>;
  weekStart: Date;
  selectedDay: string;
  setSelectedDay: Dispatch<SetStateAction<string>>;
  selectedDate: Date;
  classes: ClassItem[];
  reminders: Record<string, string>;
  toggleClassReminder: (item: ClassItem) => void;
  addClassToCalendar: (item: ClassItem) => void;
  setMapSearch: Dispatch<SetStateAction<string>>;
  setPlaceFilter: Dispatch<SetStateAction<PlaceFilter>>;
  goTo: (next: Tab) => void;
  campusData: CampusDataSource;
};

export default function TimetableScreen({
  setWeekOffset,
  weekStart,
  selectedDay,
  setSelectedDay,
  selectedDate,
  classes,
  reminders,
  toggleClassReminder,
  addClassToCalendar,
  setMapSearch,
  setPlaceFilter,
  goTo,
  campusData,
}: TimetableScreenProps) {
  return (
    <>
      <View style={styles.pageIntro}>
        <Label>YOUR WEEK</Label>
        <Text accessibilityRole="header" style={styles.pageTitle}>Timetable</Text>
        <Text style={styles.pageSubtitle}>A clear view of what’s coming up · sample week</Text>
      </View>
      <View style={styles.weekNavigation}>
        <Pressable onPress={() => setWeekOffset((value) => value - 1)} accessibilityRole="button" accessibilityLabel="Previous week">
          <Text style={styles.weekArrow}>‹</Text>
        </Pressable>
        <Text style={styles.weekLabel}>
          {weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          {" – "}
          {new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 4).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </Text>
        <Pressable onPress={() => setWeekOffset((value) => value + 1)} accessibilityRole="button" accessibilityLabel="Next week">
          <Text style={styles.weekArrow}>›</Text>
        </Pressable>
      </View>
      <View style={styles.dayPicker}>
        {weekDays.map((day, index) => {
          const active = selectedDay === day;
          return (
            <Pressable
              key={day}
              onPress={() => setSelectedDay(day)}
              accessibilityRole="button"
              accessibilityLabel={new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index)
                .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              accessibilityState={{ selected: active }}
              aria-pressed={active}
              style={[styles.dayItem, active && styles.dayItemActive]}
            >
              <Text style={[styles.dayLetter, active && styles.dayTextActive]}>{dayLetters[index]}</Text>
              <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index).getDate()}</Text>
              {campusData.timetable[day]?.length ? <View style={[styles.dayDot, active && styles.dayDotActive]} /> : <View style={styles.dayDotSpacer} />}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.dayTitleRow}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</Text>
        <Text style={styles.bodyMuted}>{classes.length} {classes.length === 1 ? "class" : "classes"}</Text>
      </View>
      {classes.length ? (
        classes.map((item) => {
          const reminderKey = `class:${localDateKey(selectedDate)}:${item.id}`;
          return (
            <ClassCard
              key={item.id}
              item={item}
              reminderEnabled={Boolean(reminders[reminderKey])}
              onReminder={() => toggleClassReminder(item)}
              onCalendar={() => addClassToCalendar(item)}
              onPlace={() => {
                setMapSearch(item.place.split(",")[0]);
                setPlaceFilter("All");
                goTo("Map");
              }}
            />
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>☼</Text>
          <Text style={styles.emptyTitle}>A free day</Text>
          <Text style={styles.bodyMuted}>No classes scheduled. Make it yours.</Text>
        </View>
      )}
      <View style={styles.tipCard}><Text style={styles.tipTitle}>Getting around</Text><Text style={styles.tipBody}>Use the campus map to locate buildings and see sample lift information.</Text></View>
      <View style={styles.disclaimer}><Text style={styles.disclaimerText}>Sample timetable · not connected to MyCampus.</Text></View>
    </>
  );
}
