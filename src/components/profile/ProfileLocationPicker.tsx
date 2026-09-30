"use client"

import mapboxgl, { type Map as MapboxMap, type Marker as MapboxMarker } from "mapbox-gl"
import { LocateFixed, MapPin, Search } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react"
import "mapbox-gl/dist/mapbox-gl.css"
import { BASE_MAP_STYLE, MAP_TILE_ATTRIBUTION, MAP_TILE_ATTRIBUTION_URL } from "@/lib/map-style"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  type LatestRequest,
  type ProfileLocation,
  type ProfileLocationCandidate,
} from "@/lib/profile-location"

type ProfileLocationPickerProps = {
  location: ProfileLocation
  disabled?: boolean
  addressLabel?: string
  addressHelpText?: string
  needsAddressReview: boolean
  onChange: (location: ProfileLocation) => void
  onResolvingChange?: (resolving: boolean) => void
  onAddressReviewChange?: (needsReview: boolean) => void
}

type MapboxFeatureCollection = { features?: unknown[] }
type LocationField = "address" | "city" | "state" | "pincode"
type MapStatus = "loading" | "ready" | "error"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const DEFAULT_CENTER: [number, number] = [78.9629, 20.5937]

function coordinatePoint(location: ProfileLocation): [number, number] | null {
  if (location.latitude === null || location.longitude === null) return null
  if (!isValidCoordinates(location.latitude, location.longitude)) return null
  return [location.longitude, location.latitude]
}

function mapboxErrorMessage(error: unknown, operation: "reverse" | "selection") {
  if (error instanceof Error && error.name === "AbortError") return ""
  return operation === "reverse"
    ? "Mapbox could not look up this location. The selected coordinates are kept; enter or select an address before saving."
    : "Mapbox could not verify that address. Existing location details are kept; choose another result or enter the address manually."
}

