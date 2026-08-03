import { useEffect } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { eventsApi } from "@/api/endpoints";
import {
  notificationCategory,
  notificationUrl,
} from "@/notifications/logic";

/**
 * Foreground presentation: a quiet banner, no sound, no badge math.
 * Module scope so it is set before any notification can arrive.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * The cold-start response is ALSO replayed to the live listener on some
 * platforms, so every handled response is remembered by identifier.
 */
const handledResponseIds = new Set<string>();

function handleResponse(
  response: Notifications.NotificationResponse | null
): void {
  if (!response) return;
  const id = response.notification.request.identifier;
  if (handledResponseIds.has(id)) return;
  handledResponseIds.add(id);

  const data = response.notification.request.content.data;

  void eventsApi.send("notif_opened", {
    category: notificationCategory(data),
  });

  const url = notificationUrl(data);
  if (!url) return;

  try {
    router.push(url as Parameters<typeof router.push>[0]);
  } catch {
    // A bad route must never take the app down with it.
  }
}

/**
 * Mount once in the root layout: routes notification taps (warm and cold
 * start) to the in-app URL the server put in `data.url`.
 */
export function useNotificationObserver(): void {
  useEffect(() => {
    let alive = true;

    // Cold start: the app was launched by tapping a notification.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (alive) handleResponse(response);
      })
      .catch(() => undefined);

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => handleResponse(response)
    );

    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
}
