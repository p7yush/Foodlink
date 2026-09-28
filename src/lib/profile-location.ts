export type ProfileLocation = {
  address: string
  city: string
  state: string
  pincode: string
  latitude: number | null
  longitude: number | null
}

export type ProfileLocationCandidate = Omit<ProfileLocation, "latitude" | "longitude"> & {
  latitude: number
  longitude: number
  mapboxId?: string
}

type MapboxFeature = {
  geometry?: { coordinates?: unknown }
  properties?: {
    mapbox_id?: unknown
    full_address?: unknown
    name_preferred?: unknown
    name?: unknown
    place_formatted?: unknown
    place_name?: unknown
    context?: Record<string, unknown>
  }
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function contextName(context: Record<string, unknown> | undefined, key: string): string {
  const value = context?.[key]
  if (typeof value === "string") return value.trim()
  if (!value || typeof value !== "object") return ""
  const item = value as Record<string, unknown>
  return clean(item.name_preferred) || clean(item.name) || clean(item.text)
}

export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180
}

export function parseMapboxLocation(value: unknown): ProfileLocationCandidate | null {
  if (!value || typeof value !== "object") return null
  const feature = value as MapboxFeature
  const coordinates = feature.geometry?.coordinates
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null
  if (typeof coordinates[0] !== "number" || typeof coordinates[1] !== "number") return null
  const longitude = Number(coordinates[0])
  const latitude = Number(coordinates[1])
  if (!isValidCoordinates(latitude, longitude)) return null

  const properties = feature.properties ?? {}
  const context = properties.context
  const name = clean(properties.name_preferred) || clean(properties.name)
  const placeFormatted = clean(properties.place_formatted)
  const address = clean(properties.full_address)
    || [name, placeFormatted].filter((part, index, parts) => part && parts.indexOf(part) === index).join(", ")
    || clean(properties.place_name)
  if (!address) return null

  return {
    address,
    // Mapbox v6 context may omit place/locality. Do not substitute a district.
    city: contextName(context, "place") || contextName(context, "locality"),
    state: contextName(context, "region"),
    pincode: contextName(context, "postcode"),
    latitude,
    longitude,
    ...(clean(properties.mapbox_id) ? { mapboxId: clean(properties.mapbox_id) } : {}),
  }
}

export function mergeProfileLocation(
  current: ProfileLocation,
  candidate: ProfileLocationCandidate,
): ProfileLocationCandidate {
  return {
    address: candidate.address || current.address,
    city: candidate.city || current.city,
    state: candidate.state || current.state,
    pincode: candidate.pincode || current.pincode,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    ...(candidate.mapboxId ? { mapboxId: candidate.mapboxId } : {}),
  }
}

export function profileLocationAtCoordinates(
  current: ProfileLocation,
  latitude: number,
  longitude: number,
): ProfileLocation | null {
  if (!isValidCoordinates(latitude, longitude)) return null
  return { ...current, address: "", latitude, longitude }
}

export type AddressSearchValidation =
  | { status: "valid"; query: string }
  | { status: "short"; query: string }
  | { status: "invalid"; query: string; message: string }

export function validateAddressSearchQuery(raw: string): AddressSearchValidation {
  const query = raw.trim()
  if (query.length > 256) {
    return { status: "invalid", query, message: "Search must be 256 characters or fewer." }
  }
  if (query.includes(";")) {
    return { status: "invalid", query, message: "Search cannot contain a semicolon. Remove it and try again." }
  }
  if ((query.match(/[\p{L}\p{N}]+/gu) ?? []).length > 20) {
    return { status: "invalid", query, message: "Search must contain 20 words or fewer." }
  }
  if (query.length < 3) return { status: "short", query }
  return { status: "valid", query }
}

const FORWARD_GEOCODE_URL = "https://api.mapbox.com/search/geocode/v6/forward"
const REVERSE_GEOCODE_URL = "https://api.mapbox.com/search/geocode/v6/reverse"

export function buildMapboxSuggestionUrl(query: string, token: string): string {
  const params = new URLSearchParams({
    q: query,
    access_token: token,
    autocomplete: "true",
    limit: "5",
    permanent: "false",
  })
  return `${FORWARD_GEOCODE_URL}?${params.toString()}`
}

export function buildMapboxPermanentSelectionUrl(candidate: ProfileLocationCandidate, token: string): string {
  const params = new URLSearchParams({
    q: candidate.mapboxId || candidate.address,
    access_token: token,
    autocomplete: "false",
    limit: "1",
    permanent: "true",
  })
  return `${FORWARD_GEOCODE_URL}?${params.toString()}`
}

export function buildMapboxPermanentReverseUrl(longitude: number, latitude: number, token: string): string {
  const params = new URLSearchParams({
    longitude: String(longitude),
    latitude: String(latitude),
    access_token: token,
    limit: "1",
    permanent: "true",
  })
  return `${REVERSE_GEOCODE_URL}?${params.toString()}`
}

export type LatestRequest = {
  id: number
  signal: AbortSignal
  isCurrent: () => boolean
}

export function createLatestRequestGuard() {
  let sequence = 0
  let activeController: AbortController | null = null

  return {
    begin(): LatestRequest {
      activeController?.abort()
      const controller = new AbortController()
      activeController = controller
      const id = ++sequence
      return {
        id,
        signal: controller.signal,
        isCurrent: () => sequence === id && !controller.signal.aborted,
      }
    },
    invalidate() {
      sequence += 1
      activeController?.abort()
      activeController = null
    },
  }
}

export function geolocationErrorMessage(code: number): string {
  if (code === 1) return "Location permission was denied. Allow location access in your browser or choose a point on the map."
  if (code === 3) return "Your current location took too long to load. Try again or choose a point on the map."
  return "Your current location is unavailable. Try again or choose a point on the map."
}
