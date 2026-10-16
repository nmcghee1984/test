import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function scheduleReminder(
  key: string,
  title: string,
  body: string,
  date: Date,
  _askPermission = true,
): Promise<string> {
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
    throw new Error("This reminder time has already passed.");
  }

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Allow notifications in your device settings to set a reminder.");
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "UofG Life reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data: { key } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

export async function cancelReminder(key: string, identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}
