/**
 * Compteur d'alertes non lues (notifications locales + messages visiteurs).
 * Mémoire seule : pas de localStorage (données de session).
 */

let unreadMessages = 0
let unreadNotifications = 0
const listeners = new Set()

function notify() {
  const snapshot = getAlertsUnread()
  for (const listener of listeners) listener(snapshot)
}

export function getAlertsUnread() {
  return {
    messages: unreadMessages,
    notifications: unreadNotifications,
    total: unreadMessages + unreadNotifications,
  }
}

export function setUnreadMessages(count) {
  const next = Math.max(0, Number(count) || 0)
  if (next === unreadMessages) return
  unreadMessages = next
  notify()
}

export function setUnreadNotifications(count) {
  const next = Math.max(0, Number(count) || 0)
  if (next === unreadNotifications) return
  unreadNotifications = next
  notify()
}

export function subscribeAlerts(listener) {
  listeners.add(listener)
  listener(getAlertsUnread())
  return () => listeners.delete(listener)
}
