"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/components/providers/AuthProvider"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { calculateDistance, estimateTravelTime } from "@/lib/utils"
import { Clock3, MapPin, PackageCheck, Phone, Truck } from "lucide-react"

type RequestItem = {
  id: string
  food_id: string
  ngo_id: string
  status: string
  requested_at: string
  profiles: {
    id: string
    name: string | null
    email: string | null
    role: string | null
    latitude: number | null
    longitude: number | null
  } | null
  food_donations: {
    id: string
    title: string
    quantity: number
    food_type: string | null
    pickup_address: string | null
    status: string | null
    donor_id: string
    latitude: number | null
    longitude: number | null
  } | null
  pickups: {
    id: string
    status: string
    assigned_at: string
    collected_at: string | null
    profiles: { name: string | null; phone: string | null } | null
  }[] | null
}

export default function RequestsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [now, setNow] = useState(() => Date.now())

  const loadRequests = useCallback(async (showLoading = true) => {
    if (!user || !profile) return
    try {
      if (showLoading) setLoading(true)
      
      // Fetch all requests along with joined data
      const { data, error } = await supabase
        .from("food_requests")
        .select(`
          id,
          food_id,
          ngo_id,
          status,
          requested_at,
          profiles (
            id,
            name,
            email,
            role,
            latitude,
            longitude
          ),
          food_donations (
            id,
            title,
            quantity,
            food_type,
            pickup_address,
            status,
            donor_id,
            latitude,
            longitude
          ),
          pickups (
            id,
            status,
            assigned_at,
            collected_at,
            profiles!pickups_volunteer_id_fkey (name, phone)
          )
        `)
        .order("requested_at", { ascending: false })

      if (error) throw error

      if (profile.role === "donor") {
        // Filter requests for food owned by this donor
        setRequests((data as unknown as RequestItem[]).filter(r => r.food_donations?.donor_id === user.id))
      } else {
        // Filter requests made by this NGO
        setRequests((data as unknown as RequestItem[]).filter(r => r.ngo_id === user.id))
      }
    } catch (error) {
      console.error("Error loading requests:", error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [user, profile])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRequests()
    const refresh = window.setInterval(() => void loadRequests(false), 20_000)
    return () => window.clearInterval(refresh)
  }, [loadRequests])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  async function updateRequest(requestId: string, status: "accepted" | "rejected") {
    setUpdatingId(requestId)
    setMessage("")

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ status }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || "Failed to update request.")
        return
      }

      setMessage(
        status === "accepted"
          ? "Food request accepted successfully!"
          : "Food request rejected successfully!"
      )

      await loadRequests()
    } catch (error) {
      console.error("Update request error:", error)
      setMessage("Something went wrong. Please try again.")
    } finally {
      setUpdatingId(null)
    }
  }

  if (authLoading || loading) {
    return <main className="p-8">Loading requests...</main>
  }
  
  if (!profile) return <main className="p-8">Please log in.</main>

  const isDonor = profile.role === "donor"

  return (
    <main className="p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            {isDonor ? "Incoming Requests" : "My Requests"}
          </h1>
          <p className="mt-2 text-gray-600">
            {isDonor ? "NGOs requesting your donated food." : "Track the status of the food you have requested."}
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-lg bg-emerald-50 text-emerald-700 p-4 text-sm font-medium border border-emerald-200">
            {message}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold">
              No requests yet
            </h2>
            <p className="mt-2 text-gray-600">
              {isDonor ? "When an NGO requests your food, it will appear here." : "You haven't requested any food yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {requests.map((request) => (
              <div key={request.id} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Food Donation</p>
                    <h2 className="mt-1 text-xl font-semibold">
                      {request.food_donations?.title || "Unknown donation"}
                    </h2>
                  </div>
                  <Badge variant={request.status === 'accepted' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize px-3 py-1">
                    {request.status}
                  </Badge>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {isDonor && (
                    <>
                      <div>
                        <p className="text-sm text-gray-500">NGO</p>
                        <p className="font-medium">{request.profiles?.name || "Unknown NGO"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">NGO Email</p>
                        <p className="font-medium">{request.profiles?.email || "Not available"}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="font-medium">{request.food_donations?.quantity || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Food Type</p>
                    <p className="font-medium">{request.food_donations?.food_type || "Not provided"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-500">Pickup Address</p>
                    <p className="font-medium">{request.food_donations?.pickup_address || "Not provided"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-500">Requested At</p>
                    <p className="font-medium">{new Date(request.requested_at).toLocaleString()}</p>
                  </div>
                </div>

                {isDonor && request.status === "pending" && (
                  <div className="mt-6 flex gap-3 border-t pt-6">
                    <button
                      onClick={() => updateRequest(request.id, "accepted")}
                      disabled={updatingId === request.id}
                      className="flex-1 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
                    >
                      {updatingId === request.id ? "Updating..." : "Accept Request"}
                    </button>
                    <button
                      onClick={() => updateRequest(request.id, "rejected")}
                      disabled={updatingId === request.id}
                      className="flex-1 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive px-4 py-3 font-medium disabled:opacity-50 hover:bg-destructive/10"
                    >
                      Reject Request
                    </button>
                  </div>
                )}

                {request.status === "accepted" && (() => {
                  const pickup = request.pickups?.[0]
                  const pickupStatus = pickup?.status
                  const orderId = `FL-${request.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`
                  const hasCoordinates = request.food_donations?.latitude != null
                    && request.food_donations.longitude != null
                    && request.profiles?.latitude != null
                    && request.profiles.longitude != null
                  const distanceKm = hasCoordinates
                    ? calculateDistance(
                        request.food_donations!.latitude!,
                        request.food_donations!.longitude!,
                        request.profiles!.latitude!,
                        request.profiles!.longitude!
                      )
                    : null
                  const deliveryStarted = pickupStatus === "en_route_to_ngo"
                  const delivered = pickupStatus === "arrived_at_ngo" || pickupStatus === "completed" || pickupStatus === "delivered"
                  const totalMinutes = distanceKm == null ? null : estimateTravelTime(distanceKm)
                  const elapsedMinutes = deliveryStarted && pickup?.collected_at
                    ? Math.max(0, Math.floor((now - new Date(pickup.collected_at).getTime()) / 60_000))
                    : 0
                  const remainingMinutes = delivered ? 0 : totalMinutes == null ? null : Math.max(0, totalMinutes - elapsedMinutes)
                  const milestones = [
                    { label: "Volunteer assigned", done: Boolean(pickup) },
                    { label: "Picked up from donor", done: ["collected", "en_route_to_ngo", "arrived_at_ngo", "completed", "delivered"].includes(pickupStatus || "") },
                    { label: "Out for delivery", done: ["en_route_to_ngo", "arrived_at_ngo", "completed", "delivered"].includes(pickupStatus || "") },
                    { label: "Arrived at NGO", done: delivered },
                  ]

                  return (
                    <section className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5" aria-label={`Order ${orderId} tracking`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 font-semibold"><PackageCheck className="h-5 w-5 text-primary" /> Order details</div>
                        <Badge variant="outline" className="font-mono">{orderId}</Badge>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-sm text-gray-500">Delivery status</p>
                          <p className="mt-1 flex items-center gap-2 font-medium capitalize">
                            <Truck className="h-4 w-4 text-primary" />
                            {pickupStatus ? pickupStatus.replace(/_/g, " ") : "Waiting for a volunteer"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Volunteer</p>
                          <p className="mt-1 font-medium">{pickup?.profiles?.name || "Not assigned yet"}</p>
                          {pickup?.profiles?.phone && (
                            <a className="mt-1 inline-flex items-center gap-1 text-sm text-primary underline" href={`tel:${pickup.profiles.phone}`}>
                              <Phone className="h-3.5 w-3.5" /> {pickup.profiles.phone}
                            </a>
                          )}
                          {pickup && !pickup.profiles?.phone && <p className="mt-1 text-sm text-muted-foreground">Volunteer phone not provided</p>}
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Donor to NGO distance</p>
                          <p className="mt-1 flex items-center gap-2 font-medium">
                            <MapPin className="h-4 w-4 text-primary" />
                            {distanceKm == null ? "Location unavailable" : `About ${distanceKm.toFixed(1)} km`}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Estimated arrival</p>
                          <p className="mt-1 flex items-center gap-2 font-medium">
                            <Clock3 className="h-4 w-4 text-primary" />
                            {!pickup ? "Available after volunteer assignment" : delivered ? "Arrived" : deliveryStarted && remainingMinutes != null ? remainingMinutes === 0 ? "Arriving now" : `About ${remainingMinutes} min remaining` : "Estimate available when delivery starts"}
                          </p>
                          {deliveryStarted && totalMinutes != null && !delivered && <p className="mt-1 text-xs text-muted-foreground">Approximate estimate based on route distance</p>}
                        </div>
                      </div>

                      <ol className="mt-5 grid gap-2 border-t pt-4 sm:grid-cols-2">
                        {milestones.map((milestone) => (
                          <li key={milestone.label} className={`flex items-center gap-2 text-sm ${milestone.done ? "font-medium text-primary" : "text-muted-foreground"}`}>
                            <span className={`h-2.5 w-2.5 rounded-full ${milestone.done ? "bg-primary" : "bg-muted-foreground/30"}`} />
                            {milestone.label}
                          </li>
                        ))}
                      </ol>
                    </section>
                  )
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
