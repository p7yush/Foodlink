import { describe, expect, it } from "vitest"
import {
  CO2E_KG_PER_KG_FOOD,
  KG_PER_MEAL,
  computeImpact,
  type DonationRow,
  type PickupRow,
  type RequestRow,
} from "@/lib/impact"

const NOW = new Date("2026-05-15T12:00:00Z").getTime()

function hoursFromNow(hours: number): string {
  return new Date(NOW + hours * 60 * 60 * 1000).toISOString()
}

const donations: DonationRow[] = [
  { id: "d1", quantity: 100, status: "Completed", expiry_time: hoursFromNow(-20), created_at: hoursFromNow(-30) },
  { id: "d2", quantity: 50, status: "Available", expiry_time: hoursFromNow(1), created_at: hoursFromNow(-1) },
  { id: "d3", quantity: 20, status: "Available", expiry_time: hoursFromNow(9), created_at: hoursFromNow(-2) },
  { id: "d4", quantity: 30, status: "Available", expiry_time: hoursFromNow(-1), created_at: hoursFromNow(-5) },
]

const requests: RequestRow[] = [
  { id: "q1", food_id: "d1" },
  { id: "q2", food_id: "d2" },
]

const pickups: PickupRow[] = [
  { request_id: "q1", status: "completed", completed_at: new Date(NOW - 20 * 60 * 60 * 1000).toISOString() },
  { request_id: "q2", status: "collected", completed_at: null },
]

describe("impact is derived from completed deliveries only", () => {
  it("counts meals from donations that were actually delivered", () => {
    expect(computeImpact(donations, requests, pickups, NOW).mealsRescued).toBe(100)
  })

  it("ignores pickups that are still in progress", () => {
    const { successfulDeliveries, pickupsInProgress } = computeImpact(donations, requests, pickups, NOW)

    expect(successfulDeliveries).toBe(1)
    expect(pickupsInProgress).toBe(1)
  })

  it("reports nothing rescued when no delivery has completed", () => {
    const openOnly: PickupRow[] = [{ request_id: "q1", status: "assigned", completed_at: null }]
    const impact = computeImpact(donations, requests, openOnly, NOW)

    expect(impact.mealsRescued).toBe(0)
    expect(impact.co2eAvoidedKg).toBe(0)
    expect(impact.foodDivertedTonnes).toBe(0)
  })

  it("derives weight and emissions from the stated constants rather than fixed numbers", () => {
    const impact = computeImpact(donations, requests, pickups, NOW)
    const expectedKg = 100 * KG_PER_MEAL

    expect(impact.foodDivertedTonnes).toBeCloseTo(expectedKg / 1000, 5)
    expect(impact.co2eAvoidedKg).toBe(Math.round(expectedKg * CO2E_KG_PER_KG_FOOD))
  })

  it("does not credit a completed pickup whose donation is missing", () => {
    const orphan: PickupRow[] = [{ request_id: "unknown", status: "completed", completed_at: hoursFromNow(-1) }]

    expect(computeImpact(donations, requests, orphan, NOW).mealsRescued).toBe(0)
  })
})

describe("live network figures", () => {
  it("counts only donations still marked available", () => {
    expect(computeImpact(donations, requests, pickups, NOW).activeDonations).toBe(3)
  })

  it("flags available food expiring within two hours, and excludes food already expired", () => {
    // d2 expires in one hour so it is at risk; d3 is nine hours away and d4 has
    // already lapsed, so neither counts.
    expect(computeImpact(donations, requests, pickups, NOW).foodAtRisk).toBe(1)
  })
})

describe("monthly trend", () => {
  it("always returns six trailing months so the chart axis is stable", () => {
    const impact = computeImpact([], [], [], NOW)

    expect(impact.monthly).toHaveLength(6)
    expect(impact.monthly.every((point) => point.meals === 0)).toBe(true)
  })

  it("ends on the current month", () => {
    expect(computeImpact([], [], [], NOW).monthly.at(-1)?.month).toBe("May")
  })

  it("attributes meals to the month the delivery completed", () => {
    const impact = computeImpact(donations, requests, pickups, NOW)
    const may = impact.monthly.find((point) => point.month === "May")

    expect(may?.meals).toBe(100)
  })

  it("ignores a delivery that completed outside the six month window", () => {
    const old: PickupRow[] = [
      { request_id: "q1", status: "completed", completed_at: new Date("2024-01-05T00:00:00Z").toISOString() },
    ]
    const impact = computeImpact(donations, requests, old, NOW)

    expect(impact.mealsRescued).toBe(100)
    expect(impact.monthly.every((point) => point.meals === 0)).toBe(true)
  })
})
