export type MobileNavigationAction = "open" | "close" | "toggle" | "navigate"

export function mobileNavigationReducer(
  isOpen: boolean,
  action: MobileNavigationAction
): boolean {
  switch (action) {
    case "open":
      return true
    case "toggle":
      return !isOpen
    case "close":
    case "navigate":
      return false
  }
}
