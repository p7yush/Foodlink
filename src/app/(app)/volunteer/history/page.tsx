"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/providers/AuthProvider"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Clock, CheckCircle2 } from "lucide-react"

export default function PickupHistory() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("pickups")
          .select("*, food_requests(*, food_donations(*, profiles!food_donations_donor_id_fkey(name)), profiles!food_requests_ngo_id_fkey(name))")
          .eq("volunteer_id", user.id)
          .order("assigned_at", { ascending: false })

        if (error) throw error

        if (data) {
          setHistory(data)
        }
      } catch (err) {
        console.error("Error fetching history:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [user])

  if (loading) return <div className="p-8">Loading history...</div>

  if (profile?.role !== "volunteer") {
    return <div className="p-8">Access Denied. Only volunteers can view this page.</div>
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Pickup History</h1>
        <p className="text-muted-foreground text-lg">Your complete log of food rescue operations.</p>
      </div>

      <div className="grid gap-4">
        {history.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-muted/20 rounded-2xl border border-dashed">
            <h3 className="text-xl font-bold">No history yet</h3>
            <p className="text-muted-foreground mt-2">Complete a pickup to see it here.</p>
          </div>
        ) : (
          history.map(pickup => {
            const req = pickup.food_requests
            if (!req) return null
            const donation = req.food_donations
            const ngoName = req.profiles?.name || "Unknown NGO"
            const donorName = donation?.profiles?.name || "Unknown Donor"

            return (
              <Card key={pickup.id} className="rounded-xl border-border/50 shadow-sm overflow-hidden hover:bg-muted/30 transition-colors">
                <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={pickup.status === 'completed' ? 'default' : 'secondary'} className={pickup.status === 'completed' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                        {pickup.status === 'completed' ? (
                          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> COMPLETED</span>
                        ) : (
                          pickup.status.replace(/_/g, ' ').toUpperCase()
                        )}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> 
                        {new Date(pickup.assigned_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold">{donation?.title} <span className="text-muted-foreground font-normal text-base">({donation?.quantity} meals)</span></h3>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{donorName}</span>
                      <span className="text-muted-foreground/50">→</span>
                      <span className="font-medium text-foreground">{ngoName}</span>
                    </div>
                  </div>

                  <div className="md:text-right space-y-1 w-full md:w-auto pt-4 md:pt-0 border-t md:border-0 border-border/50">
                    <p className="text-sm text-muted-foreground flex items-center md:justify-end gap-1">
                      <Clock className="w-3 h-3" /> 
                      Assigned: {new Date(pickup.assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {pickup.completed_at && (
                      <p className="text-sm font-medium text-emerald-600 flex items-center md:justify-end gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 
                        Finished: {new Date(pickup.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>

                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
