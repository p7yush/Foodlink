import { describe, expect, it } from "vitest"
import { mobileNavigationReducer } from "@/lib/mobile-navigation"

describe("mobile navigation state", () => {
  it("opens and toggles the mobile drawer", () => {
    expect(mobileNavigationReducer(false, "open")).toBe(true)
    expect(mobileNavigationReducer(true, "toggle")).toBe(false)
    expect(mobileNavigationReducer(false, "toggle")).toBe(true)
  })

  it("closes from the close control, backdrop, Escape action, or navigation", () => {
    expect(mobileNavigationReducer(true, "close")).toBe(false)
    expect(mobileNavigationReducer(true, "navigate")).toBe(false)
  })

  it("leaves desktop navigation state closed", () => {
    expect(mobileNavigationReducer(false, "close")).toBe(false)
  })
})