export default function ProfileLocationPicker({
  location,
  disabled = false,
  addressLabel = "Address",
  addressHelpText,
  needsAddressReview,
  onChange,
  onResolvingChange,
  onAddressReviewChange,
}: ProfileLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const markerRef = useRef<MapboxMarker | null>(null)
  const locationRef = useRef(location)
  const onChangeRef = useRef(onChange)
  const onResolvingChangeRef = useRef(onResolvingChange)
  const onAddressReviewChangeRef = useRef(onAddressReviewChange)
  const disabledRef = useRef(disabled)
  const locationGuardRef = useRef(createLatestRequestGuard())
  const searchGuardRef = useRef(createLatestRequestGuard())
  const selectCoordinatesRef = useRef<((longitude: number, latitude: number) => void) | null>(null)
  const reverseTimerRef = useRef<number | null>(null)
  const geolocationSequenceRef = useRef(0)
  const geolocatingRef = useRef(false)
  const resolvingRef = useRef(false)
  const selectedPointNeedsAddressRef = useRef(false)
  const pendingSearchSelectionRef = useRef(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ProfileLocationCandidate[]>([])
  const [activeResult, setActiveResult] = useState(-1)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [notice, setNotice] = useState("")
  const [geolocating, setGeolocating] = useState(false)
  const [mapError, setMapError] = useState("")
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading")
  const [resolving, setResolvingState] = useState(false)

  const setGeolocatingState = useCallback((loading: boolean) => {
    geolocatingRef.current = loading
    setGeolocating(loading)
  }, [])

  useEffect(() => {
    locationRef.current = location
    onChangeRef.current = onChange
    onResolvingChangeRef.current = onResolvingChange
    onAddressReviewChangeRef.current = onAddressReviewChange
    disabledRef.current = disabled
  }, [location, onChange, onResolvingChange, onAddressReviewChange, disabled])

  const setResolving = useCallback((resolving: boolean) => {
    resolvingRef.current = resolving
    setResolvingState(resolving)
    onResolvingChangeRef.current?.(resolving)
  }, [])

  const setNeedsReview = useCallback((needsReview: boolean) => {
    onAddressReviewChangeRef.current?.(needsReview)
  }, [])

  const publishLocation = useCallback((next: ProfileLocation) => {
    locationRef.current = next
    onChangeRef.current(next)
  }, [])

  const placeMarker = useCallback((longitude: number, latitude: number, moveMap: boolean) => {
    const map = mapRef.current
    if (!map || !isValidCoordinates(latitude, longitude)) return

    if (markerRef.current) {
      markerRef.current.setLngLat([longitude, latitude])
      markerRef.current.setDraggable(!disabledRef.current)
    } else {
      const marker = new mapboxgl.Marker({ color: "#15803d", draggable: !disabledRef.current })
        .setLngLat([longitude, latitude])
        .addTo(map)
      marker.on("dragend", () => {
        if (disabledRef.current) return
        const point = marker.getLngLat()
        selectCoordinatesRef.current?.(point.lng, point.lat)
      })
      markerRef.current = marker
    }

    if (moveMap) {
      map.easeTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 14), duration: 350 })
    }
  }, [])

  const cancelLocationWork = useCallback(() => {
    if (reverseTimerRef.current !== null) {
      window.clearTimeout(reverseTimerRef.current)
      reverseTimerRef.current = null
    }
    locationGuardRef.current.invalidate()
    geolocationSequenceRef.current += 1
    if (resolvingRef.current) setResolving(false)
    if (geolocatingRef.current) setGeolocatingState(false)
  }, [setGeolocatingState, setResolving])

  const reverseGeocode = useCallback(async (
    longitude: number,
    latitude: number,
    request: LatestRequest,
  ) => {
    if (!MAPBOX_TOKEN) {
      if (request.isCurrent()) {
        setResolving(false)
        setNotice("Coordinates selected. Mapbox address lookup is unavailable; enter the address before saving.")
      }
      return
    }

    try {
      const response = await fetch(buildMapboxPermanentReverseUrl(longitude, latitude, MAPBOX_TOKEN), { signal: request.signal })
      if (!response.ok) throw new Error("Reverse geocoding failed")
      const data = await response.json() as MapboxFeatureCollection
      if (!request.isCurrent()) return
      const candidate = (data.features ?? []).map(parseMapboxLocation).find((item) => item !== null)
      if (!candidate) {
        setResolving(false)
        setNotice("Coordinates selected, but no readable address was found. Enter the address before saving.")
        return
      }

      const updated = mergeProfileLocation(locationRef.current, candidate)
      publishLocation(updated)
      selectedPointNeedsAddressRef.current = false
      setNeedsReview(false)
      placeMarker(updated.longitude, updated.latitude, false)
      setNotice("Location address updated.")
    } catch (error) {
      if (!request.isCurrent()) return
      const message = mapboxErrorMessage(error, "reverse")
      if (message) setNotice(message)
    } finally {
      if (request.isCurrent()) setResolving(false)
    }
  }, [placeMarker, publishLocation, setNeedsReview, setResolving])

  const selectCoordinates = useCallback((longitude: number, latitude: number) => {
    if (disabledRef.current) return
    if (!isValidCoordinates(latitude, longitude)) {
      setNotice("That location has invalid coordinates. Choose another point on the map.")
      return
    }

    cancelLocationWork()
    const request = locationGuardRef.current.begin()
    const updated = profileLocationAtCoordinates(locationRef.current, latitude, longitude)
    if (!updated) {
      setNotice("That location has invalid coordinates. Choose another point on the map.")
      return
    }
    pendingSearchSelectionRef.current = false
    selectedPointNeedsAddressRef.current = true
    publishLocation(updated)
    setNeedsReview(true)
    placeMarker(longitude, latitude, true)
    searchGuardRef.current.invalidate()
    setSearching(false)
    setQuery("")
    setResults([])
    setSearchError("")
    setNotice("Location selected. Looking up its address…")
    setResolving(true)

    if (!MAPBOX_TOKEN) {
      setResolving(false)
      setNotice("Coordinates selected. Mapbox address lookup is unavailable; enter the address before saving.")
      return
    }

    // Short delay coalesces rapid map clicks so abandoned points do not incur permanent requests.
    reverseTimerRef.current = window.setTimeout(() => {
      reverseTimerRef.current = null
      void reverseGeocode(longitude, latitude, request)
    }, 250)
  }, [cancelLocationWork, placeMarker, publishLocation, reverseGeocode, setNeedsReview, setResolving])

  useEffect(() => {
    selectCoordinatesRef.current = selectCoordinates
  }, [selectCoordinates])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const locationGuard = locationGuardRef.current
    const searchGuard = searchGuardRef.current
    let loaded = false
    try {
      const initialPoint = coordinatePoint(locationRef.current)
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: BASE_MAP_STYLE,
        attributionControl: false,
        center: initialPoint ?? DEFAULT_CENTER,
        zoom: initialPoint ? 14 : 4,
      })
      mapRef.current = map
      map.on("load", () => {
        loaded = true
        setMapStatus("ready")
        setMapError("")
        const point = coordinatePoint(locationRef.current)
        if (point) placeMarker(point[0], point[1], false)
      })
      map.on("error", () => {
        if (!loaded) setMapStatus("error")
        setMapError("The map could not load. You can still enter an address or use browser location.")
      })
      map.on("click", (event) => {
        if (!disabledRef.current) selectCoordinatesRef.current?.(event.lngLat.lng, event.lngLat.lat)
      })
    } catch {
      window.setTimeout(() => {
        setMapStatus("error")
        setMapError("The map could not be initialized. You can still enter an address or use browser location.")
      }, 0)
    }

    return () => {
      if (reverseTimerRef.current !== null) window.clearTimeout(reverseTimerRef.current)
      locationGuard.invalidate()
      searchGuard.invalidate()
      geolocationSequenceRef.current += 1
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [placeMarker])

  useEffect(() => {
    const map = mapRef.current
    if (map) {
      const gestureHandlers = [map.scrollZoom, map.dragPan, map.boxZoom, map.doubleClickZoom, map.keyboard, map.touchZoomRotate]
      gestureHandlers.forEach((handler) => disabled ? handler.disable() : handler.enable())
    }
    markerRef.current?.setDraggable(!disabled)
    if (disabled) {
      cancelLocationWork()
      selectedPointNeedsAddressRef.current = false
      pendingSearchSelectionRef.current = false
      searchGuardRef.current.invalidate()
      const point = coordinatePoint(locationRef.current)
      if (point) placeMarker(point[0], point[1], false)
      else {
        markerRef.current?.remove()
        markerRef.current = null
      }
    }
  }, [cancelLocationWork, disabled, placeMarker])

  useEffect(() => {
    const point = location.latitude !== null && location.longitude !== null
      && isValidCoordinates(location.latitude, location.longitude)
      ? [location.longitude, location.latitude] as [number, number]
      : null
    if (point) placeMarker(point[0], point[1], false)
  }, [location.latitude, location.longitude, placeMarker])

  useEffect(() => {
    const validation = validateAddressSearchQuery(query)
    if (validation.status === "invalid") {
      return
    }
    if (validation.status === "short" || !MAPBOX_TOKEN || disabled) return

    const trimmedQuery = validation.query
    const searchGuard = searchGuardRef.current
    const timeoutId = window.setTimeout(async () => {
      const request = searchGuard.begin()
      setSearching(true)
      setSearchError("")
      try {
        // Autocomplete is temporary; permanent storage is requested only for a selected result.
        const response = await fetch(buildMapboxSuggestionUrl(trimmedQuery, MAPBOX_TOKEN), { signal: request.signal })
        if (!response.ok) throw new Error("Address search failed")
        const data = await response.json() as MapboxFeatureCollection
        if (!request.isCurrent()) return
        const candidates = (data.features ?? []).map(parseMapboxLocation).filter((item): item is ProfileLocationCandidate => item !== null)
        setResults(candidates)
        setActiveResult(-1)
        setSearchError(candidates.length ? "" : "No matching addresses found. Try a nearby street, area, or city.")
      } catch {
        if (request.isCurrent()) {
          setResults([])
          setSearchError("Address search failed. Check your connection and try again.")
        }
      } finally {
        if (request.isCurrent()) setSearching(false)
      }
    }, 350)

    return () => {
      window.clearTimeout(timeoutId)
      searchGuard.invalidate()
    }
  }, [disabled, query])

  function changeSearch(value: string) {
    const validation = validateAddressSearchQuery(value)
    if (validation.status !== "invalid" && validation.query === query) return
    // A new query cancels an unfinished reverse or permanent selection request.
    cancelLocationWork()
    pendingSearchSelectionRef.current = false
    searchGuardRef.current.invalidate()
    setSearching(false)
    setResults([])
    setActiveResult(-1)
    setQuery(validation.status === "invalid" ? value : validation.query)
    setSearchError(validation.status === "invalid" ? validation.message : "")
    const point = coordinatePoint(locationRef.current)
    if (point) placeMarker(point[0], point[1], false)
    else {
      markerRef.current?.remove()
      markerRef.current = null
    }
  }

  function changeLocationField(field: LocationField, value: string) {
    // Cancel geocoding before publishing any manual field change so its response cannot overwrite user input.
    const abandonedSearchSelection = pendingSearchSelectionRef.current
    const abandonedGeolocation = geolocatingRef.current
    cancelLocationWork()
    pendingSearchSelectionRef.current = false
    const next = {
      ...locationRef.current,
      [field]: value,
      ...((abandonedSearchSelection || abandonedGeolocation) && field === "address" ? { latitude: null, longitude: null } : {}),
    }
    publishLocation(next)
    if (field === "address" && selectedPointNeedsAddressRef.current) {
      const needsAddress = !value.trim()
      setNeedsReview(needsAddress)
      if (!needsAddress) {
        selectedPointNeedsAddressRef.current = false
        setNotice("Address entered for the selected coordinates.")
      }
    }
    const point = coordinatePoint(next)
    if (point) placeMarker(point[0], point[1], false)
    else {
      markerRef.current?.remove()
      markerRef.current = null
    }
  }

  async function selectSearchResult(candidate: ProfileLocationCandidate) {
    if (disabledRef.current || !MAPBOX_TOKEN) return
    cancelLocationWork()
    searchGuardRef.current.invalidate()
    setSearching(false)
    setSearchError("")
    setResults([])
    setQuery("")
    const request = locationGuardRef.current.begin()
    pendingSearchSelectionRef.current = true
    setResolving(true)
    setNotice("Verifying the selected address for profile storage…")
    // Show the likely selection on the map while verifying, but do not save temporary suggestion data.
    placeMarker(candidate.longitude, candidate.latitude, true)

    try {
      const response = await fetch(buildMapboxPermanentSelectionUrl(candidate, MAPBOX_TOKEN), { signal: request.signal })
      if (!response.ok) throw new Error("Selected address verification failed")
      const data = await response.json() as MapboxFeatureCollection
      if (!request.isCurrent()) return
      const verified = (data.features ?? []).map(parseMapboxLocation).find((item) => item !== null)
      if (!verified) throw new Error("Selected address could not be verified")
      const updated = mergeProfileLocation(locationRef.current, verified)
      publishLocation(updated)
      pendingSearchSelectionRef.current = false
      selectedPointNeedsAddressRef.current = false
      setNeedsReview(false)
      placeMarker(updated.longitude, updated.latitude, true)
      setNotice("Selected address is ready to save.")
    } catch (error) {
      if (!request.isCurrent()) return
      pendingSearchSelectionRef.current = false
      const message = mapboxErrorMessage(error, "selection")
      setNotice(message || "Selected address lookup was cancelled. Choose the address again.")
      const oldPoint = coordinatePoint(locationRef.current)
      if (oldPoint) placeMarker(oldPoint[0], oldPoint[1], true)
    } finally {
      if (request.isCurrent()) setResolving(false)
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault()
      setActiveResult((current) => (current + 1) % results.length)
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault()
      setActiveResult((current) => current <= 0 ? results.length - 1 : current - 1)
    } else if (event.key === "Enter" && activeResult >= 0 && results[activeResult]) {
      event.preventDefault()
      void selectSearchResult(results[activeResult])
    } else if (event.key === "Escape") {
      setResults([])
      setActiveResult(-1)
    }
  }

  function useCurrentLocation() {
    setNotice("")
    if (!navigator.geolocation) {
      setNotice("This browser does not support location access. Enter an address or choose a point on the map.")
      return
    }
    cancelLocationWork()
    pendingSearchSelectionRef.current = false
    searchGuardRef.current.invalidate()
    setSearching(false)
    setResults([])
    setQuery("")
    const previousPoint = coordinatePoint(locationRef.current)
    if (previousPoint) placeMarker(previousPoint[0], previousPoint[1], false)
    else {
      markerRef.current?.remove()
      markerRef.current = null
    }
    const requestId = ++geolocationSequenceRef.current
    setGeolocatingState(true)
    setResolving(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (requestId !== geolocationSequenceRef.current) return
        setGeolocatingState(false)
        if (!isValidCoordinates(coords.latitude, coords.longitude)) {
          setResolving(false)
          setNotice("Your browser returned invalid coordinates. Choose a location on the map instead.")
          return
        }
        selectCoordinates(coords.longitude, coords.latitude)
      },
      (error) => {
        if (requestId !== geolocationSequenceRef.current) return
        setGeolocatingState(false)
        setResolving(false)
        setNotice(geolocationErrorMessage(error.code))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  const selectedAddress = location.address || "No readable address selected yet"

  return (
    <div className="min-w-0 space-y-4">
      <div className="space-y-2">
        <label htmlFor="profile-location-search" className="text-sm font-medium">Search for an address</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="profile-location-search"
            value={query}
            onChange={(event) => changeSearch(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            disabled={disabled || !MAPBOX_TOKEN}
            placeholder={MAPBOX_TOKEN ? "Street, area, city, or pincode" : "Address search requires Mapbox configuration"}
            autoComplete="off"
            maxLength={256}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={!disabled && results.length > 0}
            aria-controls="profile-location-results"
            aria-activedescendant={!disabled && activeResult >= 0 ? `profile-location-result-${activeResult}` : undefined}
            aria-describedby="profile-location-search-help"
            className="pl-9"
          />
          {!disabled && results.length > 0 && (
            <div id="profile-location-results" role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
              {results.map((candidate, index) => (
                <button
                  type="button"
                  key={candidate.mapboxId ?? `${candidate.longitude},${candidate.latitude},${candidate.address}`}
                  id={`profile-location-result-${index}`}
                  role="option"
                  aria-selected={activeResult === index}
                  tabIndex={-1}
                  className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-accent ${activeResult === index ? "bg-accent" : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveResult(index)}
                  onClick={() => void selectSearchResult(candidate)}
                >
                  <span className="block break-words font-medium">{candidate.address}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{[candidate.city, candidate.state, candidate.pincode].filter(Boolean).join(", ")}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p id="profile-location-search-help" className="text-xs text-muted-foreground">Enter 3–256 characters, up to 20 words. Semicolons are not allowed.</p>
        {!MAPBOX_TOKEN && <p className="text-sm text-destructive" role="status">Address search is unavailable because Mapbox is not configured.</p>}
        {searching && !disabled && <p className="text-sm text-muted-foreground" role="status">Searching addresses…</p>}
        {searchError && !disabled && <p className="text-sm text-destructive" role="alert">{searchError}</p>}
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <label htmlFor="profile-location-address" className="text-sm font-medium">{addressLabel}</label>
          <Textarea
            id="profile-location-address"
            autoComplete="street-address"
            maxLength={500}
            value={location.address}
            disabled={disabled}
            onChange={(event) => changeLocationField("address", event.target.value)}
            className="min-h-20"
          />
          {addressHelpText && <p className="text-xs text-muted-foreground">{addressHelpText}</p>}
        </div>
        <div className="grid gap-2">
          <label htmlFor="profile-location-city" className="text-sm font-medium">City</label>
          <Input id="profile-location-city" autoComplete="address-level2" maxLength={100} value={location.city} disabled={disabled} onChange={(event) => changeLocationField("city", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="profile-location-state" className="text-sm font-medium">State</label>
          <Input id="profile-location-state" autoComplete="address-level1" maxLength={100} value={location.state} disabled={disabled} onChange={(event) => changeLocationField("state", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="profile-location-pincode" className="text-sm font-medium">Pincode</label>
          <Input id="profile-location-pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} value={location.pincode} disabled={disabled} onChange={(event) => changeLocationField("pincode", event.target.value.replace(/\D/g, ""))} />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 break-words text-sm text-muted-foreground" aria-live="polite">
          <MapPin className="mr-1 inline h-4 w-4" aria-hidden="true" />
          Selected location: {selectedAddress}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} disabled={disabled || geolocating} className="w-full shrink-0 sm:w-auto">
          <LocateFixed className="mr-2 h-4 w-4" aria-hidden="true" />
          {geolocating ? "Finding location…" : "Use my current location"}
        </Button>
      </div>

      <div className="relative min-w-0">
        <div
          ref={mapContainerRef}
          className="h-64 w-full min-w-0 max-w-full overflow-hidden rounded-lg border bg-muted sm:h-80"
          aria-label="Choose a profile location on the map"
          role="application"
        />
        {mapStatus === "loading" && (
          <div className="absolute inset-0 flex h-64 items-center justify-center rounded-lg bg-background/75 text-sm text-muted-foreground sm:h-80" role="status" aria-live="polite">
            Loading map…
          </div>
        )}
        {mapStatus === "error" && (
          <div className="absolute inset-x-3 top-3 rounded-md border bg-background/95 p-3 text-sm text-destructive" role="status">
            {mapError || "The map could not be initialized. You can still enter an address or use browser location."}
          </div>
        )}
        <a
          href={MAP_TILE_ATTRIBUTION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 z-10 rounded bg-background/90 px-1.5 py-0.5 text-[10px] text-muted-foreground underline"
        >
          {MAP_TILE_ATTRIBUTION}
        </a>
      </div>
      {mapError && mapStatus !== "error" && <p className="text-sm text-destructive" role="status">{mapError}</p>}
      {resolving && <p className="text-sm text-muted-foreground" role="status">Verifying the selected location address…</p>}
      {needsAddressReview && !resolving && <p className="text-sm text-destructive" role="alert">The coordinates are selected, but the address still needs review. Enter the address or choose a result before saving.</p>}
      {notice && <p className="text-sm text-muted-foreground" role="status">{notice}</p>}
      <p className="text-xs text-muted-foreground">Search and select an address, choose a point on the map, or drag the marker. Volunteer profile location is separate from active pickup GPS.</p>
    </div>
  )
}
