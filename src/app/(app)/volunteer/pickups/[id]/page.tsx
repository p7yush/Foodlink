"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, CheckCircle2, Clock, Navigation } from "lucide-react"
import Link from "next/link"
import { calculateDistance, estimateTravelTime } from "@/lib/utils"
import PickupMap from "@/components/volunteer/PickupMap"
import { buildGoogleMapsDirections } from "@/lib/google-maps-directions"

type DestinationProfile = {
  name: string
  organization: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
} | null

type PickupDetailRow = {
  id: string
  status: string
  donor_handoff_confirmed_at: string | null
  recipient_received_at: string | null
  food_requests: {
    profiles?: DestinationProfile
    food_donations: {
      title: string
      quantity: number
      pickup_address: string | null
      latitude: number | null
      longitude: number | null
      profiles?: {
    name: string
    organization: string | null
    latitude: number | null
    longitude: number | null
  } | null
    } | null
  } | null
}

export default function PickupDetail() {
  const { id } = useParams()
  const { user, profile: currentProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [pickup, setPickup] = useState<PickupDetailRow | null>(null)
  const [updating, setUpdating] = useState(false)
  const [volunteerLocation, setVolunteerLocation] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null
  })

  useEffect(() => {
    async function fetchPickup() {
      if (!user || !id) return
      
      try {
        const { data, error } = await supabase
          .from("pickups")
          .select(
            "*, food_requests(*, food_donations(*, profiles!food_donations_donor_id_fkey(name, latitude, longitude)), profiles!food_requests_ngo_id_fkey(name, organization, address, latitude, longitude))"
          )
          .eq("id", id)
          .single()

        if (error) throw error

        
        setPickup(data as unknown as PickupDetailRow)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    void fetchPickup()
    const refresh = window.setInterval(() => void fetchPickup(), 15_000)
    return () => window.clearInterval(refresh)
  }, [user, id])

  const locationWatchRef = useRef<number | null>(null)
  const lastLocationSentAtRef = useRef(0)

  useEffect(() => {
    if (!pickup || !id || typeof navigator === "undefined" || !navigator.geolocation) {
      return
    }

    const activeStatuses = [
      "en_route_to_donor",
      "collected",
      "en_route_to_ngo",
    ]

    if (!activeStatuses.includes(pickup.status)) {
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current)
        locationWatchRef.current = null
      }
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now()

        if (now - lastLocationSentAtRef.current < 5000) {
          return
        }

        lastLocationSentAtRef.current = now

        // Update local state for map display
        setVolunteerLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })

        try {
          const {
            data: { session },
          } = await supabase.auth.getSession()

          if (!session?.access_token) {
            return
          }

          await fetch(`/api/pickups/${id}/location`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          })
        } catch (error) {
          console.warn("Could not send volunteer location:", error)
        }
      },
      (error) => {
        console.warn("Volunteer location error:", error)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    )

    locationWatchRef.current = watchId

    return () => {
      navigator.geolocation.clearWatch(watchId)

      if (locationWatchRef.current === watchId) {
        locationWatchRef.current = null
      }
    }
  }, [pickup, id])
  async function updateStatus(newStatus: string) {
    if (!user) return
    setUpdating(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/pickups/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        const result = await res.json()
        setPickup(prev => (prev ? { ...prev, status: result.pickup.status } : prev))
      } else {
        const errorData = await res.json()
        alert(errorData.error || "Failed to update status")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="p-8">Loading pickup details...</div>
  if (!pickup) return <div className="p-8">Pickup not found or access denied.</div>

  const req = pickup.food_requests
  const donation = req?.food_donations
  if (!req || !donation) return <div className="p-8">This pickup is missing its donation record.</div>

  const donorName = donation.profiles?.name ?? "Unknown Donor"
  const ngoName = req.profiles?.organization || req.profiles?.name || "Unknown NGO"
  const donorCoordinates = {
    latitude: donation.latitude ?? donation.profiles?.latitude ?? null,
    longitude: donation.longitude ?? donation.profiles?.longitude ?? null,
  }
  const ngoCoordinates = {
    latitude: req.profiles?.latitude ?? null,
    longitude: req.profiles?.longitude ?? null,
  }
  const googleMapsRoute = buildGoogleMapsDirections({
    volunteerLiveLocation: volunteerLocation,
    volunteerProfileLocation: {
      latitude: currentProfile?.latitude ?? null,
      longitude: currentProfile?.longitude ?? null,
    },
    donorLocation: donorCoordinates,
    ngoLocation: ngoCoordinates,
    donorHandoffConfirmedAt: pickup.donor_handoff_confirmed_at,
    pickupStatus: pickup.status,
  })

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
        <Link href="/dashboard" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-muted-foreground hover:text-foreground"><span aria-hidden="true">←</span> Back</Link>
        <h1 className="min-w-0 break-words text-xl font-bold sm:text-2xl">Active Delivery</h1>
      </div>

      {/* Map Section */}
      {pickup && (
        <div className="mb-6 min-w-0">
          <h3 className="text-lg font-semibold mb-2">Delivery Route</h3>
          <div className="relative w-full min-w-0 overflow-hidden rounded-lg">
          <PickupMap
            volunteerLocation={{
              latitude: volunteerLocation.latitude,
              longitude: volunteerLocation.longitude,
              label: "Your Location"
            }}
            donorLocation={{
              latitude: donorCoordinates.latitude,
              longitude: donorCoordinates.longitude,
              label: "Donor Location"
            }}
            ngoLocation={{
              latitude: ngoCoordinates.latitude,
              longitude: ngoCoordinates.longitude,
              label: "NGO Location"
            }}
            pickupStatus={pickup.status}
            donorHandoffConfirmedAt={pickup.donor_handoff_confirmed_at}
            className="rounded-lg"
          />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            {googleMapsRoute.status === "ready" ? (
              <a
                href={googleMapsRoute.url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
              >
                <Navigation className="h-4 w-4" aria-hidden="true" />
                Open in Google Maps
              </a>
            ) : (
              <Button type="button" variant="outline" disabled className="w-full sm:w-auto">
                <Navigation className="h-4 w-4" aria-hidden="true" />
                Open in Google Maps
              </Button>
            )}
            {googleMapsRoute.status === "unavailable" ? (
              <p className="text-sm text-muted-foreground" role="status">{googleMapsRoute.reason}</p>
            ) : googleMapsRoute.notice ? (
              <p className="text-sm text-muted-foreground" role="status">{googleMapsRoute.notice}</p>
            ) : null}
          </div>
        </div>
      )}

      <div className="grid gap-6">
        <Card className="min-w-0 overflow-hidden rounded-2xl border-border/50 shadow-sm">
          <div className="flex min-w-0 flex-col items-start justify-between gap-3 border-b border-primary/10 bg-primary/10 p-4 sm:flex-row sm:items-center sm:p-6">
            <div className="min-w-0">
              <Badge className="mb-2 max-w-full whitespace-normal break-words border-0 bg-primary/20 text-primary hover:bg-primary/30">Status: {pickup.status.replace(/_/g, ' ').toUpperCase()}</Badge>
              <h2 className="break-words text-2xl font-bold">{donation.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="font-medium text-muted-foreground">{donation.quantity} meals</p>
                {donation.latitude && donation.longitude && req.profiles?.latitude && req.profiles?.longitude && (
                  <>
                    <p className="text-emerald-700 font-medium">
                      {calculateDistance(donation.latitude, donation.longitude, req.profiles.latitude, req.profiles.longitude).toFixed(1)} km
                    </p>
                    <p className="text-blue-700 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3"/>
                      ~{estimateTravelTime(calculateDistance(donation.latitude, donation.longitude, req.profiles.latitude, req.profiles.longitude))} min ETA
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <CardContent className="space-y-8 p-4 sm:p-6">
            {/* Timeline */}
            <div className="relative border-l-2 border-muted ml-3 space-y-6">
              
              {/* Step 1: Donor */}
              <div className="relative pl-6">
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-background ${['en_route_to_donor', 'arrived_at_donor', 'collected', 'en_route_to_ngo', 'arrived_at_ngo', 'completed'].includes(pickup.status) ? 'bg-emerald-500' : 'bg-muted'}`} />
                <h4 className="font-bold uppercase tracking-wider text-xs text-muted-foreground">Pickup From</h4>
                <p className="font-medium text-lg mt-1">{donorName}</p>
                <p className="mt-1 flex min-w-0 items-start gap-1 break-words text-sm text-muted-foreground"><MapPin className="mt-1 h-3 w-3 shrink-0"/> <span className="min-w-0 break-words">{donation.pickup_address}</span></p>
              </div>

              {/* Step 2: NGO */}
              <div className="relative pl-6">
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-background ${['arrived_at_ngo', 'completed'].includes(pickup.status) ? 'bg-blue-500' : 'bg-muted'}`} />
                <h4 className="font-bold uppercase tracking-wider text-xs text-muted-foreground">Deliver To</h4>
                <p className="font-medium text-lg mt-1">{ngoName}</p>
                <p className="mt-1 flex min-w-0 items-start gap-1 break-words text-sm text-muted-foreground"><MapPin className="mt-1 h-3 w-3 shrink-0"/> <span className="min-w-0 break-words">{req.profiles?.address || "NGO Destination Address"}</span></p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-col gap-3 bg-muted/10 p-4 sm:p-6">
            {pickup.status === 'assigned' && (
              <Button disabled={updating} onClick={() => updateStatus('en_route_to_donor')} className="w-full py-6 text-lg rounded-xl shadow-md">
                Start Route to Donor
              </Button>
            )}
            
            {pickup.status === 'en_route_to_donor' && (
              <Button disabled={updating} onClick={() => updateStatus('arrived_at_donor')} className="w-full py-6 text-lg rounded-xl shadow-md">
                I&apos;ve Arrived at Donor
              </Button>
            )}

            {pickup.status === 'arrived_at_donor' && (
              <Button disabled={updating} onClick={() => updateStatus('collected')} className="w-full py-6 text-lg rounded-xl shadow-md bg-blue-600 hover:bg-blue-700">
                Confirm Food Collected
              </Button>
            )}

            {pickup.status === 'collected' && pickup.donor_handoff_confirmed_at && (
              <Button disabled={updating} onClick={() => updateStatus('en_route_to_ngo')} className="w-full py-6 text-lg rounded-xl shadow-md">
                Start Route to NGO
              </Button>
            )}

            {pickup.status === 'collected' && !pickup.donor_handoff_confirmed_at && (
              <div className="w-full rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground">
                Waiting for the donor to confirm the food handoff before you leave.
              </div>
            )}

            {pickup.status === 'en_route_to_ngo' && (
              <Button disabled={updating} onClick={() => updateStatus('arrived_at_ngo')} className="w-full py-6 text-lg rounded-xl shadow-md">
                I&apos;ve Arrived at NGO
              </Button>
            )}

            {pickup.status === 'arrived_at_ngo' && (
              <div className="w-full rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground">
                You marked arrival. The NGO must confirm they received the food to complete this order.
              </div>
            )}

            {pickup.status === 'completed' && (
              <div className="w-full py-4 text-center rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-6 h-6" /> Delivery Completed Successfully!
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

