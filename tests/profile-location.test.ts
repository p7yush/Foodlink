import { describe, expect, it } from "vitest"
import {
  buildMapboxPermanentReverseUrl,
  buildMapboxPermanentSelectionUrl,
  buildMapboxSuggestionUrl,
  createLatestRequestGuard,
  geolocationErrorMessage,
  isValidCoordinates,
  mergeProfileLocation,
  parseMapboxLocation,
  profileLocationAtCoordinates,
  validateAddressSearchQuery,
  type ProfileLocation,
} from "@/lib/profile-location"

const CURRENT: ProfileLocation = {
  address: "Old address",
  city: "Old city",
  state: "Old state",
  pincode: "123456",
  latitude: 19.076,
  longitude: 72.8777,
}

function mapboxResult(overrides: Record<string, unknown> = {}) {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [73.8567, 18.5204] },
    properties: {
      full_address: "Foodlink Center, Pune, Maharashtra, India",
      mapbox_id: "place.example",
      context: {
        place: { name: "Pune" },
        region: { name: "Maharashtra" },
        postcode: { name: "411001" },
      },
      ...overrides,
    },
  }
}

describe("profile location parsing", () => {
  it("parses a Mapbox result and its address context", () => {
    expect(parseMapboxLocation(mapboxResult())).toEqual({
      address: "Foodlink Center, Pune, Maharashtra, India",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      latitude: 18.5204,
      longitude: 73.8567,
      mapboxId: "place.example",
    })
  })

  it("builds an address from the feature name and formatted place when full address is absent", () => {
    expect(parseMapboxLocation({
      geometry: { coordinates: [73.8567, 18.5204] },
      properties: { name: "Central Pune", place_formatted: "Pune, Maharashtra" },
    })?.address).toBe("Central Pune, Pune, Maharashtra")
  })

  it("uses place before locality for city", () => {
    const place = parseMapboxLocation(mapboxResult({ context: {
      place: { name: "Place City" }, locality: { name: "Locality City" },
    } }))
    const locality = parseMapboxLocation(mapboxResult({ context: { locality: { name: "Locality City" } } }))
    expect(place?.city).toBe("Place City")
    expect(locality?.city).toBe("Locality City")
  })

  it("does not use district as a city and preserves the existing city on merge", () => {
    const candidate = parseMapboxLocation(mapboxResult({ context: { district: { name: "Incorrect District" } } }))
    expect(candidate?.city).toBe("")
    expect(mergeProfileLocation(CURRENT, candidate!).city).toBe("Old city")
  })

  it("safely handles missing context, state, and postcode", () => {
    const candidate = parseMapboxLocation({
      geometry: { coordinates: [77.6, 12.9] },
      properties: { full_address: "New address", context: { district: { name: "District" } } },
    })
    expect(candidate).toMatchObject({ address: "New address", city: "", state: "", pincode: "" })
    expect(mergeProfileLocation(CURRENT, candidate!)).toMatchObject({ city: "Old city", state: "Old state", pincode: "123456" })
  })

  it("accepts string context values and name_preferred fields", () => {
    const candidate = parseMapboxLocation({
      geometry: { coordinates: [77.6, 12.9] },
      properties: {
        name_preferred: "Preferred address",
        context: { place: { name_preferred: "Preferred City" }, region: "Preferred State" },
      },
    })
    expect(candidate).toMatchObject({ address: "Preferred address", city: "Preferred City", state: "Preferred State" })
  })

  it("rejects missing, malformed, and out-of-range coordinates", () => {
    expect(parseMapboxLocation(null)).toBeNull()
    expect(parseMapboxLocation({ geometry: { coordinates: [181, 18] }, properties: { name: "Place" } })).toBeNull()
    expect(parseMapboxLocation({ geometry: { coordinates: [73, 91] }, properties: { name: "Place" } })).toBeNull()
    expect(parseMapboxLocation({ geometry: { coordinates: ["bad", 18] }, properties: { name: "Place" } })).toBeNull()
  })

  it("validates inclusive coordinate bounds", () => {
    expect(isValidCoordinates(-90, -180)).toBe(true)
    expect(isValidCoordinates(90, 180)).toBe(true)
    expect(isValidCoordinates(Number.NaN, 0)).toBe(false)
    expect(isValidCoordinates(0, 180.01)).toBe(false)
  })

  it("preserves city, state, and pincode when a candidate omits them", () => {
    const candidate = parseMapboxLocation({
      geometry: { coordinates: [77.6, 12.9] },
      properties: { full_address: "New address" },
    })
    expect(candidate).not.toBeNull()
    expect(mergeProfileLocation(CURRENT, candidate!)).toEqual({
      address: "New address", city: "Old city", state: "Old state", pincode: "123456",
      latitude: 12.9, longitude: 77.6,
    })
  })

  it("clears the old street address but preserves context for a newly selected point", () => {
    expect(profileLocationAtCoordinates(CURRENT, 12.9716, 77.5946)).toEqual({
      address: "", city: "Old city", state: "Old state", pincode: "123456",
      latitude: 12.9716, longitude: 77.5946,
    })
    expect(profileLocationAtCoordinates(CURRENT, 91, 0)).toBeNull()
  })
})

