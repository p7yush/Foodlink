import { isValidCoordinates } from "@/lib/profile-location"

export type RouteCoordinates = {
  latitude: number | null | undefined
  longitude: number | null | undefined
}

export type GoogleMapsDirectionsInput = {
  volunteerLiveLocation: RouteCoordinates
  volunteerProfileLocation: RouteCoordinates
  donorLocation: RouteCoordinates
  donorAddress?: string | null
  ngoLocation: RouteCoordinates
  donorHandoffConfirmedAt: string | null
  pickupStatus: string
}

export type GoogleMapsDirectionsResult =
  | {
      status: "ready"
      url: string
      origin: "live" | "profile" | "device"
      donorWaypoint: boolean
      notice: string | null
    }
  | { status: "unavailable"; reason: string }

type ValidCoordinates = { latitude: number; longitude: number }

function validCoordinates(value: RouteCoordinates): ValidCoordinates | null {
  const { latitude, longitude } = value
  if (typeof latitude !== "number" || typeof longitude !== "number") return null
  return isValidCoordinates(latitude, longitude) ? { latitude, longitude } : null
}

function formatCoordinates(value: ValidCoordinates): string {
  return `${value.latitude},${value.longitude}`
}

function sameCoordinates(left: ValidCoordinates, right: ValidCoordinates): boolean {
  return left.latitude === right.latitude && left.longitude === right.longitude
}

export function buildGoogleMapsDirections(input: GoogleMapsDirectionsInput): GoogleMapsDirectionsResult {
  const status = input.pickupStatus.toLowerCase()
  if (status === "completed") {
    return { status: "unavailable", reason: "This pickup is complete; navigation is no longer available." }
  }
  if (status === "cancelled" || status === "canceled") {
    return { status: "unavailable", reason: "This pickup was cancelled; navigation is no longer available." }
  }

  const ngo = validCoordinates(input.ngoLocation)
  if (!ngo) {
    return { status: "unavailable", reason: "The NGO destination coordinates are missing or invalid." }
  }

  // Match PickupMap's route switch: the donor stop is removed only after the
  // persisted donor handoff confirmation arrives.
  const handoffComplete = Boolean(input.donorHandoffConfirmedAt)
  const donor = validCoordinates(input.donorLocation)
  const donorAddress = input.donorAddress?.trim() || null
  if (!handoffComplete && !donor && !donorAddress) {
    return { status: "unavailable", reason: "The donor pickup coordinates are missing or invalid." }
  }

  const liveOrigin = validCoordinates(input.volunteerLiveLocation)
  const profileOrigin = validCoordinates(input.volunteerProfileLocation)
  const origin = liveOrigin ? "live" : profileOrigin ? "profile" : "device"
  const originCoordinates = liveOrigin ?? profileOrigin

  const donorWaypoint = !handoffComplete
    ? donorAddress ?? (donor && !sameCoordinates(donor, ngo) ? formatCoordinates(donor) : null)
    : null

  const params = new URLSearchParams({
    api: "1",
    destination: formatCoordinates(ngo),
    travelmode: "driving",
  })
  if (originCoordinates) params.set("origin", formatCoordinates(originCoordinates))
  if (donorWaypoint) params.set("waypoints", donorWaypoint)

  const notice = origin === "profile"
    ? "Live GPS is unavailable; directions will start from your saved profile location."
    : origin === "device"
      ? "Live GPS and saved profile location are unavailable; Google Maps will try to use this device’s location."
      : null

  return {
    status: "ready",
    url: `https://www.google.com/maps/dir/?${params.toString()}`,
    origin,
    donorWaypoint: Boolean(donorWaypoint),
    notice,
  }
}
