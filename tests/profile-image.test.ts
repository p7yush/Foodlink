import { describe, expect, it } from "vitest"
import { profileAvatarImageSource, profileAvatarInitial } from "@/lib/profile-image"

describe("profile avatar fallback", () => {
  it("uses the first trimmed character for the initial fallback", () => {
    expect(profileAvatarInitial(" Piyush")).toBe("P")
    expect(profileAvatarInitial("foodlink NGO")).toBe("F")
  })

  it("returns no initial for an empty name so the avatar can show its user icon", () => {
    expect(profileAvatarInitial("  ")).toBeNull()
    expect(profileAvatarInitial(null)).toBeNull()
  })

  it("uses initials instead of a missing or failed image and accepts a replacement URL", () => {
    expect(profileAvatarImageSource(null, null)).toBeNull()
    expect(profileAvatarImageSource("https://storage.example/old.png", "https://storage.example/old.png")).toBeNull()
    expect(profileAvatarImageSource("https://storage.example/new.png", "https://storage.example/old.png"))
      .toBe("https://storage.example/new.png")
  })
})