describe("profile address search validation", () => {
  it("trims valid queries and skips very short input", () => {
    expect(validateAddressSearchQuery("  Pune station  ")).toEqual({ status: "valid", query: "Pune station" })
    expect(validateAddressSearchQuery("  ab ")).toEqual({ status: "short", query: "ab" })
    expect(validateAddressSearchQuery("   ")).toEqual({ status: "short", query: "" })
  })

  it("rejects semicolons, more than 256 characters, and more than 20 words", () => {
    expect(validateAddressSearchQuery("Pune; Mumbai")).toMatchObject({ status: "invalid", message: expect.stringMatching(/semicolon/i) })
    expect(validateAddressSearchQuery("a".repeat(257))).toMatchObject({ status: "invalid", message: expect.stringMatching(/256 characters/i) })
    expect(validateAddressSearchQuery(Array.from({ length: 21 }, (_, index) => `word${index}`).join(" ")))
      .toMatchObject({ status: "invalid", message: expect.stringMatching(/20 words/i) })
  })
})

describe("Mapbox request modes", () => {
  it("uses temporary mode for autocomplete and URL-encodes trimmed query parameters", () => {
    const url = new URL(buildMapboxSuggestionUrl("Pune & Nashik", "public-test-token"))
    expect(url.pathname).toBe("/search/geocode/v6/forward")
    expect(url.searchParams.get("q")).toBe("Pune & Nashik")
    expect(url.searchParams.get("access_token")).toBe("public-test-token")
    expect(url.searchParams.get("autocomplete")).toBe("true")
    expect(url.searchParams.get("permanent")).toBe("false")
    expect(url.searchParams.get("limit")).toBe("5")
  })

  it("uses permanent mode for the selected result only", () => {
    const candidate = { ...CURRENT, latitude: 19.076, longitude: 72.8777, mapboxId: "place.selected-id" }
    const url = new URL(buildMapboxPermanentSelectionUrl(candidate, "public-test-token"))
    expect(url.pathname).toBe("/search/geocode/v6/forward")
    expect(url.searchParams.get("q")).toBe("place.selected-id")
    expect(url.searchParams.get("permanent")).toBe("true")
    expect(url.searchParams.get("autocomplete")).toBe("false")
    expect(url.searchParams.get("limit")).toBe("1")
  })

  it("uses permanent reverse geocoding for a selected point", () => {
    const url = new URL(buildMapboxPermanentReverseUrl(77.5946, 12.9716, "public-test-token"))
    expect(url.pathname).toBe("/search/geocode/v6/reverse")
    expect(url.searchParams.get("longitude")).toBe("77.5946")
    expect(url.searchParams.get("latitude")).toBe("12.9716")
    expect(url.searchParams.get("permanent")).toBe("true")
  })
})

describe("location request cancellation", () => {
  it("aborts and ignores an older reverse-geocode response after selecting a newer point", () => {
    const guard = createLatestRequestGuard()
    const oldRequest = guard.begin()
    const newerRequest = guard.begin()
    expect(oldRequest.signal.aborted).toBe(true)
    expect(oldRequest.isCurrent()).toBe(false)
    expect(newerRequest.isCurrent()).toBe(true)
  })

  it("invalidates a pending reverse result when a manual location field is edited", () => {
    const guard = createLatestRequestGuard()
    const reverseRequest = guard.begin()
    // Manual address/city/state/pincode handlers invalidate the shared operation guard.
    guard.invalidate()
    expect(reverseRequest.signal.aborted).toBe(true)
    expect(reverseRequest.isCurrent()).toBe(false)
  })

  it("cancels a selected-result request when another operation starts", () => {
    const guard = createLatestRequestGuard()
    const selectedResultRequest = guard.begin()
    guard.invalidate() // Starting a new search cancels the permanent selected-result lookup.
    expect(selectedResultRequest.signal.aborted).toBe(true)
    expect(selectedResultRequest.isCurrent()).toBe(false)
  })
})

describe("browser geolocation errors", () => {
  it("explains denied, unavailable, and timed-out location requests", () => {
    expect(geolocationErrorMessage(1)).toMatch(/permission was denied/i)
    expect(geolocationErrorMessage(2)).toMatch(/unavailable/i)
    expect(geolocationErrorMessage(3)).toMatch(/too long/i)
  })
})
