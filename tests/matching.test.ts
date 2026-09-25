import { describe, expect, it } from "vitest"
import { formatCountdown, minutesUntil, rankRecipients, type DonationLike, type RecipientLike } from "@/lib/matching"

const NOW = new Date("2026-05-01T12:00:00Z").getTime()

function donation(overrides: Partial<DonationLike> = {}): DonationLike {
  return {
    id: "d1",
    title: "Vegetable biryani",
    quantity: 50,
    food_type: "Cooked",
    // Four hours of safe time by default.
    expiry_time: new Date(NOW + 4 * 60 * 60 * 1000).toISOString(),
    latitude: 28.5355,
    longitude: 77.391,
    pickup_address: "Sector 62, Noida",
    ...overrides,
  }
}

function recipient(overrides: Partial<RecipientLike> = {}): RecipientLike {
  return {
    id: "r1",
    name: "Asha Shelter",
    organization: "Asha Shelter Trust",
    address: "Sector 18, Noida",
    latitude: 28.5706,
    longitude: 77.321,
    capacity: 200,
    food_preferences: [],
    status: "active",
    ...overrides,
  }
}

describe("hard gates run before any scoring", () => {
  it("rejects a recipient that is not accepting deliveries", () => {
    const { candidates, rejected } = rankRecipients(donation(), [recipient({ status: "offline" })], NOW)

    expect(candidates).toHaveLength(0)
    expect(rejected[0].reason).toMatch(/not accepting/i)
  })

  it("rejects a recipient whose capacity is below the donation size", () => {
    const { candidates, rejected } = rankRecipients(donation({ quantity: 300 }), [recipient({ capacity: 200 })], NOW)

    expect(candidates).toHaveLength(0)
    expect(rejected[0].reason).toContain("200")
  })

  it("rejects a recipient that does not accept this food type", () => {
    const only = recipient({ food_preferences: ["Packaged"] })
    const { candidates, rejected } = rankRecipients(donation({ food_type: "Cooked" }), [only], NOW)

    expect(candidates).toHaveLength(0)
    expect(rejected[0].reason).toMatch(/does not accept cooked/i)
  })

  it("accepts any food type when the recipient states no preference", () => {
    const { candidates } = rankRecipients(donation({ food_type: "Cooked" }), [recipient({ food_preferences: [] })], NOW)

    expect(candidates).toHaveLength(1)
  })

  it("rejects a recipient that cannot be reached before the food expires", () => {
    // Fifteen minutes of safe time left against a trip of several kilometres.
    const urgent = donation({ expiry_time: new Date(NOW + 15 * 60 * 1000).toISOString() })
    const { candidates, rejected } = rankRecipients(urgent, [recipient()], NOW)

    expect(candidates).toHaveLength(0)
    expect(rejected[0].reason).toMatch(/but food is safe for/i)
  })

  it("never ranks an infeasible recipient below a feasible one, it excludes it", () => {
    const reachable = recipient({ id: "near", name: "Near", latitude: 28.5365, longitude: 77.392 })
    const tooSmall = recipient({ id: "small", name: "Small", capacity: 1 })

    const { candidates, rejected } = rankRecipients(donation({ quantity: 50 }), [reachable, tooSmall], NOW)

    expect(candidates.map((entry) => entry.recipient.id)).toEqual(["near"])
    expect(rejected.map((entry) => entry.recipient.id)).toEqual(["small"])
  })
})

describe("scoring orders the feasible recipients", () => {
  it("prefers the closer recipient when everything else is equal", () => {
    const near = recipient({ id: "near", name: "Near", latitude: 28.536, longitude: 77.3915 })
    const far = recipient({ id: "far", name: "Far", latitude: 28.7041, longitude: 77.1025 })

    const { candidates } = rankRecipients(donation(), [far, near], NOW)

    expect(candidates[0].recipient.id).toBe("near")
    expect(candidates[0].score).toBeGreaterThan(candidates[1].score)
  })

  it("keeps every score within nought to one hundred", () => {
    const recipients = [
      recipient({ id: "a", latitude: 28.5356, longitude: 77.3911 }),
      recipient({ id: "b", latitude: 28.61, longitude: 77.23 }),
      recipient({ id: "c", capacity: 60 }),
    ]

    for (const candidate of rankRecipients(donation(), recipients, NOW).candidates) {
      expect(candidate.score).toBeGreaterThanOrEqual(0)
      expect(candidate.score).toBeLessThanOrEqual(100)
    }
  })

  it("explains itself: a candidate always carries the reasons it was chosen", () => {
    const { candidates } = rankRecipients(donation(), [recipient()], NOW)

    expect(candidates[0].reasons.length).toBeGreaterThan(0)
    expect(candidates[0].reasons.join(" ")).toMatch(/km away/)
  })

  it("still proposes a recipient with no coordinates, but says distance is unknown", () => {
    const unlocated = recipient({ latitude: null, longitude: null })
    const { candidates } = rankRecipients(donation(), [unlocated], NOW)

    expect(candidates).toHaveLength(1)
    expect(candidates[0].distanceKm).toBeNull()
    expect(candidates[0].reasons.join(" ")).toMatch(/unknown/i)
  })

  it("orders deterministically by name when two recipients tie", () => {
    const first = recipient({ id: "1", name: "Beta" })
    const second = recipient({ id: "2", name: "Alpha" })

    const { candidates } = rankRecipients(donation(), [first, second], NOW)

    expect(candidates[0].recipient.name).toBe("Alpha")
  })
})

describe("time helpers", () => {
  it("counts remaining minutes from an ISO timestamp", () => {
    expect(minutesUntil(new Date(NOW + 90 * 60 * 1000).toISOString(), NOW)).toBe(90)
  })

  it("reports a passed deadline as negative rather than clamping", () => {
    expect(minutesUntil(new Date(NOW - 30 * 60 * 1000).toISOString(), NOW)).toBe(-30)
  })

  it("formats countdowns for humans", () => {
    expect(formatCountdown(0)).toBe("Expired")
    expect(formatCountdown(-5)).toBe("Expired")
    expect(formatCountdown(45)).toBe("45m left")
    expect(formatCountdown(120)).toBe("2h left")
    expect(formatCountdown(102)).toBe("1h 42m left")
  })
})
