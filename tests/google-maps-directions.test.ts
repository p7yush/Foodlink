import { describe, expect, it } from "vitest"
import { buildGoogleMapsDirections, type GoogleMapsDirectionsInput } from "@/lib/google-maps-directions"

const DEFAULT_INPUT: GoogleMapsDirectionsInput = {
  volunteerLiveLocation: { latitude: 12.9716, longitude: 77.5946 },
  volunteerProfileLocation: { latitude: 12.9, longitude: 77.5 },
  donorLocation: { latitude: 13.0827, longitude: 80.2707 },
  ngoLocation: { latitude: 19.076, longitude: 72.8777 },
  donorHandoffConfirmedAt: null,
  pickupStatus: "en_route_to_donor",
}

describe("Google Maps pickup directions", () => {
  it("routes volunteer to donor before handoff", () => {
    const result = buildGoogleMapsDirections(DEFAULT_INPUT)
    expect(result.status).toBe("ready")
    if (result.status !== "ready") return

    const url = new URL(result.url)
    expect(url.origin).toBe("https://www.google.com")
    expect(url.pathname).toBe("/maps/dir/")
    expect(url.searchParams.get("api")).toBe("1")
    expect(url.searchParams.get("origin")).toBe("12.9716,77.5946")
    expect(url.searchParams.has("waypoints")).toBe(false)
    expect(url.searchParams.get("destination")).toBe("13.0827,80.2707")
    expect(url.searchParams.get("travelmode")).toBe("driving")
    expect(result.donorWaypoint).toBe(true)
    expect(result.origin).toBe("live")
  })

  it("routes directly from volunteer to NGO after the donor handoff", () => {
    const result = buildGoogleMapsDirections({
      ...DEFAULT_INPUT,
      donorHandoffConfirmedAt: "2026-09-28T12:00:00Z",
    })
    expect(result.status).toBe("ready")
    if (result.status !== "ready") return
    const url = new URL(result.url)
    expect(url.searchParams.get("origin")).toBe("12.9716,77.5946")
    expect(url.searchParams.get("destination")).toBe("19.076,72.8777")
    expect(url.searchParams.has("waypoints")).toBe(false)
    expect(result.donorWaypoint).toBe(false)
  })

  it("keeps routing to donor until the saved handoff confirmation is present", () => {
    const result = buildGoogleMapsDirections({
      ...DEFAULT_INPUT,
      pickupStatus: "en_route_to_ngo",
      donorHandoffConfirmedAt: null,
    })
    expect(result.status).toBe("ready")
    if (result.status !== "ready") return
    expect(new URL(result.url).searchParams.has("waypoints")).toBe(false)
    expect(new URL(result.url).searchParams.get("destination")).toBe("13.0827,80.2707")
  })

  it("requires donor coordinates before handoff", () => {
    expect(buildGoogleMapsDirections({
      ...DEFAULT_INPUT,
      donorLocation: { latitude: null, longitude: null },
    })).toEqual({
      status: "unavailable",
      reason: "The donor pickup coordinates are missing or invalid.",
    })
  })

  it("requires NGO coordinates before or after handoff", () => {
    expect(buildGoogleMapsDirections({
      ...DEFAULT_INPUT,
      donorHandoffConfirmedAt: "2026-09-28T12:00:00Z",
      ngoLocation: { latitude: null, longitude: null },
    })).toEqual({
      status: "unavailable",
      reason: "The NGO destination coordinates are missing or invalid.",
    })
  })

  it("uses saved volunteer profile coordinates when live GPS is unavailable", () => {
    const result = buildGoogleMapsDirections({
      ...DEFAULT_INPUT,
      volunteerLiveLocation: { latitude: null, longitude: null },
    })
    expect(result.status).toBe("ready")
    if (result.status !== "ready") return
    expect(new URL(result.url).searchParams.get("origin")).toBe("12.9,77.5")
    expect(result.origin).toBe("profile")
    expect(result.notice).toMatch(/saved profile location/i)
  })

  it("lets Google Maps use device location when no valid volunteer origin exists", () => {
    const result = buildGoogleMapsDirections({
      ...DEFAULT_INPUT,
      volunteerLiveLocation: { latitude: null, longitude: null },
      volunteerProfileLocation: { latitude: null, longitude: null },
    })
    expect(result.status).toBe("ready")
    if (result.status !== "ready") return
    expect(new URL(result.url).searchParams.has("origin")).toBe(false)
    expect(result.origin).toBe("device")
    expect(result.notice).toMatch(/device’s location/i)
  })

  it("rejects invalid required coordinates and falls back from an invalid volunteer fix", () => {
    const invalidNgo = buildGoogleMapsDirections({
      ...DEFAULT_INPUT,
      ngoLocation: { latitude: 91, longitude: 72 },
    })
    const invalidDonor = buildGoogleMapsDirections({
      ...DEFAULT_INPUT,
      donorLocation: { latitude: 14, longitude: 181 },
    })
    const invalidVolunteer = buildGoogleMapsDirections({
      ...DEFAULT_INPUT,
      volunteerLiveLocation: { latitude: Number.NaN, longitude: 77 },
    })

    expect(invalidNgo.status).toBe("unavailable")
    expect(invalidDonor.status).toBe("unavailable")
    expect(invalidVolunteer.status).toBe("ready")
    if (invalidVolunteer.status === "ready") {
      expect(new URL(invalidVolunteer.url).searchParams.get("origin")).toBe("12.9,77.5")
      expect(invalidVolunteer.origin).toBe("profile")
    }
  })

  it("encodes coordinate separators in the URL query", () => {
    const result = buildGoogleMapsDirections(DEFAULT_INPUT)
    expect(result.status).toBe("ready")
    if (result.status !== "ready") return
    expect(result.url).toContain("origin=12.9716%2C77.5946")
    expect(result.url).toContain("destination=13.0827%2C80.2707")
  })

  it("does not add a duplicate donor waypoint when donor and NGO coordinates match", () => {
    const result = buildGoogleMapsDirections({
      ...DEFAULT_INPUT,
      donorLocation: DEFAULT_INPUT.ngoLocation,
    })
    expect(result.status).toBe("ready")
    if (result.status !== "ready") return
    expect(new URL(result.url).searchParams.has("waypoints")).toBe(false)
    expect(result.donorWaypoint).toBe(false)
  })

  it.each(["completed", "cancelled", "canceled"])("does not route a %s pickup", (pickupStatus) => {
    expect(buildGoogleMapsDirections({ ...DEFAULT_INPUT, pickupStatus }).status).toBe("unavailable")
  })
})
