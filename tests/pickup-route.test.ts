import { afterEach, describe, expect, it, vi } from "vitest"
import {
  fetchRouteGeometry,
  planPickupRoute,
  resolveDonorCoordinates,
  type RoutePlanInput,
} from "@/lib/pickup-route"

const VOLUNTEER = { latitude: 12.9716, longitude: 77.5946 }
const DONOR = { latitude: 13.0827, longitude: 80.2707 }
const NGO = { latitude: 19.076, longitude: 72.8777 }

const BEFORE_HANDOFF: RoutePlanInput = {
  volunteer: VOLUNTEER,
  donor: DONOR,
  ngo: NGO,
  donorHandoffConfirmedAt: null,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("planPickupRoute", () => {
  it("routes volunteer -> donor -> NGO before the donor handoff", () => {
    const plan = planPickupRoute(BEFORE_HANDOFF)
    expect(plan.status).toBe("ready")
    if (plan.status !== "ready") return

    expect(plan.waypoints).toEqual([VOLUNTEER, DONOR, NGO])
    // OSRM expects longitude,latitude pairs joined by semicolons.
    expect(plan.url).toBe(
      "https://router.project-osrm.org/route/v1/driving/" +
        "77.5946,12.9716;80.2707,13.0827;72.8777,19.076" +
        "?overview=full&geometries=geojson",
    )
  })

  it("routes volunteer -> NGO after the donor handoff, never back through the donor", () => {
    const plan = planPickupRoute({
      ...BEFORE_HANDOFF,
      donorHandoffConfirmedAt: "2026-09-28T12:00:00Z",
    })
    expect(plan.status).toBe("ready")
    if (plan.status !== "ready") return

    expect(plan.waypoints).toEqual([VOLUNTEER, NGO])
    expect(plan.url).toBe(
      "https://router.project-osrm.org/route/v1/driving/" +
        "77.5946,12.9716;72.8777,19.076" +
        "?overview=full&geometries=geojson",
    )
    expect(plan.url).not.toContain("80.2707,13.0827")
  })

  it("skips the route when donor coordinates are missing", () => {
    const plan = planPickupRoute({
      ...BEFORE_HANDOFF,
      donor: { latitude: null, longitude: null },
    })
    expect(plan).toEqual({
      status: "skipped",
      reason: "insufficient_waypoints",
    })
  })

  it("skips the route when the volunteer location is missing", () => {
    const plan = planPickupRoute({
      ...BEFORE_HANDOFF,
      volunteer: { latitude: null, longitude: null },
    })
    expect(plan).toEqual({
      status: "skipped",
      reason: "insufficient_waypoints",
    })
  })

  it("skips the route when donor and NGO coordinates are identical", () => {
    const plan = planPickupRoute({
      ...BEFORE_HANDOFF,
      ngo: { latitude: DONOR.latitude, longitude: DONOR.longitude },
    })
    expect(plan).toEqual({
      status: "skipped",
      reason: "identical_endpoints",
    })
  })

  it("skips the route when donor and NGO coordinates are near-identical", () => {
    const plan = planPickupRoute({
      ...BEFORE_HANDOFF,
      ngo: {
        latitude: DONOR.latitude + 0.000005,
        longitude: DONOR.longitude - 0.000005,
      },
    })
    expect(plan).toEqual({
      status: "skipped",
      reason: "identical_endpoints",
    })
  })

  it("skips the route when coordinates are invalid", () => {
    const invalidCases: RoutePlanInput[] = [
      // Latitude out of range.
      { ...BEFORE_HANDOFF, donor: { latitude: 91, longitude: 80.2707 } },
      // Longitude out of range.
      { ...BEFORE_HANDOFF, ngo: { latitude: 19.076, longitude: 181 } },
      // NaN is not a usable coordinate.
      { ...BEFORE_HANDOFF, volunteer: { latitude: NaN, longitude: 77.5946 } },
    ]
    for (const input of invalidCases) {
      expect(planPickupRoute(input)).toEqual({
        status: "skipped",
        reason: "insufficient_waypoints",
      })
    }
  })

  it("does not route through the donor after handoff even with valid donor coordinates", () => {
    const plan = planPickupRoute({
      volunteer: VOLUNTEER,
      donor: DONOR,
      ngo: NGO,
      donorHandoffConfirmedAt: "2026-10-01T10:00:00Z",
    })
    expect(plan.status).toBe("ready")
    if (plan.status !== "ready") return
    expect(plan.waypoints).toHaveLength(2)
    expect(plan.waypoints[1]).toEqual(NGO)
  })
})

describe("resolveDonorCoordinates", () => {
  it("prefers the donation coordinates when valid", () => {
    expect(
      resolveDonorCoordinates(DONOR, { latitude: 1, longitude: 2 }),
    ).toEqual(DONOR)
  })

  it("falls back to the donor profile coordinates when the donation has none", () => {
    const profile = { latitude: 26.9, longitude: 75.8 }
    expect(
      resolveDonorCoordinates(
        { latitude: null, longitude: null },
        profile,
      ),
    ).toEqual(profile)
  })

  it("falls back to the donor profile when the donation coordinates are invalid", () => {
    const profile = { latitude: 26.9, longitude: 75.8 }
    expect(
      resolveDonorCoordinates({ latitude: 91, longitude: 200 }, profile),
    ).toEqual(profile)
  })

  it("returns null when neither source has valid coordinates", () => {
    expect(
      resolveDonorCoordinates(
        { latitude: null, longitude: null },
        { latitude: null, longitude: null },
      ),
    ).toBeNull()
  })

  it("never invents coordinates", () => {
    const result = resolveDonorCoordinates(
      { latitude: undefined, longitude: undefined },
      { latitude: undefined, longitude: undefined },
    )
    expect(result).toBeNull()
  })
})

describe("fetchRouteGeometry", () => {
  const url = "https://router.project-osrm.org/route/v1/driving/0,0;1,1?overview=full&geometries=geojson"
  const lineString = {
    type: "LineString",
    coordinates: [
      [77.5946, 12.9716],
      [80.2707, 13.0827],
    ],
  }

  function mockFetch(response: unknown) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response))
  }

  it("returns the LineString geometry on success", async () => {
    mockFetch({
      ok: true,
      json: async () => ({ code: "Ok", routes: [{ geometry: lineString }] }),
    })
    await expect(fetchRouteGeometry(url)).resolves.toEqual(lineString)
  })

  it("returns null on HTTP errors", async () => {
    mockFetch({ ok: false, status: 500, json: async () => ({}) })
    await expect(fetchRouteGeometry(url)).resolves.toBeNull()
  })

  it("returns null when OSRM reports an error code", async () => {
    mockFetch({
      ok: true,
      json: async () => ({ code: "NoRoute", routes: [] }),
    })
    await expect(fetchRouteGeometry(url)).resolves.toBeNull()
  })

  it("returns null when the geometry is missing or not a LineString", async () => {
    mockFetch({
      ok: true,
      json: async () => ({ code: "Ok", routes: [{}] }),
    })
    await expect(fetchRouteGeometry(url)).resolves.toBeNull()

    mockFetch({
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [{ geometry: { type: "Point", coordinates: [1, 2] } }],
      }),
    })
    await expect(fetchRouteGeometry(url)).resolves.toBeNull()
  })

  it("returns null on network failures instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    )
    await expect(fetchRouteGeometry(url)).resolves.toBeNull()
  })
})
