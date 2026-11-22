/** Öffnet die Benachrichtigungen im Handy-Header von überall aus (z. B. aus dem Menü). */
export const OPEN_NOTIFICATIONS_EVENT = "mtf:open-notifications";

export function openNotifications() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_NOTIFICATIONS_EVENT));
}
