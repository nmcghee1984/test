import { Platform, View } from "react-native";
import { ActionButton, Label, SettingToggle } from "../components/CampusCards";
import type { AppPreferences, HomeSection } from "../data/storage";
import { Text, TextInput } from "../ui/primitives";
import { styles } from "../ui/styles";
import { palette } from "../ui/theme";

type SettingsScreenProps = {
  preferences: AppPreferences;
  updatePreferences: (update: Partial<AppPreferences>) => void;
  toggleEventReminderSetting: () => Promise<void>;
};

export default function SettingsScreen({
  preferences,
  updatePreferences,
  toggleEventReminderSetting,
}: SettingsScreenProps) {
  const homeOptions: { id: HomeSection; title: string; description: string }[] = [
    { id: "timetable", title: "Timetable", description: "Show today’s classes on Home." },
    { id: "study", title: "Study spaces", description: "Show a nearby study suggestion." },
    { id: "saved", title: "Saved places", description: "Keep your bookmarked campus places close." },
  ];

  return (
    <>
      <View style={styles.pageIntro}>
        <Label>YOUR APP, YOUR WAY</Label>
        <Text accessibilityRole="header" style={styles.pageTitle}>Settings</Text>
        <Text style={styles.pageSubtitle}>Preferences are saved on this device.</Text>
      </View>
      <Text accessibilityRole="header" style={styles.settingsSectionTitle}>Your profile</Text>
      <View style={styles.settingsCard}>
        <Text style={styles.settingTitle}>Name shown on Home</Text>
        <TextInput
          value={preferences.displayName}
          onChangeText={(displayName) => updatePreferences({ displayName: displayName.slice(0, 32) })}
          placeholder="Your name"
          placeholderTextColor={palette.muted}
          accessibilityLabel="Name shown on the home screen"
          style={styles.searchField}
          maxLength={32}
        />
        <Text style={styles.settingsHint}>This name stays on this device; no account or sign-in is required.</Text>
      </View>

      <Text accessibilityRole="header" style={styles.settingsSectionTitle}>Home screen</Text>
      <View style={styles.settingsCard}>
        {homeOptions.map((option) => (
          <SettingToggle
            key={option.id}
            title={option.title}
            description={option.description}
            value={preferences.homeSections.includes(option.id)}
            onChange={() => {
              const next = preferences.homeSections.includes(option.id)
                ? preferences.homeSections.filter((item) => item !== option.id)
                : [...preferences.homeSections, option.id];
              updatePreferences({ homeSections: next });
            }}
          />
        ))}
        <Text style={styles.settingsHint}>Quick links and your next class remain available on Home.</Text>
      </View>

      <Text accessibilityRole="header" style={styles.settingsSectionTitle}>Accessibility</Text>
      <View style={styles.settingsCard}>
        <SettingToggle
          title="Larger text"
          description="Increase text size across the app."
          value={preferences.largerText}
          onChange={() => updatePreferences({ largerText: !preferences.largerText })}
        />
        <SettingToggle
          title="Higher contrast"
          description="Darken muted text for easier reading."
          value={preferences.highContrast}
          onChange={() => updatePreferences({ highContrast: !preferences.highContrast })}
        />
        <SettingToggle
          title="Reduce motion"
          description="Disable animated map zoom and fitting; your device motion-reduction setting is always respected."
          value={preferences.reducedMotion}
          onChange={() => updatePreferences({ reducedMotion: !preferences.reducedMotion })}
        />
      </View>

      <Text accessibilityRole="header" style={styles.settingsSectionTitle}>Reminders</Text>
      <View style={styles.settingsCard}>
        <Text style={styles.settingTitle}>Class reminder lead time</Text>
        <View style={styles.reminderChoices}>
          {[5, 10, 15].map((minutes) => (
            <ActionButton
              key={minutes}
              title={`${minutes} min`}
              selected={preferences.classReminderMinutes === minutes}
              onPress={() => updatePreferences({ classReminderMinutes: minutes })}
            />
          ))}
        </View>
        <SettingToggle
          title="Event reminders"
          description={Platform.OS === "web"
            ? "Browser reminders work while this tab remains open."
            : "Allow local reminders for events you choose."}
          value={preferences.eventRemindersEnabled}
          onChange={() => { void toggleEventReminderSetting(); }}
        />
        <Text style={styles.settingsHint}>Reminders are scheduled on this device. They do not depend on a UofG account or send data to a server.</Text>
      </View>

      <Text accessibilityRole="header" style={styles.settingsSectionTitle}>Offline and data</Text>
      <View style={styles.settingsCard}>
        <Text style={styles.settingsParagraph}>The sample timetable, campus directory and study listings are bundled with this prototype. Saved preferences stay on this device. OpenStreetMap tiles and external calendar links need an internet connection.</Text>
        <Text style={styles.settingsParagraph}>No approved UofG timetable, occupancy, booking or events API is configured. Live account sign-in, live capacity and real room bookings are not available. The app’s data-source interface is ready for a University-approved integration.</Text>
        <Text style={styles.settingsHint}>Sample hours, capacity and access notes are not verified. Events are unavailable in the app; use the official University listings.</Text>
      </View>
    </>
  );
}
