"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, ArrowRight, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link"
import { calculateDistance, estimateTravelTime } from "@/lib/utils"

export default function PickupDetail() {
  const { id } = useParams()
  const router = useRouter()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [pickup, setPickup] = useState<any>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    async function fetchPickup() {
      if (!user || !id) return
      
      try {
        const { data, error } = await supabase
          .from("pickups")
          .select("*, food_requests(*, food_donations(*, profiles!food_donations_donor_id_fkey(name)), profiles!food_requests_ngo_id_fkey(name))")
          .eq("id", id)
          .single()

        if (error) throw error
        setPickup(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchPickup()
  }, [user, id])

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
        setPickup((prev: any) => ({ ...prev, status: result.pickup.status }))
      } else {
        alert("Failed to update status")
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
  const donation = req.food_donations
  const donorName = donation.profiles?.name
  const ngoName = req.profiles?.name

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="text-2xl font-bold">Active Delivery</h1>
      </div>

      <div className="grid gap-6">
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
          <div className="bg-primary/10 p-6 border-b border-primary/10 flex justify-between items-center">
            <div>
              <Badge className="mb-2 bg-primary/20 text-primary hover:bg-primary/30 border-0">Status: {pickup.status.replace(/_/g, ' ').toUpperCase()}</Badge>
              <h2 className="text-2xl font-bold">{donation.title}</h2>
              <div className="flex items-center gap-3 mt-2">
                <p className="font-medium text-muted-foreground">{donation.quantity} meals</p>
                {donation.latitude && donation.longitude && req.profiles?.latitude && req.profiles?.longitude && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <p className="text-emerald-700 font-medium">
                      {calculateDistance(donation.latitude, donation.longitude, req.profiles.latitude, req.profiles.longitude).toFixed(1)} km
                    </p>
                    <span className="text-muted-foreground">•</span>
                    <p className="text-blue-700 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3"/>
                      ~{estimateTravelTime(calculateDistance(donation.latitude, donation.longitude, req.profiles.latitude, req.profiles.longitude))} min ETA
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <CardContent className="p-6 space-y-8">
            {/* Timeline */}
            <div className="relative border-l-2 border-muted ml-3 space-y-6">
              
              {/* Step 1: Donor */}
              <div className="relative pl-6">
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-background ${['en_route_to_donor', 'arrived_at_donor', 'collected', 'en_route_to_ngo', 'arrived_at_ngo', 'completed'].includes(pickup.status) ? 'bg-emerald-500' : 'bg-muted'}`} />
                <h4 className="font-bold uppercase tracking-wider text-xs text-muted-foreground">Pickup From</h4>
                <p className="font-medium text-lg mt-1">{donorName}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {donation.pickup_address}</p>
              </div>

              {/* Step 2: NGO */}
              <div className="relative pl-6">
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-background ${['arrived_at_ngo', 'completed'].includes(pickup.status) ? 'bg-blue-500' : 'bg-muted'}`} />
                <h4 className="font-bold uppercase tracking-wider text-xs text-muted-foreground">Deliver To</h4>
                <p className="font-medium text-lg mt-1">{ngoName}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {req.profiles?.address || "NGO Destination Address"}</p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-muted/10 p-6 flex-col gap-3">
            {pickup.status === 'assigned' && (
              <Button disabled={updating} onClick={() => updateStatus('en_route_to_donor')} className="w-full py-6 text-lg rounded-xl shadow-md">
                Start Route to Donor
              </Button>
            )}
            
            {pickup.status === 'en_route_to_donor' && (
              <Button disabled={updating} onClick={() => updateStatus('arrived_at_donor')} className="w-full py-6 text-lg rounded-xl shadow-md">
                I've Arrived at Donor
              </Button>
            )}

            {pickup.status === 'arrived_at_donor' && (
              <Button disabled={updating} onClick={() => updateStatus('collected')} className="w-full py-6 text-lg rounded-xl shadow-md bg-blue-600 hover:bg-blue-700">
                Confirm Food Collected
              </Button>
            )}

            {pickup.status === 'collected' && (
              <Button disabled={updating} onClick={() => updateStatus('en_route_to_ngo')} className="w-full py-6 text-lg rounded-xl shadow-md">
                Start Route to NGO
              </Button>
            )}

            {pickup.status === 'en_route_to_ngo' && (
              <Button disabled={updating} onClick={() => updateStatus('arrived_at_ngo')} className="w-full py-6 text-lg rounded-xl shadow-md">
                I've Arrived at NGO
              </Button>
            )}

            {pickup.status === 'arrived_at_ngo' && (
              <Button disabled={updating} onClick={() => updateStatus('completed')} className="w-full py-6 text-lg rounded-xl shadow-md bg-emerald-600 hover:bg-emerald-700">
                Confirm Delivery Complete
              </Button>
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
