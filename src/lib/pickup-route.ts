import { isValidCoordinates } from "@/lib/profile-location"

export type RouteCoordinates = {
  latitude: number | null | undefined
  longitude: number | null | undefined
}

export type RouteWaypoint = {
  latitude: number
  longitude: number
}

export type RoutePlanInput = {
  volunteer: RouteCoordinates
  donor: RouteCoordinates
  ngo: RouteCoordinates
  donorHandoffConfirmedAt: string | null
}

export type RoutePlan =
  | { status: "ready"; waypoints: RouteWaypoint[]; url: string }
  | { status: "skipped"; reason: "insufficient_waypoints" | "identical_endpoints" }

export type RouteGeometry = {
  type: "LineString"
  coordinates: [number, number][]
}

// Free OSM-based routing (no API key, no billing).
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving"

// Two points closer than this are treated as the same place.
// 0.00001 degrees is roughly 1.1 metres at the equator.
const IDENTICAL_EPSILON = 0.00001

function toWaypoint(value: RouteCoordinates): RouteWaypoint | null {
  const { latitude, longitude } = value
  if (typeof latitude !== "number" || typeof longitude !== "number") return null
  if (!isValidCoordinates(latitude, longitude)) return null
  return { latitude, longitude }
}

function samePlace(a: RouteWaypoint, b: RouteWaypoint): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < IDENTICAL_EPSILON &&
    Math.abs(a.longitude - b.longitude) < IDENTICAL_EPSILON
  )
}

/**
 * Resolve the donor's map location: prefer the donation's own coordinates,
 * then fall back to the donor profile's saved coordinates. Returns null when
 * neither is valid — callers must not invent a location.
 */
export function resolveDonorCoordinates(
  donation: RouteCoordinates,
  profile: RouteCoordinates,
): RouteWaypoint | null {
  return toWaypoint(donation) ?? toWaypoint(profile)
}

/**
 * Plan the pickup route's ordered waypoints and OSRM request URL.
 *
 * Before the donor handoff: volunteer -> donor -> NGO.
 * After the donor handoff: volunteer -> NGO (never back through the donor).
 */
export function planPickupRoute(input: RoutePlanInput): RoutePlan {
  const volunteer = toWaypoint(input.volunteer)
  const donor = toWaypoint(input.donor)
  const ngo = toWaypoint(input.ngo)

  const waypoints = input.donorHandoffConfirmedAt
    ? [volunteer, ngo]
    : [volunteer, donor, ngo]

  const valid = waypoints.filter(
    (waypoint): waypoint is RouteWaypoint => waypoint !== null,
  )
  if (valid.length !== waypoints.length || valid.length < 2) {
    return { status: "skipped", reason: "insufficient_waypoints" }
  }

  // A route that starts and ends at effectively the same place is degenerate.
  const first = valid[0]
  const last = valid[valid.length - 1]
  if (samePlace(first, last)) {
    return { status: "skipped", reason: "identical_endpoints" }
  }

  // Routing through a donor that sits on top of the NGO is degenerate too.
  if (donor && ngo && samePlace(donor, ngo)) {
    return { status: "skipped", reason: "identical_endpoints" }
  }

  const coordinates = valid
    .map((waypoint) => `${waypoint.longitude},${waypoint.latitude}`)
    .join(";")
  const url = `${OSRM_BASE_URL}/${coordinates}?overview=full&geometries=geojson`
  return { status: "ready", waypoints: valid, url }
}

/**
 * Fetch the route geometry for a planned route. Returns null on any failure
 * (HTTP error, OSRM error code, missing geometry, network failure) so the map
 * can degrade gracefully instead of throwing.
 */
export async function fetchRouteGeometry(
  url: string,
): Promise<RouteGeometry | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const data = await response.json()
    if (!data || data.code !== "Ok") return null
    const geometry = data.routes?.[0]?.geometry
    if (
      !geometry ||
      geometry.type !== "LineString" ||
      !Array.isArray(geometry.coordinates)
    ) {
      return null
    }
    return geometry as RouteGeometry
  } catch {
    return null
  }
}
