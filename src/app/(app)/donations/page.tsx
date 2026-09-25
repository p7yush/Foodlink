"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Search, MapPin, Clock } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/providers/AuthProvider"
import { supabase } from "@/lib/supabase"

type Donation = {
  id: string
  title: string
  description: string | null
  quantity: number
  food_type: string | null
  expiry_time: string | null
  pickup_address: string | null
  status: string | null
  created_at: string
  food_requests?: { status: string, ngo_id: string }[]
}

export default function DonationsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [requestingId, setRequestingId] = useState<string | null>(null)

  const fetchDonations = useCallback(async () => {
    try {
      if (!user || !profile) return
      
      let query = supabase.from("food_donations").select("*, food_requests(status, ngo_id)").order("created_at", { ascending: false })
      
      if (profile.role === "donor") {
        query = query.eq("donor_id", user.id)
      } else {
        // NGOs see all food. We will filter out accepted ones below.
      }
      
      const { data, error } = await query
      if (!error && data) {
        if (profile.role === "ngo") {
          // Filter out donations that are already accepted
          const available = data.filter(d => !d.food_requests?.some((r: { status: string }) => r.status === "accepted"))
          setDonations(available)
        } else {
          setDonations(data)
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [user, profile])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDonations()
  }, [fetchDonations])

  async function handleRequest(foodId: string) {
    setRequestingId(foodId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ food_id: foodId, ngo_id: user?.id })
      })
      const result = await response.json()
      if (result.success) {
        alert("Request sent successfully!")
        fetchDonations() // refresh to show requested status
      } else {
        alert("Error: " + result.error)
      }
    } catch {
      alert("Something went wrong.")
    } finally {
      setRequestingId(null)
    }
  }

  if (authLoading || loading) return <div className="p-8">Loading...</div>
  if (!profile) return <div className="p-8">Please log in.</div>

  const isDonor = profile.role === "donor"

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isDonor ? "My Donations" : "Available Food"}
          </h2>
          <p className="text-muted-foreground">
            {isDonor ? "Manage your surplus food donations." : "Browse and request available surplus food."}
          </p>
        </div>

        {isDonor && (
          <Link href="/donations/new">
            <Button className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              New Donation
            </Button>
          </Link>
        )}
      </div>

      {!isDonor ? (
        // NGO VIEW - CARDS
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {donations.length === 0 ? (
            <div className="col-span-full p-12 text-center border rounded-xl bg-card text-muted-foreground">
              No food available right now. Check back later!
            </div>
          ) : (
            donations.map(donation => {
              const myRequest = donation.food_requests?.find((r) => r.ngo_id === user?.id)
              return (
                <Card key={donation.id} className="flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-all border-border/50">
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                        {donation.food_type || 'Food'}
                      </Badge>
                      {myRequest && <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Requested</Badge>}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg line-clamp-1">{donation.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
                        {donation.description || "No description provided."}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                      <div className="flex flex-col gap-1 p-2 bg-muted/30 rounded-md">
                        <span className="text-xs text-muted-foreground">Quantity</span>
                        <span className="font-semibold">{donation.quantity}</span>
                      </div>
                      <div className="flex flex-col gap-1 p-2 bg-muted/30 rounded-md">
                        <span className="text-xs text-muted-foreground">Expires</span>
                        <span className="font-semibold flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {donation.expiry_time ? new Date(donation.expiry_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{donation.pickup_address}</span>
                    </div>
                  </div>
                  <div className="p-4 border-t bg-muted/10">
                    {myRequest ? (
                      <Button variant="secondary" className="w-full" disabled>Request Pending</Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        onClick={() => handleRequest(donation.id)}
                        disabled={requestingId === donation.id}
                      >
                        {requestingId === donation.id ? "Requesting..." : "Request Food"}
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })
          )}
        </div>
      ) : (
        // DONOR VIEW - TABLE
        <Card className="flex-1 shadow-sm border-border/50 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search donations..." className="pl-8 h-9" />
            </div>
          </div>

          <CardContent className="p-0 overflow-auto flex-1">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="w-[150px]">Donation</TableHead>
                  <TableHead>Food Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {donations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No donations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  donations.map((donation) => {
                    const isAccepted = donation.food_requests?.some((r) => r.status === 'accepted')
                    const isRequested = donation.food_requests?.some((r) => r.status === 'pending')
                    const displayStatus = isAccepted ? 'Accepted' : isRequested ? 'Requested' : 'Available'
                    
                    return (
                      <TableRow key={donation.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-medium text-primary">
                          <Link href={`/donations/${donation.id}`} className="hover:underline">
                            {donation.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{donation.food_type || "Food"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{donation.quantity}</TableCell>
                        <TableCell>
                          {donation.expiry_time ? new Date(donation.expiry_time).toLocaleString() : "Not set"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={displayStatus === 'Available' ? 'outline' : 'default'}>{displayStatus}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}