"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, Package, AlertCircle } from "lucide-react"
import { calculateDistance, estimateTravelTime } from "@/lib/utils"
import { formatCountdown, minutesUntil } from "@/lib/matching"

type DestinationProfile = {
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
} | null

type AvailableRequest = {
  id: string
  status: string
  food_donations: {
    title: string
    quantity: number
    food_type: string | null
    expiry_time: string
    pickup_address: string | null
    latitude: number | null
    longitude: number | null
    profiles?: { name: string } | null
  } | null
  profiles?: DestinationProfile
  pickups?: { id: string }[] | { id: string } | null
}

export default function AvailablePickups() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [pickups, setPickups] = useState<AvailableRequest[]>([])
  // Captured when the list loads so urgency is computed from a fixed instant
  // rather than by reading the clock during render.
  const [fetchedAt, setFetchedAt] = useState(0)

  useEffect(() => {
    async function fetchPickups() {
      if (!user) return

      try {
        // Fetch food requests that are accepted by donor, but not yet picked up
        // We will filter on the frontend for those without a pickup record
        const { data, error } = await supabase
          .from("food_requests")
          .select(
            "*, food_donations(*, profiles!food_donations_donor_id_fkey(name)), profiles!food_requests_ngo_id_fkey(name, address, latitude, longitude), pickups(id)"
          )
          .eq("status", "accepted")

        if (error) throw error

        if (data) {
          // Filter out requests that already have an assigned pickup
          const rows = data as unknown as AvailableRequest[]
          setFetchedAt(Date.now())
          setPickups(rows.filter((request) => {
            const assignedPickups = Array.isArray(request.pickups)
              ? request.pickups
              : request.pickups ? [request.pickups] : []
            return assignedPickups.length === 0
          }))
        }
      } catch (err) {
        console.error("Error fetching pickups:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchPickups()
  }, [user])

  async function handleAcceptPickup(requestId: string) {
    if (!user) return

    try {
      const response = await fetch("/api/pickups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ request_id: requestId }),
      })

      const result = await response.json()
      if (response.ok && result.success) {
        setPickups(prev => prev.filter(p => p.id !== requestId))
        router.push(`/volunteer/pickups/${result.pickup.id}`)
      } else {
        alert(result.error || "Failed to accept pickup")
      }
    } catch (err) {
      console.error(err)
      alert("Something went wrong.")
    }
  }

  if (loading) return <div className="p-8">Loading available pickups...</div>

  if (profile?.role !== "volunteer") {
    return <div className="p-8">Access Denied. Only volunteers can view this page.</div>
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Available Pickups</h1>
        <p className="text-muted-foreground text-lg">Claim a pickup task and help rescue food.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {pickups.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-muted/20 rounded-2xl border border-dashed">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-bold">No pickups available</h3>
            <p className="text-muted-foreground mt-2">Check back later for new food rescue opportunities.</p>
          </div>
        ) : (
          pickups.map(pickup => {
            const donation = pickup.food_donations
            if (!donation) return null

            const ngoName = pickup.profiles?.name || "Unknown NGO"
            const donorName = donation.profiles?.name || "Unknown Donor"
            const minutesLeft = minutesUntil(donation.expiry_time, fetchedAt)
            const urgency = minutesLeft <= 120 ? "HIGH" : minutesLeft <= 360 ? "MEDIUM" : "LOW"

            return (
              <Card key={pickup.id} className="rounded-2xl border-border/50 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-primary/10 p-4 border-b border-primary/10 flex justify-between items-start">
                  <div>
                    <Badge className="mb-2 bg-primary/20 text-primary hover:bg-primary/30 border-0">{donation.food_type}</Badge>
                    <h3 className="text-xl font-bold">{donation.title}</h3>
                    <p className="font-medium text-muted-foreground text-sm mt-1">{donation.quantity} meals</p>
                  </div>
                  <Badge
                    variant={urgency === "LOW" ? "secondary" : "destructive"}
                    className="flex items-center gap-1 shrink-0"
                    title={formatCountdown(minutesLeft)}
                  >
                    <AlertCircle className="w-3 h-3" /> {urgency}
                  </Badge>
                </div>
                
                <CardContent className="p-5 flex-1 space-y-4">
                  {donation.latitude && donation.longitude && pickup.profiles?.latitude && pickup.profiles?.longitude && (
                    <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-lg text-sm">
                      <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                        <MapPin className="w-4 h-4" />
                        {calculateDistance(donation.latitude, donation.longitude, pickup.profiles.latitude, pickup.profiles.longitude).toFixed(1)} km route
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-600 font-medium border-l pl-4 border-border/50">
                        <Clock className="w-4 h-4" />
                        ~{estimateTravelTime(calculateDistance(donation.latitude, donation.longitude, pickup.profiles.latitude, pickup.profiles.longitude))} min ETA
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <div className="w-0.5 h-8 bg-border" />
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Pickup From</p>
                        <p className="font-medium">{donorName}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {donation.pickup_address}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Deliver To</p>
                        <p className="font-medium">{ngoName}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {pickup.profiles?.address || "Destination Address"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="p-5 pt-0 mt-auto">
                  <Button 
                    className="w-full rounded-xl py-6 text-lg shadow-md hover:shadow-lg transition-all"
                    onClick={() => handleAcceptPickup(pickup.id)}
                  >
                    Accept Pickup
                  </Button>
                </CardFooter>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
